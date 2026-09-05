import type { ChatModelOption, Message } from '@/components/organisms'
import type { AgentMessage } from '@/service/agent'

export const isTextPart = (
  part: unknown
): part is { type: 'text'; text: string } => {
  return (
    !!part &&
    typeof part === 'object' &&
    (part as { type?: string }).type === 'text' &&
    typeof (part as { text?: unknown }).text === 'string'
  )
}

export const isRenderableMessage = <T extends { role: string }>(
  message: T
): message is T & { role: 'user' | 'assistant' } => {
  return message.role === 'user' || message.role === 'assistant'
}

export type ToolCallItem = NonNullable<Message['toolCalls']>[number]
export type ContentPartItem = NonNullable<Message['contentParts']>[number]
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'
export type AgentRunDataPart = {
  type: 'data-agent-run'
  data?: {
    threadId?: string
    runId?: string
    agentId?: string
  }
}
export type ChatUiMessage = {
  id: string
  role: 'user' | 'assistant'
  runId?: string | null
  modelKey?: string | null
  parts?: unknown[]
  content?: string
  isVoiceTranscript?: boolean
}
export type ChatStatus = 'ready' | 'submitted' | 'streaming'
export type RealtimeMicState =
  'idle' | 'connecting' | 'reconnecting' | 'listening' | 'speaking' | 'error'
export type AgentStreamChunk = {
  type?: string
  id?: string
  turnId?: string
  data?: AgentRunDataPart['data']
  delta?: string
  transcript?: string
  toolCallId?: string
  toolName?: string
  input?: unknown
  inputTextDelta?: string
  output?: unknown
  errorText?: string
  error?: unknown
  // plan 模式相关字段
  response_id?: string
  plan_text?: string
  plan_message_id?: string
  plan_summary?: string
  plan_steps?: Array<{ description: string; tool_hint?: string }>
  step_index?: number
  plan_step_status?:
    'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  plan_status?: 'executing' | 'completed' | 'failed'
  plan_step_statuses?: Array<
    'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  >
  note?: string
  // Redis Stream ID（如 "1690000000000-3"），前端只透传不运算
  sequence?: string
  // clarify 模式相关字段
  clarify_message_id?: string
  clarify_question?: string
  clarify_options?: string[]
  approvals?: unknown
  approval?: unknown
  approval_id?: string
  tool_call_id?: string
  tool_name?: string
  arguments?: unknown
  expires_at?: string
}

export type RunStreamEnd = 'terminal' | 'awaiting_approval'
export type RunStreamResult = { end: RunStreamEnd; cursor: string }

export type RealtimeConfig = {
  configured: boolean
  readyForRealConnection?: boolean
  demo: boolean
  mode?: 'demo' | 'real'
  missingEnv?: string[]
  endpoint: string
  model: string
  resourceId: string
  defaultInputMode: string
  defaultAudioFormat: string
}

const THINK_TAG_REGEX = /<think>([\s\S]*?)<\/think>/gi

// 这些工具的产物有专属 UI（如 clarify_question → ClarifyPanel），
// 不应再作为普通 tool card 重复展示
const HIDDEN_TOOL_NAMES = new Set(['clarify_question'])
export const normalizeModelProvider = (
  provider: unknown
): ChatModelOption['provider'] => {
  if (provider === 'seed') return 'seed'
  if (provider === 'bailian') return 'bailian'
  if (provider === 'gcloud') return 'gcloud'
  if (provider === 'openai') return 'openai'
  if (provider === 'shortapi') return 'shortapi'
  return 'deepseek'
}

export const supportsVision = (modelOption: ChatModelOption | undefined) => {
  if (!modelOption) return false
  return !!modelOption.supportVision
}

export const messageToUiMessage = (message: AgentMessage) => {
  const persistedParts = Array.isArray(message.parts) ? message.parts : []

  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    runId: message.run_id,
    modelKey: message.model_key,
    content: message.content,
    isVoiceTranscript: hasLiveTranscriptMarker(persistedParts),
    parts:
      persistedParts.length > 0
        ? persistedParts
        : [{ type: 'text', text: message.content }],
  }
}

export const createTextPart = (text: string) => ({ type: 'text', text })

export const createReasoningPart = (
  text = '',
  state: 'streaming' | 'done' = 'streaming'
) => ({
  type: 'reasoning',
  reasoning: {
    text,
    state,
  },
})

export const createToolPart = (
  toolCallId: string,
  toolName: string,
  state: string,
  input?: unknown,
  output?: unknown,
  errorText?: string
) => ({
  type: 'tool',
  toolCallId,
  toolName,
  state,
  input,
  output,
  errorText,
})

export const createLiveTranscriptMarker = () => ({
  type: 'live-transcript',
})

export const hasLiveTranscriptMarker = (parts: unknown[] | undefined) => {
  if (!Array.isArray(parts)) return false
  return parts.some(
    part =>
      !!part &&
      typeof part === 'object' &&
      (part as { type?: unknown }).type === 'live-transcript'
  )
}

export const getTextFromParts = (parts: unknown[] | undefined) => {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter(isTextPart)
    .map(part => part.text)
    .join('')
}

export const formatElapsedSeconds = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export const getDisplayThreadTitle = (
  title?: string | null,
  voiceLabel: string = 'Voice Chat'
) => {
  const safeTitle = title?.trim()
  if (!safeTitle || isVoicePlaceholder(safeTitle)) {
    return voiceLabel
  }
  return safeTitle
}

export const isVoicePlaceholder = (value?: string | null) => {
  const safeValue = value?.trim()
  return safeValue === '(Voice input)' || safeValue === '（语音输入）'
}

export const getDisplayMessageContent = (
  content: string,
  voiceInputLabel: string = 'Voice Input'
) => {
  if (isVoicePlaceholder(content)) return voiceInputLabel
  return content
}

export const hasTextContent = (parts: unknown[] | undefined) => {
  return getTextFromParts(parts).trim().length > 0
}
