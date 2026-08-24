import { agentSessionService } from './session.js'
import { agentRuntimeService } from './runtime.js'
import { PlanStore } from './plan-store.js'
import type { StructuredPlan } from './plan-tools.js'
import { AgentRunPersistence } from './persistence.js'
import { appendRunUiEvent, cleanupRunEvents } from './run-events.js'
import { safeJsonStringify } from '../utils/json.js'
import { WorkspaceManager } from './workspace.js'

export interface ExecuteAgentRunOptions {
  agentId: string
  runId: string
  input: string
  threadId?: string | null
  ownerId?: string | null
  runtimeInput?: any
  memoryInstructions?: string
  modelOverride?: string | null
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | null
  planMode?: 'plan' | 'execute'
  approvedPlan?: StructuredPlan | null
  forceSkillName?: string
  replaceAssistantMessageId?: string | null
  userId?: string
  signal?: AbortSignal
  persistEvents?: boolean
  emit?: (type: string, event?: Record<string, unknown>) => void | Promise<void>
}

/**
 * run 终态后延迟清理事件流：留 60s 窗口给「刚断线、马上重连」的客户端
 * 完成最后一次回放；期间不再有新事件写入。TTL（30 分钟）兜底进程崩溃场景。
 */
function scheduleEventCleanup(runId: string) {
  const timer = setTimeout(() => void cleanupRunEvents(runId), 60_000)
  timer.unref?.()
}

type PersistedAssistantPart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string; state: 'done' }
  | {
      type: 'tool'
      toolCallId: string
      toolName: string
      state: 'input-available' | 'output-available' | 'output-error'
      input?: unknown
      output?: unknown
      errorText?: string
    }

export function enrichAgentRunError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const raw = error.message
  if (/max.*turn/i.test(raw) || error.name === 'MaxTurnsExceededError') {
    return `Agent run reached its maxTurns safety limit. Increase the agent's "Maximum turns per run" setting up to 200, or break the task into smaller steps.`
  }
  const match = raw.match(/^(\d{3}) status code \(no body\)$/)
  if (!match) return raw
  const status = Number(match[1])
  const hint =
    status === 400
      ? '请求被上游模型拒绝(参数或内容不兼容,例如多模态内容发给了纯文本模型)'
      : status === 401 || status === 403
        ? '上游鉴权失败,请检查对应 provider 的 API Key 配置'
        : status === 404
          ? '上游模型或端点不存在,请检查模型名与 baseURL'
          : status === 429
            ? '上游请求超限(限流或额度不足)'
            : status >= 500
              ? '上游服务暂时不可用,请稍后重试'
              : '上游返回了空错误响应'
  return `上游模型请求失败 (HTTP ${status}):${hint}`
}

function stringifyToolValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return safeJsonStringify(value)
}

function parseToolArguments(value: unknown) {
  if (typeof value !== 'string') return value
  if (!value.trim()) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function toolCallIdFromPayload(payload: Record<string, unknown>) {
  const toolCall = payload.toolCall
  if (toolCall && typeof toolCall === 'object') {
    const raw = toolCall as Record<string, unknown>
    if (typeof raw.callId === 'string' && raw.callId.trim()) {
      return raw.callId
    }
    if (typeof raw.id === 'string' && raw.id.trim()) {
      return raw.id
    }
  }
  const toolName =
    typeof payload.toolName === 'string' && payload.toolName.trim()
      ? payload.toolName
      : 'tool'
  return `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toolNameFromPayload(payload: Record<string, unknown>) {
  if (typeof payload.toolName === 'string' && payload.toolName.trim()) {
    return payload.toolName
  }
  const toolCall = payload.toolCall
  if (toolCall && typeof toolCall === 'object') {
    const raw = toolCall as Record<string, unknown>
    if (typeof raw.name === 'string' && raw.name.trim()) return raw.name
  }
  return 'tool'
}

function toolInputFromPayload(payload: Record<string, unknown>) {
  const toolCall = payload.toolCall
  if (!toolCall || typeof toolCall !== 'object') return undefined
  const raw = toolCall as Record<string, unknown>
  return parseToolArguments(raw.arguments)
}

function extractTextDeltaFromStreamEvent(event: unknown) {
  if (!event || typeof event !== 'object') return ''
  const rawEvent = event as Record<string, unknown>
  if (rawEvent.type !== 'raw_model_stream_event') return ''

  const data = rawEvent.data as Record<string, unknown> | undefined
  if (!data || typeof data !== 'object') return ''
  if (data.type === 'output_text_delta' && typeof data.delta === 'string') {
    return data.delta
  }
  if (data.type === 'text_delta' && typeof data.delta === 'string') {
    return data.delta
  }
  return ''
}

function collectReasoningValues(value: unknown, target: string[]) {
  if (!value || typeof value !== 'object') return
  const raw = value as Record<string, unknown>
  for (const key of ['reasoning_content', 'reasoning', 'thinking']) {
    const item = raw[key]
    if (typeof item === 'string' && item.trim()) {
      target.push(item)
    }
  }
  Object.values(raw).forEach(child => {
    if (child && typeof child === 'object') {
      collectReasoningValues(child, target)
    }
  })
}

function extractReasoningDeltaFromStreamEvent(event: unknown) {
  if (!event || typeof event !== 'object') return ''
  const rawEvent = event as Record<string, unknown>
  if (rawEvent.type !== 'raw_model_stream_event') return ''

  const values: string[] = []
  collectReasoningValues(rawEvent.data, values)
  return values.join('')
}

function getReasoningDelta(raw: string, snapshot: string) {
  if (!raw) return { delta: '', snapshot }
  if (!snapshot) return { delta: raw, snapshot: raw }
  if (raw.startsWith(snapshot)) {
    return {
      delta: raw.slice(snapshot.length),
      snapshot: raw,
    }
  }
  return {
    delta: raw,
    snapshot: snapshot + raw,
  }
}

function appendTextPart(parts: PersistedAssistantPart[], text: string) {
  if (!text) return
  const last = parts[parts.length - 1]
  if (last?.type === 'text') {
    last.text += text
    return
  }
  parts.push({ type: 'text', text })
}

function appendReasoningPart(parts: PersistedAssistantPart[], text: string) {
  if (!text) return
  const last = parts[parts.length - 1]
  if (last?.type === 'reasoning') {
    last.text += text
    return
  }
  parts.push({ type: 'reasoning', text, state: 'done' })
}

function upsertToolPart(
  parts: PersistedAssistantPart[],
  tool: Extract<PersistedAssistantPart, { type: 'tool' }>
) {
  const index = parts.findIndex(
    part => part.type === 'tool' && part.toolCallId === tool.toolCallId
  )
  if (index === -1) {
    parts.push(tool)
    return
  }
  const existing = parts[index]
  if (existing?.type !== 'tool') return
  parts[index] = {
    ...existing,
    ...tool,
  }
}

export async function executeAgentRun(options: ExecuteAgentRunOptions) {
  const pendingEmits: Promise<void>[] = []
  const emit = (type: string, event: Record<string, unknown> = {}) => {
    const payload = { ...event, type }
    const result = options.emit
      ? options.emit(type, event)
      : options.persistEvents === false
        ? undefined
        : appendRunUiEvent(options.runId, type, payload)

    if (result && typeof (result as Promise<void>).then === 'function') {
      pendingEmits.push(Promise.resolve(result).then(() => undefined))
    }
  }

  const textId = `text-${options.runId}`
  const activeToolCalls = new Map<string, string>()
  const assistantParts: PersistedAssistantPart[] = []
  let planStore: PlanStore | undefined

  try {
    emit('agent.run.created', {
      data: {
        threadId: options.threadId,
        runId: options.runId,
        agentId: options.agentId,
      },
    })
    emit('response.in_progress', {
      response_id: options.runId,
    })

    if (options.planMode === 'execute' && options.approvedPlan) {
      planStore = new PlanStore(options.approvedPlan, update => {
        emit('response.plan_step_updated', {
          response_id: options.runId,
          step_index: update.step_index,
          plan_step_status: update.status,
          note: update.note,
        })
      })
    }

    const { result, persistence, modelKey } = await agentRuntimeService.run(
      options.agentId,
      {
        runId: options.runId,
        input: options.runtimeInput ?? options.input,
        threadId: options.threadId,
        stream: true,
        signal: options.signal,
        modelOverride: options.modelOverride,
        reasoningEffort: options.reasoningEffort,
        memoryInstructions: options.memoryInstructions,
        planMode: options.planMode,
        approvedPlan: options.approvedPlan,
        planStore,
        forceSkillName: options.forceSkillName,
        userId: options.userId,
        onEvent: event => {
          if (event.type === 'tool_start') {
            const toolCallId = toolCallIdFromPayload(event.payload)
            const toolName = toolNameFromPayload(event.payload)
            const input = toolInputFromPayload(event.payload)
            activeToolCalls.set(toolName, toolCallId)
            emit('response.output_item.added', {
              response_id: options.runId,
              item_id: toolCallId,
              output_index: activeToolCalls.size - 1,
              toolCallId,
              toolName,
              item: {
                id: toolCallId,
                type: 'function_call',
                name: toolName,
                arguments: '',
              },
            })
            const inputText = stringifyToolValue(input)
            if (inputText) {
              emit('response.function_call_arguments.delta', {
                response_id: options.runId,
                item_id: toolCallId,
                output_index: activeToolCalls.size - 1,
                toolCallId,
                toolName,
                delta: inputText,
                inputTextDelta: inputText,
              })
            }
            emit('response.function_call_arguments.done', {
              response_id: options.runId,
              item_id: toolCallId,
              output_index: activeToolCalls.size - 1,
              toolCallId,
              toolName,
              input,
              item: {
                id: toolCallId,
                type: 'function_call',
                name: toolName,
                arguments: inputText,
              },
            })
            upsertToolPart(assistantParts, {
              type: 'tool',
              toolCallId,
              toolName,
              state: 'input-available',
              input,
            })
            return
          }

          if (event.type === 'tool_end') {
            const toolName = toolNameFromPayload(event.payload)
            const toolCallId =
              activeToolCalls.get(toolName) ||
              toolCallIdFromPayload(event.payload)
            emit('agent.tool_call.output', {
              response_id: options.runId,
              item_id: toolCallId,
              toolCallId,
              toolName,
              output: event.payload.result,
            })
            upsertToolPart(assistantParts, {
              type: 'tool',
              toolCallId,
              toolName,
              state: 'output-available',
              output: event.payload.result,
            })
            return
          }

          if (event.type === 'handoff') {
            emit('agent.handoff', {
              data: event.payload,
            })
          }
        },
      }
    )
    const streamedResult = result as any

    let finalText = ''
    let textStarted = false
    const reasoningId = `reasoning-${options.runId}`
    let reasoningStarted = false
    let reasoningSnapshot = ''

    for await (const event of streamedResult) {
      const reasoningRaw = extractReasoningDeltaFromStreamEvent(event)
      const reasoningDeltaResult = getReasoningDelta(
        reasoningRaw,
        reasoningSnapshot
      )
      reasoningSnapshot = reasoningDeltaResult.snapshot
      if (reasoningDeltaResult.delta) {
        reasoningStarted = true
        emit('response.reasoning.delta', {
          response_id: options.runId,
          id: reasoningId,
          delta: reasoningDeltaResult.delta,
        })
        appendReasoningPart(assistantParts, reasoningDeltaResult.delta)
      }

      const value = extractTextDeltaFromStreamEvent(event)
      if (!value) continue
      finalText += value
      if (!textStarted) {
        emit('response.output_text.start', {
          response_id: options.runId,
          id: textId,
        })
        textStarted = true
      }
      emit('response.output_text.delta', {
        response_id: options.runId,
        id: textId,
        delta: value,
      })
      appendTextPart(assistantParts, value)
    }

    await streamedResult.completed
    if (textStarted) {
      emit('response.output_text.done', {
        response_id: options.runId,
        id: textId,
      })
    }
    if (reasoningStarted) {
      emit('response.reasoning.done', {
        response_id: options.runId,
        id: reasoningId,
      })
    }

    const finalOutput = String(streamedResult.finalOutput ?? finalText)
    const completed = await persistence.complete(
      finalOutput,
      streamedResult.lastAgent?.name,
      streamedResult.lastResponseId
    )
    if (!completed) {
      await Promise.all(pendingEmits)
      return
    }

    const isPlanMode = options.planMode === 'plan'
    let planMessageId: string | undefined
    const structuredPlan = isPlanMode
      ? await agentRuntimeService.consumePendingPlan(options.runId)
      : null
    if (isPlanMode && structuredPlan) {
      assistantParts.push({
        type: 'plan',
        plan: {
          summary: structuredPlan.summary,
          steps: structuredPlan.steps,
          status: 'pending',
        },
      } as any)
    }
    // 澄清问题：模型调用 clarify_question 后，run 挂起，取走缓存的提问并写入 parts
    const structuredClarify = await agentRuntimeService.consumePendingClarify(
      options.runId
    )
    if (structuredClarify) {
      assistantParts.push({
        type: 'clarify',
        clarify: {
          question: structuredClarify.question,
          options: structuredClarify.options,
          status: 'pending',
        },
      } as any)
    }
    if (options.threadId) {
      // clarify 命中时，工具返回的 JSON（clarify_created...）只是内部信号，
      // 不应作为正文落库/下发，用空串占位，避免状态文本泄漏给用户
      const persistOutput = structuredClarify ? '' : finalOutput
      const replacedMessage = options.replaceAssistantMessageId
        ? await agentSessionService.replaceAssistantMessage(
            options.replaceAssistantMessageId,
            options.threadId,
            options.runId,
            persistOutput,
            assistantParts,
            { modelKey }
          )
        : null
      const savedMessage =
        replacedMessage ||
        (await agentSessionService.appendAssistantMessage(
          options.threadId,
          options.runId,
          persistOutput,
          assistantParts,
          { modelKey }
        ))
      planMessageId = savedMessage?.id
      agentSessionService.scheduleSummaries(
        options.threadId,
        options.agentId,
        options.ownerId
      )
    }
    if (isPlanMode && structuredPlan) {
      emit('response.plan_proposed', {
        response_id: options.runId,
        plan_message_id: planMessageId,
        plan_summary: structuredPlan.summary,
        plan_steps: structuredPlan.steps,
      })
    }
    if (structuredClarify) {
      // 推送澄清问题事件，前端据此渲染 ClarifyPanel 交互卡片
      emit('response.clarify_created', {
        response_id: options.runId,
        clarify_message_id: planMessageId,
        clarify_question: structuredClarify.question,
        clarify_options: structuredClarify.options,
      })
    }

    if (planStore) {
      planStore.finalize()
    }
    for (const part of assistantParts) {
      if (
        part.type === 'tool' &&
        part.state !== 'output-available' &&
        part.state !== 'output-error'
      ) {
        part.state = 'output-available'
        emit('agent.tool_call.output', {
          response_id: options.runId,
          item_id: part.toolCallId,
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          output: '(completed)',
        })
      }
    }
    emit('response.completed', {
      response_id: options.runId,
      // clarify 命中时不把工具返回的 JSON 当正文下发
      output_text: structuredClarify ? '' : finalOutput,
    })
    await Promise.all(pendingEmits)
    scheduleEventCleanup(options.runId)
  } catch (error) {
    const message = enrichAgentRunError(error)
    emit('response.failed', {
      response_id: options.runId,
      error: message,
    })
    // allSettled：若 emit 本身 reject（Redis 故障），不让二次抛错跳过
    // 下面的 fail/cancel 落库与事件清理
    await Promise.allSettled(pendingEmits)
    if (options.signal?.aborted) {
      await new AgentRunPersistence(options.runId).cancel('Run cancelled')
    } else {
      await new AgentRunPersistence(options.runId).fail(message)
    }
    scheduleEventCleanup(options.runId)
  } finally {
    if (options.threadId) {
      WorkspaceManager.cleanupWorkspace(options.threadId)
    }
  }
}
