import { safeJsonStringify } from '../utils/json.js'

/**
 * AG-UI 协议事件翻译层：把 run Redis 流里的内部事件机械翻译为
 * AG-UI 标准事件类型（https://docs.ag-ui.com），供标准 AG-UI 客户端
 * 直接消费 Telos 运行。纯函数，无 IO。
 *
 * 无法映射的事件（追踪类、计划/审批/澄清等 Telos 专属）折叠为 CUSTOM，
 * 原 payload 挂在 value 下，保证信息不丢。
 */

export interface AguiEvent {
  type: string
  [key: string]: unknown
}

type InternalEvent = Record<string, unknown>

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function translateRunEventToAgui(
  event: InternalEvent
): AguiEvent | null {
  const type = str(event.type)
  switch (type) {
    case 'agent.run.created':
    case 'agent.run.resumed': {
      const data = (event.data ?? {}) as Record<string, unknown>
      return {
        type: 'RUN_STARTED',
        threadId: str(data.threadId),
        runId: str(data.runId) || str(data.threadId),
        sequence: event.sequence,
      }
    }
    case 'response.output_text.start':
      return {
        type: 'TEXT_MESSAGE_START',
        role: 'assistant',
        messageId: str(event.id),
        sequence: event.sequence,
      }
    case 'response.output_text.delta':
      return {
        type: 'TEXT_MESSAGE_CONTENT',
        messageId: str(event.id),
        delta: str(event.delta),
        sequence: event.sequence,
      }
    case 'response.output_text.done':
      return {
        type: 'TEXT_MESSAGE_END',
        messageId: str(event.id),
        sequence: event.sequence,
      }
    case 'response.reasoning.delta':
      return {
        type: 'THINKING_TEXT_MESSAGE_CONTENT',
        id: str(event.id),
        delta: str(event.delta),
        sequence: event.sequence,
      }
    case 'response.reasoning.done':
      return {
        type: 'THINKING_END',
        id: str(event.id),
        sequence: event.sequence,
      }
    case 'response.output_item.added':
      return {
        type: 'TOOL_CALL_START',
        toolCallId: str(event.toolCallId) || str(event.item_id),
        toolCallName: str(event.toolName),
        sequence: event.sequence,
      }
    case 'response.function_call_arguments.delta':
      return {
        type: 'TOOL_CALL_ARGS',
        toolCallId: str(event.toolCallId) || str(event.item_id),
        delta: str(event.delta) || str(event.inputTextDelta),
        sequence: event.sequence,
      }
    case 'response.function_call_arguments.done':
      return {
        type: 'TOOL_CALL_END',
        toolCallId: str(event.toolCallId) || str(event.item_id),
        sequence: event.sequence,
      }
    case 'response.completed':
      return {
        type: 'RUN_FINISHED',
        runId: str(event.response_id),
        sequence: event.sequence,
      }
    case 'response.failed':
      return {
        type: 'RUN_ERROR',
        runId: str(event.response_id),
        message:
          typeof event.error === 'string'
            ? event.error
            : safeJsonStringify(event.error ?? 'run failed'),
        sequence: event.sequence,
      }
    default: {
      // Telos 专属事件（工具结果/计划/审批/澄清/追踪）折叠为 CUSTOM
      if (!type || type === 'ping') return null
      const { type: _type, sequence, ...value } = event
      return {
        type: 'CUSTOM',
        name: type,
        value,
        sequence,
      }
    }
  }
}

/** AG-UI 流的终态事件类型（与内部 terminal 集合对应） */
export function isAguiTerminalEvent(type: string): boolean {
  return type === 'RUN_FINISHED' || type === 'RUN_ERROR'
}
