/**
 * 助手消息「当前活动」推导与工具摘要。
 *
 * 纯函数、无 React 依赖：输入消息 parts（流式或持久化），输出当前相位与
 * 工具动作摘要，供 ActivityStatusLine / ToolCallGroup / 测试共同使用。
 */

export interface ActivityToolPreview {
  toolCallId: string
  toolName: string
  state: 'running' | 'success' | 'error'
  inputText?: string
  outputText?: string
  errorText?: string
}

export interface ActivityPlanInfo {
  summary?: string
  steps: Array<{ description: string; tool_hint?: string }>
  status:
    'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'
  stepStatuses?: Array<
    'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  >
  text?: string
}

export type ActivityPart =
  | { type: 'text'; text: string }
  | {
      type: 'reasoning'
      reasoning: { text: string; state?: 'streaming' | 'done' }
    }
  | { type: 'tool'; tool: ActivityToolPreview }
  | { type: 'plan'; plan: ActivityPlanInfo }
  | {
      type: 'clarify'
      clarify: {
        messageId?: string
        question: string
        options: string[]
        status: 'pending' | 'answered'
        selectedOption?: string | null
      }
    }

/**
 * 助手消息的实时相位：
 * - idle      无活动（答案输出中或已结束）——不渲染状态行，让正文成为焦点
 * - preparing 已发出请求但尚未收到任何内容（排队/等待首个事件）
 * - thinking  思考内容流式输出中（由 ThinkingTrace 自行渲染状态行）
 * - tool      正在调用工具
 * - plan      计划执行中
 */
export type AssistantActivity =
  | { phase: 'idle' }
  | { phase: 'preparing' }
  | { phase: 'thinking' }
  | { phase: 'tool'; tool: ActivityToolPreview }
  | {
      phase: 'plan'
      done: number
      total: number
      current?: string
      status: ActivityPlanInfo['status']
      stepStatuses?: ActivityPlanInfo['stepStatuses']
    }

export function deriveAssistantActivity(
  parts: ActivityPart[] | undefined,
  options: { isLoading: boolean }
): AssistantActivity {
  const safeParts = parts ?? []
  if (!options.isLoading) return { phase: 'idle' }
  if (safeParts.length === 0) return { phase: 'preparing' }

  for (let i = safeParts.length - 1; i >= 0; i -= 1) {
    const part = safeParts[i]
    if (!part) continue
    if (part.type === 'reasoning' && part.reasoning.state === 'streaming') {
      return { phase: 'thinking' }
    }
  }

  for (let i = safeParts.length - 1; i >= 0; i -= 1) {
    const part = safeParts[i]
    if (!part) continue
    if (part.type === 'tool' && part.tool.state === 'running') {
      return { phase: 'tool', tool: part.tool }
    }
  }

  for (let i = safeParts.length - 1; i >= 0; i -= 1) {
    const part = safeParts[i]
    if (!part || part.type !== 'plan') continue
    const { plan } = part
    const statuses = plan.stepStatuses ?? []
    const total = plan.steps.length
    const done = statuses.filter(
      step => step === 'completed' || step === 'skipped'
    ).length
    const current =
      plan.steps[statuses.findIndex(s => s === 'in_progress')]?.description
    const isExecuting =
      plan.status === 'executing' ||
      (plan.status === 'approved' && statuses.some(s => s === 'in_progress'))
    if (isExecuting && total > 0) {
      return {
        phase: 'plan',
        done,
        total,
        current,
        status: plan.status,
        stepStatuses: plan.stepStatuses,
      }
    }
  }

  const hasText = safeParts.some(part => part.type === 'text' && part.text)
  if (hasText) return { phase: 'idle' }

  // 有内容但既不在思考/工具/计划，也没有文本输出（如思考刚结束的间隙），
  // 保持安静，不渲染状态行。
  return { phase: 'idle' }
}

/** 按工具名推断动作类别（决定动作动词与图标）。 */
export type ToolKind = 'read' | 'write' | 'run' | 'search' | 'generic'

export function getToolKind(toolName: string): ToolKind {
  if (/read|open|view|list|^ls$/i.test(toolName)) return 'read'
  if (/write|edit|patch|create|save|update/i.test(toolName)) return 'write'
  if (/run|exec|command|test|build|shell|bash/i.test(toolName)) return 'run'
  if (/search|find|grep|query/i.test(toolName)) return 'search'
  // fetch/web/image 等「取回类」归入 read 展示
  if (/fetch|web|http|url|download|image|browser/i.test(toolName)) return 'read'
  return 'generic'
}

/** 中段截断：保留首尾，避免 URL/路径被截掉最有辨识度的两端。 */
export function truncateMiddle(text: string, maxLength: number): string {
  const value = text.replace(/\s+/g, ' ').trim()
  if (value.length <= maxLength) return value
  if (maxLength <= 1) return '…'
  const headLength = Math.ceil((maxLength - 1) * 0.6)
  const tailLength = Math.max(1, Math.floor((maxLength - 1) * 0.4))
  return `${value.slice(0, headLength)}…${value.slice(-tailLength)}`
}

const INPUT_SUMMARY_KEYS = [
  'file_path',
  'filePath',
  'path',
  'file',
  'filename',
  'command',
  'cmd',
  'query',
  'q',
  'keyword',
  'url',
  'link',
  'pattern',
  'skill',
  'name',
  'topic',
  'message',
  'content',
  'input',
  'prompt',
] as const

/**
 * 从工具输入中提取一个「人类可读的目标」：
 * 优先取 JSON 里最有辨识度的字段（文件路径/命令/查询词…），失败时退回原文截断。
 */
export function summarizeToolInput(
  inputText: string | undefined,
  maxLength = 48
): string {
  if (!inputText) return ''
  const trimmed = inputText.trim()
  if (!trimmed) return ''

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      for (const key of INPUT_SUMMARY_KEYS) {
        const value = record[key]
        if (typeof value === 'string' && value.trim()) {
          return truncateMiddle(value, maxLength)
        }
      }
      // 嵌套一层（如 {args: {file_path}}）
      for (const value of Object.values(record)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const nested = value as Record<string, unknown>
          for (const key of INPUT_SUMMARY_KEYS) {
            const nestedValue = nested[key]
            if (typeof nestedValue === 'string' && nestedValue.trim()) {
              return truncateMiddle(nestedValue, maxLength)
            }
          }
        }
      }
      const firstString = Object.values(record).find(
        (value): value is string => typeof value === 'string' && !!value.trim()
      )
      if (firstString) return truncateMiddle(firstString, maxLength)
      return ''
    }
    if (typeof parsed === 'string') return truncateMiddle(parsed, maxLength)
  } catch {
    // 非 JSON：按原文处理
  }

  return truncateMiddle(trimmed, maxLength)
}

/** 结果 chip 的单行摘要：优先错误信息，其次输出，取首行并截断。 */
export function summarizeToolResult(
  outputText: string | undefined,
  errorText: string | undefined,
  maxLength = 42
): string {
  const source = errorText?.trim() || outputText?.trim() || ''
  if (!source) return ''
  const firstLine = source.split('\n').find(line => line.trim()) ?? ''
  return truncateMiddle(firstLine, maxLength)
}
