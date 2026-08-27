const DEFAULT_MAX_INPUT_BYTES = 512 * 1024
const DEFAULT_MAX_OUTPUT_CHARACTERS = 256 * 1024
const DEFAULT_MAX_TOOL_CALLS = 64
const DEFAULT_MAX_OUTPUT_TOKENS = 16_384
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000

export interface RunBudgetLimits {
  maxInputBytes: number
  maxOutputCharacters: number
  maxToolCalls: number
  maxOutputTokens: number
  timeoutMs: number
  maxEstimatedCostUsd: number | null
}

export interface ModelPricing {
  inputUsdPerMillionTokens: number
  outputUsdPerMillionTokens: number
}

export type ModelPricingMap = Record<string, ModelPricing>

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isSafeInteger(parsed)) return fallback
  return Math.max(minimum, Math.min(parsed, maximum))
}

export function loadRunBudgetLimits(
  env: Record<string, string | undefined> = process.env
): RunBudgetLimits {
  const rawCost = Number(env.AGENT_RUN_MAX_ESTIMATED_COST_USD || '')
  return {
    maxInputBytes: boundedInteger(
      env.AGENT_RUN_MAX_INPUT_BYTES,
      DEFAULT_MAX_INPUT_BYTES,
      16 * 1024,
      16 * 1024 * 1024
    ),
    maxOutputCharacters: boundedInteger(
      env.AGENT_RUN_MAX_OUTPUT_CHARACTERS,
      DEFAULT_MAX_OUTPUT_CHARACTERS,
      1_024,
      4 * 1024 * 1024
    ),
    maxToolCalls: boundedInteger(
      env.AGENT_RUN_MAX_TOOL_CALLS,
      DEFAULT_MAX_TOOL_CALLS,
      1,
      512
    ),
    maxOutputTokens: boundedInteger(
      env.AGENT_RUN_MAX_OUTPUT_TOKENS,
      DEFAULT_MAX_OUTPUT_TOKENS,
      256,
      131_072
    ),
    timeoutMs: boundedInteger(
      env.AGENT_RUN_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      5_000,
      60 * 60 * 1000
    ),
    maxEstimatedCostUsd:
      Number.isFinite(rawCost) && rawCost > 0 ? rawCost : null,
  }
}

export function parseModelPricing(raw: string | undefined): ModelPricingMap {
  if (!raw?.trim()) return {}
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AGENT_MODEL_PRICING_JSON must be an object')
  }

  const pricing: ModelPricingMap = {}
  for (const [modelKey, value] of Object.entries(parsed)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Invalid pricing entry for model ${modelKey}`)
    }
    const entry = value as Record<string, unknown>
    const input = Number(
      entry.inputUsdPerMillionTokens ?? entry.input_usd_per_million_tokens
    )
    const output = Number(
      entry.outputUsdPerMillionTokens ?? entry.output_usd_per_million_tokens
    )
    if (
      !Number.isFinite(input) ||
      input < 0 ||
      !Number.isFinite(output) ||
      output < 0
    ) {
      throw new Error(`Invalid pricing entry for model ${modelKey}`)
    }
    pricing[modelKey] = {
      inputUsdPerMillionTokens: input,
      outputUsdPerMillionTokens: output,
    }
  }
  return pricing
}

export function estimateTokenUpperBound(value: unknown) {
  let serialized: string
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    throw new RunBudgetExceededError(
      'input_serialization',
      'Run input could not be measured safely'
    )
  }
  // UTF-8 bytes are a deliberately conservative tokenizer-independent upper
  // bound for the providers supported by Telos.
  return Buffer.byteLength(serialized || '', 'utf8')
}

export function assertEstimatedCostBudget(options: {
  modelKey: string
  input: unknown
  limits: RunBudgetLimits
  pricing: ModelPricingMap
}) {
  const cap = options.limits.maxEstimatedCostUsd
  if (cap === null) return null
  const modelPricing = options.pricing[options.modelKey]
  if (!modelPricing) {
    throw new RunBudgetExceededError(
      'pricing_missing',
      `No server-side pricing is configured for model ${options.modelKey}`
    )
  }
  const inputTokens = estimateTokenUpperBound(options.input)
  const estimatedCostUsd =
    (inputTokens * modelPricing.inputUsdPerMillionTokens +
      options.limits.maxOutputTokens * modelPricing.outputUsdPerMillionTokens) /
    1_000_000
  if (estimatedCostUsd > cap) {
    throw new RunBudgetExceededError(
      'estimated_cost',
      `Estimated worst-case run cost exceeds the server limit (${estimatedCostUsd.toFixed(4)} USD > ${cap.toFixed(4)} USD)`
    )
  }
  return estimatedCostUsd
}

export function calculateUsageCost(options: {
  modelKey: string
  inputTokens: number
  outputTokens: number
  pricing: ModelPricingMap
}) {
  const modelPricing = options.pricing[options.modelKey]
  if (!modelPricing) return null
  return (
    (Math.max(0, options.inputTokens) * modelPricing.inputUsdPerMillionTokens +
      Math.max(0, options.outputTokens) *
        modelPricing.outputUsdPerMillionTokens) /
    1_000_000
  )
}

export class RunBudgetExceededError extends Error {
  constructor(
    readonly budget: string,
    message: string
  ) {
    super(message)
    this.name = 'RunBudgetExceededError'
  }
}

export class RunBudgetTracker {
  readonly signal: AbortSignal
  private readonly controller = new AbortController()
  private readonly timer: ReturnType<typeof setTimeout>
  private readonly parentSignal?: AbortSignal
  private toolCalls = 0
  private outputCharacters = 0
  private budgetError: RunBudgetExceededError | null = null

  constructor(
    readonly limits: RunBudgetLimits,
    parentSignal?: AbortSignal
  ) {
    this.signal = this.controller.signal
    this.parentSignal = parentSignal
    if (parentSignal?.aborted) {
      this.controller.abort(parentSignal.reason)
    } else {
      parentSignal?.addEventListener('abort', this.abortFromParent, {
        once: true,
      })
    }
    this.timer = setTimeout(() => {
      this.abortForBudget(
        new RunBudgetExceededError(
          'wall_clock',
          `Agent run exceeded the ${limits.timeoutMs}ms wall-clock limit`
        )
      )
    }, limits.timeoutMs)
    this.timer.unref?.()
  }

  private readonly abortFromParent = () => {
    this.controller.abort(this.parentSignal?.reason)
  }

  private abortForBudget(error: RunBudgetExceededError) {
    if (!this.budgetError) this.budgetError = error
    if (!this.controller.signal.aborted) this.controller.abort(error)
  }

  assertInput(value: unknown) {
    const inputBytes = estimateTokenUpperBound(value)
    if (inputBytes > this.limits.maxInputBytes) {
      const error = new RunBudgetExceededError(
        'input_bytes',
        `Agent context exceeds the ${this.limits.maxInputBytes}-byte server limit`
      )
      this.abortForBudget(error)
      throw error
    }
    return inputBytes
  }

  recordToolCall(count = 1) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(
        'Tool call budget increment must be a non-negative integer'
      )
    }
    this.toolCalls += count
    if (this.toolCalls > this.limits.maxToolCalls) {
      const error = new RunBudgetExceededError(
        'tool_calls',
        `Agent run exceeded the ${this.limits.maxToolCalls}-tool-call server limit`
      )
      this.abortForBudget(error)
      throw error
    }
  }

  recordOutput(delta: string) {
    this.outputCharacters += delta.length
    if (this.outputCharacters > this.limits.maxOutputCharacters) {
      const error = new RunBudgetExceededError(
        'output_characters',
        `Agent output exceeds the ${this.limits.maxOutputCharacters}-character server limit`
      )
      this.abortForBudget(error)
      throw error
    }
  }

  normalizeError(error: unknown) {
    return this.budgetError ?? error
  }

  get exceeded() {
    return this.budgetError !== null
  }

  dispose() {
    clearTimeout(this.timer)
    this.parentSignal?.removeEventListener('abort', this.abortFromParent)
  }
}
