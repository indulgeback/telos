import type { AgentRunApproval } from '@/service/agent'
import type {
  AgentStreamChunk,
  ContentPartItem,
  ToolCallItem,
} from './chat-types'
import { isTextPart } from './chat-types'

const THINK_TAG_REGEX = /<think>([\s\S]*?)<\/think>/gi
const HIDDEN_TOOL_NAMES = new Set(['clarify_question'])

export const parseUiMessageStreamChunk = (
  raw: string
): AgentStreamChunk | null => {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '[DONE]') return null
  try {
    return JSON.parse(trimmed) as AgentStreamChunk
  } catch {
    return null
  }
}

export const normalizeRunApproval = (raw: unknown): AgentRunApproval | null => {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const id = typeof value.id === 'string' ? value.id : ''
  const toolCallId =
    typeof value.tool_call_id === 'string' ? value.tool_call_id : ''
  const toolName = typeof value.tool_name === 'string' ? value.tool_name : ''
  const expiresAt = typeof value.expires_at === 'string' ? value.expires_at : ''
  if (!id || !toolCallId || !toolName || !expiresAt) return null
  return {
    id,
    tool_call_id: toolCallId,
    tool_name: toolName,
    arguments: value.arguments,
    expires_at: expiresAt,
    status:
      value.status === 'approved' ||
      value.status === 'denied' ||
      value.status === 'expired' ||
      value.status === 'consumed'
        ? value.status
        : 'pending',
    decided_at: typeof value.decided_at === 'string' ? value.decided_at : null,
  }
}

export const extractRunApprovals = (
  chunk: AgentStreamChunk
): AgentRunApproval[] => {
  const rawApprovals = Array.isArray(chunk.approvals)
    ? chunk.approvals
    : chunk.approvals
      ? [chunk.approvals]
      : chunk.approval
        ? [chunk.approval]
        : chunk.approval_id &&
            chunk.tool_call_id &&
            (chunk.tool_name || chunk.toolName)
          ? [
              {
                id: chunk.approval_id,
                tool_call_id: chunk.tool_call_id,
                tool_name: chunk.tool_name || chunk.toolName,
                arguments: chunk.arguments ?? chunk.input,
                expires_at: chunk.expires_at,
              },
            ]
          : []
  return rawApprovals
    .map(normalizeRunApproval)
    .filter((approval): approval is AgentRunApproval => approval !== null)
}

export const formatApprovalArguments = (value: unknown) => {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) || ''
  return text.length > 8_000 ? `${text.slice(0, 8_000)}\n…` : text
}

export const formatApprovalExpiry = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const waitForRunStreamRetry = (delayMs: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    signal.addEventListener('abort', onAbort, { once: true })
  })

export const parseClientPlanSteps = (planText: string): string[] => {
  if (!planText || !planText.trim()) return []
  const lines = planText.split('\n')
  const steps: string[] = []
  const stepPattern = /^\s*(?:\d+[.)、]|[-*•])\s*(.+)$/

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (
      steps.length > 0 &&
      /^#{1,6}\s*(预期结果|需要澄清|说明|备注)/i.test(line)
    ) {
      break
    }
    const match = line.match(stepPattern)
    if (match) {
      const step = match[1].trim()
      if (step) steps.push(step)
    }
  }

  if (steps.length === 0) {
    const fallback = planText.replace(/^#{1,6}\s.*$/gm, '').trim()
    return fallback ? [fallback] : []
  }
  return steps
}

export const stringifyPartValue = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

export const mapToolState = (state: unknown): ToolCallItem['state'] => {
  if (state === 'output-available') return 'success'
  if (state === 'output-error' || state === 'output-denied') return 'error'
  return 'running'
}

export const parseToolCallPart = (part: unknown): ToolCallItem | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>
  const toolCallId =
    typeof raw.toolCallId === 'string'
      ? raw.toolCallId
      : typeof raw.tool_call_id === 'string'
        ? raw.tool_call_id
        : undefined
  if (!toolCallId) return null

  const type = typeof raw.type === 'string' ? raw.type : ''
  const fallbackToolName = type.startsWith('tool-') ? type.slice(5) : 'tool'
  const toolName =
    typeof raw.toolName === 'string' && raw.toolName.trim()
      ? raw.toolName
      : typeof raw.tool_name === 'string' && raw.tool_name.trim()
        ? raw.tool_name
        : fallbackToolName

  // clarify_question 等隐藏工具：其产物由 ClarifyPanel 等专属 UI 承载，不渲染为 tool card
  if (isHiddenTool(toolName)) return null

  return {
    toolCallId,
    toolName,
    state: mapToolState(raw.state),
    inputText: stringifyPartValue(raw.input),
    outputText: stringifyPartValue(raw.output),
    errorText:
      typeof raw.errorText === 'string'
        ? raw.errorText
        : typeof raw.error_text === 'string'
          ? raw.error_text
          : undefined,
  }
}

/**
 * 判断某个工具调用是否应被前端隐藏（其产物有专属 UI 承载，避免重复展示）。
 */
export const isHiddenTool = (toolName: unknown): boolean =>
  typeof toolName === 'string' && HIDDEN_TOOL_NAMES.has(toolName)

export const parseReasoningPart = (
  part: unknown
): {
  text: string
  state?: 'streaming' | 'done'
} | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>
  if (raw.type !== 'reasoning') return null

  let text = ''
  let state: 'streaming' | 'done' | undefined = undefined

  if (raw.reasoning && typeof raw.reasoning === 'object') {
    const r = raw.reasoning as Record<string, unknown>
    text = typeof r.text === 'string' ? r.text : ''
    state =
      r.state === 'streaming' || r.state === 'done'
        ? (r.state as 'streaming' | 'done')
        : undefined
  } else {
    text =
      typeof raw.text === 'string'
        ? raw.text
        : typeof raw.reasoning === 'string'
          ? raw.reasoning
          : ''
    state =
      raw.state === 'streaming' || raw.state === 'done'
        ? (raw.state as 'streaming' | 'done')
        : undefined
  }

  return {
    text,
    state,
  }
}

export const parsePlanPart = (
  part: unknown
): {
  summary?: string
  steps: Array<{ description: string; tool_hint?: string }>
  status:
    'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'
  stepStatuses?: Array<
    'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  >
  text?: string
} | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>
  if (raw.type !== 'plan') return null

  // 兼容两种结构：新格式 { type:'plan', plan: {...} } 和旧扁平 { type:'plan', steps, status, text }
  const planObj =
    raw.plan && typeof raw.plan === 'object'
      ? (raw.plan as Record<string, unknown>)
      : raw

  const status =
    planObj.status === 'approved' ||
    planObj.status === 'rejected' ||
    planObj.status === 'pending' ||
    planObj.status === 'executing' ||
    planObj.status === 'completed' ||
    planObj.status === 'failed'
      ? (planObj.status as
          | 'pending'
          | 'approved'
          | 'rejected'
          | 'executing'
          | 'completed'
          | 'failed')
      : 'pending'

  const summary =
    typeof planObj.summary === 'string' ? planObj.summary : undefined

  // steps 可能是对象数组（新）或字符串数组（旧）
  const rawSteps = Array.isArray(planObj.steps) ? planObj.steps : []
  const steps: Array<{ description: string; tool_hint?: string }> = rawSteps
    .map(s => {
      if (typeof s === 'string') return { description: s }
      if (s && typeof s === 'object') {
        const desc =
          typeof (s as any).description === 'string'
            ? (s as any).description
            : ''
        if (!desc) return null
        const obj: { description: string; tool_hint?: string } = {
          description: desc,
        }
        if (typeof (s as any).tool_hint === 'string') {
          obj.tool_hint = (s as any).tool_hint
        }
        return obj
      }
      return null
    })
    .filter((s): s is { description: string; tool_hint?: string } => s !== null)

  // stepStatuses（execute 阶段逐步状态）
  const stepStatuses = Array.isArray(planObj.stepStatuses)
    ? (planObj.stepStatuses as any[]).filter(
        (
          s
        ): s is
          'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed' =>
          typeof s === 'string'
      )
    : undefined

  // 旧格式兼容：text
  const text = typeof planObj.text === 'string' ? planObj.text : undefined

  if (steps.length === 0 && !text) return null
  // 如果 steps 为空但有 text（旧格式），从 text 解析
  const finalSteps =
    steps.length > 0
      ? steps
      : text
        ? parseClientPlanSteps(text).map(d => ({ description: d }))
        : []
  if (finalSteps.length === 0) return null

  return {
    summary,
    steps: finalSteps,
    status,
    stepStatuses,
    text,
  }
}

export const parseClarifyPart = (
  part: unknown
): {
  messageId?: string
  question: string
  options: string[]
  status: 'pending' | 'answered'
  selectedOption?: string | null
} | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>
  if (raw.type !== 'clarify') return null

  const clarifyObj =
    raw.clarify && typeof raw.clarify === 'object'
      ? (raw.clarify as Record<string, unknown>)
      : raw

  const question =
    typeof clarifyObj.question === 'string' ? clarifyObj.question : ''
  const options = Array.isArray(clarifyObj.options)
    ? clarifyObj.options.map(String)
    : []
  const status = clarifyObj.status === 'answered' ? 'answered' : 'pending'
  const selectedOption =
    typeof clarifyObj.selectedOption === 'string'
      ? clarifyObj.selectedOption
      : null
  const messageId =
    typeof clarifyObj.messageId === 'string'
      ? clarifyObj.messageId
      : typeof clarifyObj.message_id === 'string'
        ? clarifyObj.message_id
        : undefined

  return {
    messageId,
    question,
    options,
    status,
    selectedOption,
  }
}

export const pushTaggedTextParts = (
  text: string,
  target: ContentPartItem[]
) => {
  if (!text) return

  const regex = new RegExp(THINK_TAG_REGEX.source, THINK_TAG_REGEX.flags)
  let lastIndex = 0
  let match: RegExpExecArray | null = regex.exec(text)

  while (match) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length
    const before = text.slice(lastIndex, matchStart)
    if (before.trim()) {
      target.push({ type: 'text', text: before })
    }

    const reasoningText = (match[1] ?? '').trim()
    if (reasoningText) {
      target.push({
        type: 'reasoning',
        reasoning: {
          text: reasoningText,
          state: 'done',
        },
      })
    }

    lastIndex = matchEnd
    match = regex.exec(text)
  }

  const after = text.slice(lastIndex)
  if (after.trim()) {
    target.push({ type: 'text', text: after })
  }
}

export const extractLegacyContent = (message: unknown): string => {
  if (!message || typeof message !== 'object') return ''
  if (!('content' in message)) return ''

  const value = (message as Record<string, unknown>).content
  return typeof value === 'string' ? value : ''
}

export const extractAssistantContentParts = (
  parts: unknown[]
): ContentPartItem[] => {
  const result: ContentPartItem[] = []
  const toolIndexById = new Map<string, number>()
  let textBuffer = ''

  const flushText = () => {
    if (!textBuffer.trim()) {
      textBuffer = ''
      return
    }
    pushTaggedTextParts(textBuffer, result)
    textBuffer = ''
  }

  parts.forEach(part => {
    if (isTextPart(part)) {
      textBuffer += part.text
      return
    }

    const reasoning = parseReasoningPart(part)
    if (reasoning) {
      flushText()
      result.push({
        type: 'reasoning',
        reasoning,
      })
      return
    }

    const plan = parsePlanPart(part)
    if (plan) {
      flushText()
      result.push({
        type: 'plan',
        plan,
      })
      return
    }

    const clarify = parseClarifyPart(part)
    if (clarify) {
      flushText()
      result.push({
        type: 'clarify',
        clarify,
      })
      return
    }

    const tool = parseToolCallPart(part)
    if (!tool) return

    flushText()
    const existingIndex = toolIndexById.get(tool.toolCallId)
    const toolPart: ContentPartItem = { type: 'tool', tool }

    if (existingIndex !== undefined) {
      result[existingIndex] = toolPart
    } else {
      toolIndexById.set(tool.toolCallId, result.length)
      result.push(toolPart)
    }
  })

  flushText()
  return result
}
