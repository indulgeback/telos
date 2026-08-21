import type {
  AgentInputItem,
  AgentOutputItem,
  Model,
  ModelRequest,
  ModelResponse,
  ModelRetryAdvice,
  ModelRetryAdviceRequest,
  StreamEvent,
} from '@openai/agents'

interface DeepSeekMessage {
  role: 'assistant'
  content: string | null
  reasoning_content: string
  tool_calls: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function reasoningText(item: AgentInputItem | AgentOutputItem): string {
  if (item.type !== 'reasoning' || !Array.isArray(item.rawContent)) return ''

  return item.rawContent
    .map(content => {
      if (!isRecord(content)) return ''
      return typeof content.text === 'string' ? content.text : ''
    })
    .join('')
}

function assistantText(item: AgentInputItem): string {
  if (item.type !== 'message' || item.role !== 'assistant') return ''
  if (!Array.isArray(item.content)) return ''

  return item.content
    .map(content => {
      return 'text' in content && typeof content.text === 'string'
        ? content.text
        : ''
    })
    .join('')
}

function toDeepSeekToolCall(item: AgentInputItem) {
  if (item.type !== 'function_call') return null

  return {
    id: item.callId,
    type: 'function' as const,
    function: {
      name: item.name,
      arguments: item.arguments || '{}',
    },
  }
}

/**
 * DeepSeek requires the reasoning text from a tool-calling assistant message to
 * be replayed as `reasoning_content` on the very same message. The OpenAI
 * Agents SDK currently serializes its generic reasoning item as `reasoning`
 * and can split assistant text and tool calls into separate messages.
 *
 * Rebuild that output group as one provider-native message before the next
 * model turn. Unknown items are intentionally passed through verbatim by the
 * SDK's Chat Completions converter.
 */
export function normalizeDeepSeekReasoningInput(
  input: ModelRequest['input']
): ModelRequest['input'] {
  if (typeof input === 'string') return input

  const normalized: AgentInputItem[] = []

  for (let index = 0; index < input.length; index += 1) {
    const item = input[index]
    const reasoning = reasoningText(item)
    if (!reasoning) {
      normalized.push(item)
      continue
    }

    let cursor = index + 1
    let content = ''
    const toolCalls: DeepSeekMessage['tool_calls'] = []

    while (cursor < input.length) {
      const candidate = input[cursor]
      const text = assistantText(candidate)
      if (
        text ||
        (candidate.type === 'message' && candidate.role === 'assistant')
      ) {
        content += text
        cursor += 1
        continue
      }

      const toolCall = toDeepSeekToolCall(candidate)
      if (toolCall) {
        toolCalls.push(toolCall)
        cursor += 1
        continue
      }
      break
    }

    if (toolCalls.length === 0) {
      normalized.push(item)
      continue
    }

    const message: DeepSeekMessage = {
      role: 'assistant',
      content: content || null,
      reasoning_content: reasoning,
      tool_calls: toolCalls,
    }
    normalized.push({ type: 'unknown', providerData: message })
    index = cursor - 1
  }

  return normalized
}

function extractDeepSeekReasoning(payload: unknown): string {
  if (!isRecord(payload)) return ''
  const choices = payload.choices
  if (!Array.isArray(choices)) return ''

  return choices
    .map(choice => {
      if (!isRecord(choice)) return ''
      const delta = isRecord(choice.delta) ? choice.delta : undefined
      const message = isRecord(choice.message) ? choice.message : undefined
      const value = delta?.reasoning_content ?? message?.reasoning_content
      return typeof value === 'string' ? value : ''
    })
    .join('')
}

function hasReasoningOutput(output: readonly AgentOutputItem[]) {
  return output.some(item => item.type === 'reasoning')
}

function addReasoningOutput<T extends { output: AgentOutputItem[] }>(
  response: T,
  reasoning: string
): T {
  if (!reasoning || hasReasoningOutput(response.output)) return response

  return {
    ...response,
    output: [
      {
        type: 'reasoning',
        content: [],
        rawContent: [{ type: 'reasoning_text', text: reasoning }],
      },
      ...response.output,
    ],
  } as T
}

function normalizedRequest(request: ModelRequest): ModelRequest {
  return {
    ...request,
    input: normalizeDeepSeekReasoningInput(request.input),
  }
}

/** Compatibility wrapper for DeepSeek's `reasoning_content` extension. */
export class DeepSeekReasoningModel implements Model {
  constructor(private readonly model: Model) {}

  getRetryAdvice(
    args: ModelRetryAdviceRequest
  ): Promise<ModelRetryAdvice | undefined> | ModelRetryAdvice | undefined {
    return this.model.getRetryAdvice?.(args)
  }

  async getResponse(request: ModelRequest): Promise<ModelResponse> {
    const response = await this.model.getResponse(normalizedRequest(request))
    return addReasoningOutput(
      response,
      extractDeepSeekReasoning(response.providerData)
    )
  }

  async *getStreamedResponse(
    request: ModelRequest
  ): AsyncIterable<StreamEvent> {
    let reasoning = ''

    for await (const event of this.model.getStreamedResponse(
      normalizedRequest(request)
    )) {
      if (event.type === 'model') {
        reasoning += extractDeepSeekReasoning(event.event)
      }

      if (event.type === 'response_done' && reasoning) {
        yield {
          ...event,
          response: addReasoningOutput(event.response, reasoning),
        }
        continue
      }

      yield event
    }
  }
}
