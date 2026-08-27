import type {
  AgentInputItem,
  Model,
  ModelRequest,
  ModelResponse,
  ModelRetryAdvice,
  ModelRetryAdviceRequest,
  StreamEvent,
} from '@openai/agents'

/**
 * Vertex's OpenAI-compatible endpoint wraps visible Gemini thoughts in tags
 * when this marker is configured. Keep it provider-specific so ordinary user
 * text containing <think> is never mistaken for a reasoning part.
 */
export const GEMINI_THOUGHT_TAG_MARKER = 'telos_gemini_thought'
export const GEMINI_THOUGHT_SIGNATURE_METADATA_KEY = 'geminiThoughtSignature'
const GEMINI_HISTORY_SIGNATURE_PROVIDER_KEY = 'telosGeminiThoughtSignature'
const MAX_GEMINI_THOUGHT_SIGNATURE_LENGTH = 128 * 1024

export interface GeminiThoughtStreamChunk {
  reasoning: string
  text: string
}

function suffixPrefixLength(value: string, prefix: string) {
  const max = Math.min(value.length, prefix.length - 1)
  for (let length = max; length > 0; length -= 1) {
    if (
      value.slice(-length).toLowerCase() ===
      prefix.slice(0, length).toLowerCase()
    ) {
      return length
    }
  }
  return 0
}

/**
 * Parse provider thought tags without assuming that a tag arrives in one
 * stream chunk. The parser intentionally buffers only a possible tag prefix;
 * ordinary content is emitted immediately.
 */
export class GeminiThoughtStreamParser {
  private readonly openTag: string
  private readonly closeTag: string
  private inThought = false
  private pending = ''

  constructor(marker = GEMINI_THOUGHT_TAG_MARKER) {
    this.openTag = `<${marker}>`
    this.closeTag = `</${marker}>`
  }

  push(value: string): GeminiThoughtStreamChunk {
    if (!value) return { reasoning: '', text: '' }
    this.pending += value
    let reasoning = ''
    let text = ''

    while (this.pending) {
      const tag = this.inThought ? this.closeTag : this.openTag
      const index = this.pending.toLowerCase().indexOf(tag.toLowerCase())
      if (index >= 0) {
        const before = this.pending.slice(0, index)
        if (this.inThought) reasoning += before
        else text += before
        this.pending = this.pending.slice(index + tag.length)
        this.inThought = !this.inThought
        continue
      }

      const keep = suffixPrefixLength(this.pending, tag)
      const complete = this.pending.length - keep
      if (complete > 0) {
        const emitted = this.pending.slice(0, complete)
        if (this.inThought) reasoning += emitted
        else text += emitted
        this.pending = this.pending.slice(complete)
      }
      break
    }

    return { reasoning, text }
  }

  finish(): GeminiThoughtStreamChunk {
    const result = this.inThought
      ? { reasoning: this.pending, text: '' }
      : { reasoning: '', text: this.pending }
    this.pending = ''
    this.inThought = false
    return result
  }
}

export function stripGeminiThoughtTags(value: string) {
  const parser = new GeminiThoughtStreamParser()
  const parsed = parser.push(value)
  const tail = parser.finish()
  return parsed.text + tail.text
}

export function buildGeminiProviderData(
  reasoningEffort: string | null | undefined
) {
  const effort = reasoningEffort ?? 'medium'
  if (effort === 'minimal') return {}

  // Vertex rejects requests that combine reasoning_effort with Google's
  // thinking_config. thinking_level is the Gemini equivalent of the effort
  // setting and include_thoughts asks the endpoint to return tagged summaries.
  return {
    extra_body: {
      google: {
        thinking_config: {
          thinking_level: effort,
          include_thoughts: true,
        },
        thought_tag_marker: GEMINI_THOUGHT_TAG_MARKER,
      },
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeGeminiThoughtSignature(value: unknown) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_GEMINI_THOUGHT_SIGNATURE_LENGTH
    ? value
    : null
}

export function buildPersistedGeminiSignatureProviderData(value: unknown) {
  const signature = normalizeGeminiThoughtSignature(value)
  return signature
    ? { [GEMINI_HISTORY_SIGNATURE_PROVIDER_KEY]: signature }
    : undefined
}

/**
 * Session history is model-agnostic, so persisted signatures first travel in
 * a Telos-only provider-data field. Resolve that field only after runtime has
 * selected gcloud; other providers receive the original plain message.
 */
export function prepareGeminiSignatureHistory(
  input: string | AgentInputItem[],
  enabled: boolean
): string | AgentInputItem[] {
  if (typeof input === 'string') return input

  return input.map(item => {
    if (
      !isRecord(item) ||
      item.type !== 'message' ||
      item.role !== 'assistant' ||
      !isRecord(item.providerData) ||
      !(GEMINI_HISTORY_SIGNATURE_PROVIDER_KEY in item.providerData)
    ) {
      return item
    }

    const signature = normalizeGeminiThoughtSignature(
      item.providerData[GEMINI_HISTORY_SIGNATURE_PROVIDER_KEY]
    )
    const { [GEMINI_HISTORY_SIGNATURE_PROVIDER_KEY]: _, ...providerData } =
      item.providerData
    const { providerData: _originalProviderData, ...message } = item

    if (!enabled || !signature) {
      return {
        ...message,
        ...(Object.keys(providerData).length > 0 ? { providerData } : {}),
      } as AgentInputItem
    }

    const content = Array.isArray(item.content)
      ? item.content
      : [{ type: 'output_text' as const, text: String(item.content ?? '') }]
    return {
      ...message,
      content: [
        ...content,
        {
          type: 'output_text' as const,
          text: '',
          providerData: {
            extra_content: { google: { thought_signature: signature } },
          },
        },
      ],
      ...(Object.keys(providerData).length > 0 ? { providerData } : {}),
    } as AgentInputItem
  })
}

/** Extract the final text-part signature from a direct or Runner-wrapped event. */
export function extractGeminiThoughtSignatureFromStreamEvent(event: unknown) {
  if (!isRecord(event)) return null
  const modelEvent =
    event.type === 'raw_model_stream_event' && isRecord(event.data)
      ? event.data
      : event
  if (modelEvent.type !== 'response_done' || !isRecord(modelEvent.response)) {
    return null
  }

  const output = modelEvent.response.output
  if (!Array.isArray(output)) return null
  for (
    let outputIndex = output.length - 1;
    outputIndex >= 0;
    outputIndex -= 1
  ) {
    const item = output[outputIndex]
    if (!isRecord(item) || !Array.isArray(item.content)) continue
    for (
      let partIndex = item.content.length - 1;
      partIndex >= 0;
      partIndex -= 1
    ) {
      const part = item.content[partIndex]
      if (!isRecord(part) || !isRecord(part.providerData)) continue
      const extraContent = part.providerData.extra_content
      const google = isRecord(extraContent) ? extraContent.google : null
      const signature = isRecord(google)
        ? normalizeGeminiThoughtSignature(google.thought_signature)
        : null
      if (signature) return signature
    }
  }
  return null
}

function mergeProviderData(
  current: Record<string, unknown>,
  next: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...current }
  for (const [key, value] of Object.entries(next)) {
    const existing = merged[key]
    if (isRecord(existing) && isRecord(value)) {
      merged[key] = mergeProviderData(existing, value)
    } else {
      merged[key] = value
    }
  }
  return merged
}

/**
 * Chat Completions streaming responses expose Gemini metadata on each raw
 * tool-call delta. Agents SDK 0.17 currently drops that metadata while
 * reducing deltas to a generic function_call item. Keep the provider data on
 * the final item so the SDK's normal history converter can replay it.
 */
function providerDataFromToolCall(value: unknown) {
  if (!isRecord(value)) return null

  const providerData: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (
      key !== 'index' &&
      key !== 'id' &&
      key !== 'type' &&
      key !== 'function'
    ) {
      providerData[key] = child
    }
  }

  const functionData = value.function
  if (isRecord(functionData)) {
    for (const [key, child] of Object.entries(functionData)) {
      if (
        key !== 'name' &&
        key !== 'arguments' &&
        providerData[key] === undefined
      ) {
        providerData[key] = child
      }
    }
  }

  return Object.keys(providerData).length > 0 ? providerData : null
}

function collectToolCallProviderData(
  event: unknown,
  target: Map<number, Record<string, unknown>>
) {
  if (!isRecord(event) || event.type !== 'model' || !isRecord(event.event)) {
    return
  }

  const payload = event.event
  const choices = payload.choices
  if (!Array.isArray(choices)) return

  for (const choice of choices) {
    if (!isRecord(choice) || !isRecord(choice.delta)) continue
    const toolCalls = choice.delta.tool_calls
    if (!Array.isArray(toolCalls)) continue

    for (const toolCall of toolCalls) {
      if (!isRecord(toolCall) || typeof toolCall.index !== 'number') continue
      const providerData = providerDataFromToolCall(toolCall)
      if (!providerData) continue
      target.set(
        toolCall.index,
        mergeProviderData(target.get(toolCall.index) ?? {}, providerData)
      )
    }
  }
}

interface MessageProviderDataDelta {
  providerData: Record<string, unknown>
  signatureOnEmptyContent: boolean
}

/**
 * Gemini can attach a thought signature to the final (often empty) text part
 * of an ordinary assistant response. The Agents SDK currently omits delta
 * metadata when it reduces Chat Completions chunks to an output_text item, so
 * capture it here and restore the part boundary on response_done.
 */
function messageProviderDataFromEvent(
  event: unknown
): MessageProviderDataDelta | null {
  if (!isRecord(event) || event.type !== 'model' || !isRecord(event.event)) {
    return null
  }

  const choices = event.event.choices
  if (!Array.isArray(choices)) return null

  let providerData: Record<string, unknown> = {}
  let signatureOnEmptyContent = false

  for (const choice of choices) {
    if (!isRecord(choice) || !isRecord(choice.delta)) continue
    const extraContent = choice.delta.extra_content
    if (!isRecord(extraContent)) continue

    providerData = mergeProviderData(providerData, {
      extra_content: extraContent,
    })

    const google = extraContent.google
    if (
      isRecord(google) &&
      google.thought_signature !== undefined &&
      (choice.delta.content === '' || choice.delta.content === undefined)
    ) {
      signatureOnEmptyContent = true
    }
  }

  return Object.keys(providerData).length > 0
    ? { providerData, signatureOnEmptyContent }
    : null
}

function attachToolCallProviderData<T extends { output: readonly unknown[] }>(
  response: T,
  byIndex: Map<number, Record<string, unknown>>
): T {
  if (byIndex.size === 0) return response

  let toolCallIndex = 0
  const output = response.output.map(item => {
    if (!isRecord(item) || item.type !== 'function_call') return item

    const providerData = byIndex.get(toolCallIndex)
    toolCallIndex += 1
    if (!providerData) return item

    const existingProviderData = isRecord(item.providerData)
      ? item.providerData
      : {}
    return {
      ...item,
      providerData: mergeProviderData(existingProviderData, providerData),
    }
  })

  return { ...response, output } as T
}

function attachMessageProviderData<T extends { output: readonly unknown[] }>(
  response: T,
  providerData: Record<string, unknown>,
  signatureOnEmptyContent: boolean
): T {
  if (Object.keys(providerData).length === 0) return response

  const output = [...response.output]
  let messageIndex = -1
  for (let index = output.length - 1; index >= 0; index -= 1) {
    const item = output[index]
    if (
      isRecord(item) &&
      item.type === 'message' &&
      item.role === 'assistant' &&
      Array.isArray(item.content)
    ) {
      messageIndex = index
      break
    }
  }
  if (messageIndex < 0) return response

  const message = output[messageIndex] as Record<string, unknown>
  const content = message.content as unknown[]
  if (signatureOnEmptyContent) {
    output[messageIndex] = {
      ...message,
      content: [...content, { type: 'output_text', text: '', providerData }],
    }
    return { ...response, output } as T
  }

  let textIndex = -1
  for (let index = content.length - 1; index >= 0; index -= 1) {
    const item = content[index]
    if (isRecord(item) && item.type === 'output_text') {
      textIndex = index
      break
    }
  }
  if (textIndex < 0) return response

  const textPart = content[textIndex] as Record<string, unknown>
  const existingProviderData = isRecord(textPart.providerData)
    ? textPart.providerData
    : {}
  const nextContent = [...content]
  nextContent[textIndex] = {
    ...textPart,
    providerData: mergeProviderData(existingProviderData, providerData),
  }
  output[messageIndex] = { ...message, content: nextContent }
  return { ...response, output } as T
}

/** Compatibility wrapper for Gemini thought signatures in streamed calls. */
export class GeminiThoughtSignatureModel implements Model {
  constructor(private readonly model: Model) {}

  getRetryAdvice(
    args: ModelRetryAdviceRequest
  ): Promise<ModelRetryAdvice | undefined> | ModelRetryAdvice | undefined {
    return this.model.getRetryAdvice?.(args)
  }

  getResponse(request: ModelRequest): Promise<ModelResponse> {
    return this.model.getResponse(request)
  }

  async *getStreamedResponse(
    request: ModelRequest
  ): AsyncIterable<StreamEvent> {
    const providerDataByToolCall = new Map<number, Record<string, unknown>>()
    let messageProviderData: Record<string, unknown> = {}
    let signatureOnEmptyContent = false

    for await (const event of this.model.getStreamedResponse(request)) {
      collectToolCallProviderData(event, providerDataByToolCall)
      const messageDelta = messageProviderDataFromEvent(event)
      if (messageDelta) {
        messageProviderData = mergeProviderData(
          messageProviderData,
          messageDelta.providerData
        )
        signatureOnEmptyContent ||= messageDelta.signatureOnEmptyContent
      }

      if (event.type === 'response_done') {
        const withToolData = attachToolCallProviderData(
          event.response,
          providerDataByToolCall
        )
        yield {
          ...event,
          response: attachMessageProviderData(
            withToolData,
            messageProviderData,
            signatureOnEmptyContent
          ),
        }
      } else {
        yield event
      }
    }
  }
}
