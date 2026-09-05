import type { AgentRunApproval } from '@/service/agent'
import type {
  AgentStreamChunk,
  ContentPartItem,
  ToolCallItem,
} from './chat-types'

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

export const parseClientPlanSteps = (planText: string): string[] => {
  if (!planText || !planText.trim()) return []
  const steps: string[] = []
  const stepPattern = /^\s*(?:\d+[.)、]|[-*•])\s*(.+)$/
  for (const rawLine of planText.split('\n')) {
    const line = rawLine.trim()
    if (
      steps.length > 0 &&
      /^#{1,6}\s*(预期结果|需要澄清|说明|备注)/i.test(line)
    )
      break
    const match = line.match(stepPattern)
    if (match?.[1]?.trim()) steps.push(match[1].trim())
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
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
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

export const isHiddenTool = (toolName: unknown) =>
  typeof toolName === 'string' && HIDDEN_TOOL_NAMES.has(toolName)

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

export const parseReasoningPart = (part: unknown) => {
  if (
    !part ||
    typeof part !== 'object' ||
    (part as Record<string, unknown>).type !== 'reasoning'
  )
    return null
  const raw = part as Record<string, unknown>
  const nested =
    raw.reasoning && typeof raw.reasoning === 'object'
      ? (raw.reasoning as Record<string, unknown>)
      : undefined
  const text = nested
    ? typeof nested.text === 'string'
      ? nested.text
      : ''
    : typeof raw.text === 'string'
      ? raw.text
      : typeof raw.reasoning === 'string'
        ? raw.reasoning
        : ''
  const stateValue = nested?.state ?? raw.state
  const state =
    stateValue === 'streaming' || stateValue === 'done' ? stateValue : undefined
  return { text, state: state as 'streaming' | 'done' | undefined }
}

export const parsePlanPart = (part: unknown) => {
  if (
    !part ||
    typeof part !== 'object' ||
    (part as Record<string, unknown>).type !== 'plan'
  )
    return null
  const raw = part as Record<string, unknown>
  const planObj =
    raw.plan && typeof raw.plan === 'object'
      ? (raw.plan as Record<string, unknown>)
      : raw
  const allowedStatuses = [
    'approved',
    'rejected',
    'pending',
    'executing',
    'completed',
    'failed',
  ]
  const status = allowedStatuses.includes(String(planObj.status))
    ? (planObj.status as
        | 'pending'
        | 'approved'
        | 'rejected'
        | 'executing'
        | 'completed'
        | 'failed')
    : 'pending'
  const rawSteps = Array.isArray(planObj.steps) ? planObj.steps : []
  const steps = rawSteps
    .map(step => {
      if (typeof step === 'string') return { description: step }
      if (!step || typeof step !== 'object') return null
      const value = step as Record<string, unknown>
      if (typeof value.description !== 'string' || !value.description)
        return null
      return {
        description: value.description,
        ...(typeof value.tool_hint === 'string'
          ? { tool_hint: value.tool_hint }
          : {}),
      }
    })
    .filter(
      (step): step is { description: string; tool_hint?: string } =>
        step !== null
    )
  const text = typeof planObj.text === 'string' ? planObj.text : undefined
  if (steps.length === 0 && !text) return null
  const finalSteps =
    steps.length > 0
      ? steps
      : parseClientPlanSteps(text ?? '').map(description => ({ description }))
  if (finalSteps.length === 0) return null
  const stepStatuses = Array.isArray(planObj.stepStatuses)
    ? planObj.stepStatuses.filter(
        (
          s
        ): s is
          'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed' =>
          typeof s === 'string'
      )
    : undefined
  return {
    summary: typeof planObj.summary === 'string' ? planObj.summary : undefined,
    steps: finalSteps,
    status,
    stepStatuses,
    text,
  }
}

export const parseClarifyPart = (part: unknown) => {
  if (
    !part ||
    typeof part !== 'object' ||
    (part as Record<string, unknown>).type !== 'clarify'
  )
    return null
  const raw = part as Record<string, unknown>
  const clarifyObj =
    raw.clarify && typeof raw.clarify === 'object'
      ? (raw.clarify as Record<string, unknown>)
      : raw
  return {
    messageId:
      typeof clarifyObj.messageId === 'string'
        ? clarifyObj.messageId
        : typeof clarifyObj.message_id === 'string'
          ? clarifyObj.message_id
          : undefined,
    question:
      typeof clarifyObj.question === 'string' ? clarifyObj.question : '',
    options: Array.isArray(clarifyObj.options)
      ? clarifyObj.options.map(String)
      : [],
    status:
      clarifyObj.status === 'answered'
        ? ('answered' as const)
        : ('pending' as const),
    selectedOption:
      typeof clarifyObj.selectedOption === 'string'
        ? clarifyObj.selectedOption
        : null,
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
    const before = text.slice(lastIndex, match.index)
    if (before.trim()) target.push({ type: 'text', text: before })
    const reasoningText = (match[1] ?? '').trim()
    if (reasoningText)
      target.push({
        type: 'reasoning',
        reasoning: { text: reasoningText, state: 'done' },
      })
    lastIndex = match.index + match[0].length
    match = regex.exec(text)
  }
  const after = text.slice(lastIndex)
  if (after.trim()) target.push({ type: 'text', text: after })
}

export const extractLegacyContent = (message: unknown) => {
  if (!message || typeof message !== 'object' || !('content' in message))
    return ''
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
    if (
      part &&
      typeof part === 'object' &&
      (part as { type?: unknown }).type === 'text' &&
      typeof (part as { text?: unknown }).text === 'string'
    ) {
      textBuffer += (part as { text: string }).text
      return
    }
    const reasoning = parseReasoningPart(part)
    if (reasoning) {
      flushText()
      result.push({ type: 'reasoning', reasoning })
      return
    }
    const plan = parsePlanPart(part)
    if (plan) {
      flushText()
      result.push({ type: 'plan', plan })
      return
    }
    const clarify = parseClarifyPart(part)
    if (clarify) {
      flushText()
      result.push({ type: 'clarify', clarify })
      return
    }
    const tool = parseToolCallPart(part)
    if (!tool) return
    flushText()
    const toolPart: ContentPartItem = { type: 'tool', tool }
    const existingIndex = toolIndexById.get(tool.toolCallId)
    if (existingIndex !== undefined) result[existingIndex] = toolPart
    else {
      toolIndexById.set(tool.toolCallId, result.length)
      result.push(toolPart)
    }
  })
  flushText()
  return result
}
