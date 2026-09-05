import type { ChatModelOption, Message } from '@/components/organisms'
import type { AgentMessage, AgentRunApproval } from '@/service/agent'

export type ToolCallItem = NonNullable<Message['toolCalls']>[number]
export type ContentPartItem = NonNullable<Message['contentParts']>[number]
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

export type AgentRunDataPart = {
  type: 'data-agent-run'
  data?: { threadId?: string; runId?: string; agentId?: string }
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
  sequence?: string
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

export type NormalizedUiMessage = ReturnType<typeof messageToUiMessage>

export const messageToUiMessage = (message: AgentMessage) => ({
  id: message.id,
  role:
    message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
  runId: message.run_id,
  modelKey: message.model_key,
  content: message.content,
  isVoiceTranscript: hasLiveTranscriptMarker(
    Array.isArray(message.parts) ? message.parts : undefined
  ),
  parts:
    Array.isArray(message.parts) && message.parts.length > 0
      ? message.parts
      : [{ type: 'text', text: message.content }],
})

export const isTextPart = (
  part: unknown
): part is { type: 'text'; text: string } =>
  !!part &&
  typeof part === 'object' &&
  (part as { type?: string }).type === 'text' &&
  typeof (part as { text?: unknown }).text === 'string'

export const isRenderableMessage = <T extends { role: string }>(
  message: T
): message is T & { role: 'user' | 'assistant' } =>
  message.role === 'user' || message.role === 'assistant'

export const createTextPart = (text: string) => ({
  type: 'text' as const,
  text,
})
export const createReasoningPart = (
  text = '',
  state: 'streaming' | 'done' = 'streaming'
) => ({ type: 'reasoning' as const, reasoning: { text, state } })
export const createToolPart = (
  toolCallId: string,
  toolName: string,
  state: string,
  input?: unknown,
  output?: unknown,
  errorText?: string
) => ({
  type: 'tool' as const,
  toolCallId,
  toolName,
  state,
  input,
  output,
  errorText,
})
export const createLiveTranscriptMarker = () => ({
  type: 'live-transcript' as const,
})

export const hasLiveTranscriptMarker = (parts: unknown[] | undefined) =>
  Array.isArray(parts) &&
  parts.some(
    part =>
      !!part &&
      typeof part === 'object' &&
      (part as { type?: unknown }).type === 'live-transcript'
  )

export const getTextFromParts = (parts: unknown[] | undefined) =>
  Array.isArray(parts)
    ? parts
        .filter(isTextPart)
        .map(part => part.text)
        .join('')
    : ''

export const hasTextContent = (parts: unknown[] | undefined) =>
  getTextFromParts(parts).trim().length > 0

export const isVoicePlaceholder = (value?: string | null) => {
  const safeValue = value?.trim()
  return safeValue === '(Voice input)' || safeValue === '（语音输入）'
}

export const getDisplayThreadTitle = (
  title?: string | null,
  voiceLabel = 'Voice Chat'
) => {
  const safeTitle = title?.trim()
  return !safeTitle || isVoicePlaceholder(safeTitle) ? voiceLabel : safeTitle
}

export const getDisplayMessageContent = (
  content: string,
  voiceInputLabel = 'Voice Input'
) => (isVoicePlaceholder(content) ? voiceInputLabel : content)

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

export const supportsVision = (modelOption: ChatModelOption | undefined) =>
  !!modelOption?.supportVision

export const formatElapsedSeconds = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(
    safeSeconds % 60
  ).padStart(2, '0')}`
}

export type { AgentRunApproval }
