import type {
  Model,
  ModelRequest,
  ModelResponse,
  ModelRetryAdvice,
  ModelRetryAdviceRequest,
  StreamEvent,
} from '@openai/agents'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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

    for await (const event of this.model.getStreamedResponse(request)) {
      collectToolCallProviderData(event, providerDataByToolCall)

      if (event.type === 'response_done') {
        yield {
          ...event,
          response: attachToolCallProviderData(
            event.response,
            providerDataByToolCall
          ),
        }
      } else {
        yield event
      }
    }
  }
}
