import { agentSessionService } from './session.js'
import { agentRuntimeService } from './runtime.js'
import { PlanStore } from './plan-store.js'
import type { StructuredPlan } from './plan-tools.js'
import { AgentRunPersistence } from './persistence.js'
import {
  appendRunEventForLease,
  appendRunUiEvent,
  cleanupRunEvents,
  closeRunEventFence,
} from './run-events.js'
import { safeJsonStringify } from '../utils/json.js'
import { WorkspaceManager } from './workspace.js'
import {
  calculateUsageCost,
  loadRunBudgetLimits,
  parseModelPricing,
  RunBudgetTracker,
} from './run-budget.js'
import type { RunLease } from './run-lease.js'
import { suspendRunForApproval } from './approval-persistence.js'
import { prisma } from './db.js'
import { isTerminalUiEventType } from './run-terminal.js'

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
  lease?: RunLease
  resumeState?: string
  resumeStateHash?: string
  stateVersion?: number
  partialOutput?: string | null
  partialParts?: unknown
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

function restoreAssistantParts(value: unknown): PersistedAssistantPart[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((part): part is PersistedAssistantPart =>
      Boolean(
        part &&
        typeof part === 'object' &&
        ['text', 'reasoning', 'tool'].includes(
          String((part as { type?: unknown }).type ?? '')
        )
      )
    )
    .map(part => structuredClone(part))
}

function approvalTtlMs() {
  const raw = Number(process.env.AGENT_TOOL_APPROVAL_TTL_MS || 15 * 60_000)
  if (!Number.isFinite(raw)) return 15 * 60_000
  return Math.max(60_000, Math.min(24 * 60 * 60_000, Math.floor(raw)))
}

export function mergeResumedOutput(
  partialOutput: string | null | undefined,
  sdkFinalOutput: string,
  streamedOutput: string
) {
  if (!sdkFinalOutput) return streamedOutput
  if (!partialOutput || sdkFinalOutput.startsWith(partialOutput)) {
    return sdkFinalOutput
  }
  return `${partialOutput}${sdkFinalOutput}`
}

export async function executeAgentRun(options: ExecuteAgentRunOptions) {
  const budget = new RunBudgetTracker(loadRunBudgetLimits(), options.signal)
  const pendingEmits: Promise<void>[] = []
  let localEventFenceClosed = false
  const flushPendingEmits = async () => {
    const pending = pendingEmits.splice(0, pendingEmits.length)
    if (pending.length) await Promise.allSettled(pending)
  }
  const closeExecutionEventFence = async () => {
    // Seal the process-local gate before draining. This prevents callbacks
    // that arrive while the drain is waiting from creating a second batch of
    // lease-scoped writes. A later attempt opens a higher durable generation.
    localEventFenceClosed = true
    await flushPendingEmits()
    if (options.lease) {
      await closeRunEventFence(options.lease).catch(() => false)
    }
  }
  const emit = (
    type: string,
    event: Record<string, unknown> = {},
    requireActiveLease = !isTerminalUiEventType(type)
  ) => {
    const payload = { ...event, type }
    if (options.lease && requireActiveLease && localEventFenceClosed) return
    const result = options.emit
      ? options.emit(type, event)
      : options.persistEvents === false
        ? undefined
        : options.lease && requireActiveLease
          ? appendRunEventForLease(options.lease, type, payload)
          : appendRunUiEvent(options.runId, type, payload)

    if (result && typeof (result as Promise<void>).then === 'function') {
      pendingEmits.push(Promise.resolve(result).then(() => undefined))
    }
  }

  const textId = `text-${options.runId}`
  const activeToolCalls = new Map<string, string>()
  const assistantParts = restoreAssistantParts(options.partialParts)
  let planStore: PlanStore | undefined

  try {
    budget.assertInput({
      input: options.runtimeInput ?? options.input,
      memoryInstructions: options.memoryInstructions ?? '',
      approvedPlan: options.approvedPlan ?? null,
    })
    if (options.partialOutput) budget.recordOutput(options.partialOutput)
    if (options.resumeState) {
      const priorExecutedTools = await prisma.agentToolCall.count({
        where: {
          runId: options.runId,
          status: { in: ['completed', 'failed'] },
        },
      })
      budget.recordToolCall(priorExecutedTools)
      emit('agent.run.resumed', { data: { runId: options.runId } })
    } else {
      emit('agent.run.created', {
        data: {
          threadId: options.threadId,
          runId: options.runId,
          agentId: options.agentId,
        },
      })
    }
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
        signal: budget.signal,
        maxOutputTokens: budget.limits.maxOutputTokens,
        lease: options.lease,
        resumeState: options.resumeState,
        resumeStateHash: options.resumeStateHash,
        stateVersion: options.stateVersion,
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
            budget.recordToolCall()
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

    let finalText = options.partialOutput ?? ''
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
      budget.recordOutput(value)
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
    const interruptions = Array.isArray(streamedResult.interruptions)
      ? streamedResult.interruptions
      : []
    if (interruptions.length) {
      if (!options.lease || !options.ownerId) {
        throw new Error(
          'Durable lease and owner are required for tool approval suspension'
        )
      }
      const approvals = interruptions.map((item: any) => {
        const rawItem = item?.rawItem ?? {}
        const toolCallId = String(
          rawItem.callId ?? rawItem.call_id ?? rawItem.id ?? ''
        )
        const toolName = String(item?.name ?? item?.toolName ?? '')
        if (!toolCallId || !toolName) {
          throw new Error('SDK approval interruption is missing tool identity')
        }
        return {
          toolCallId,
          toolName,
          arguments: parseToolArguments(item?.arguments ?? rawItem.arguments),
        }
      })
      await closeExecutionEventFence()
      const suspended = await suspendRunForApproval(options.lease, {
        ownerId: options.ownerId,
        approvals,
        sdkState: streamedResult.state.toString(),
        partialOutput: finalText,
        partialParts: assistantParts,
        expiresAt: new Date(Date.now() + approvalTtlMs()),
      })
      if (!suspended) {
        throw new Error('Run lease was lost while suspending for approval')
      }
      return
    }
    const rawUsage = streamedResult.state?.usage
    const usage = rawUsage
      ? {
          requests: Number(rawUsage.requests || 0),
          inputTokens: Number(rawUsage.inputTokens || 0),
          outputTokens: Number(rawUsage.outputTokens || 0),
          totalTokens: Number(rawUsage.totalTokens || 0),
        }
      : undefined
    const usageCostUsd = usage
      ? calculateUsageCost({
          modelKey,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          pricing: parseModelPricing(process.env.AGENT_MODEL_PRICING_JSON),
        })
      : null
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

    const sdkFinalOutput = String(streamedResult.finalOutput ?? '')
    const finalOutput = mergeResumedOutput(
      options.partialOutput,
      sdkFinalOutput,
      finalText
    )
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

    if (planStore) {
      planStore.finalize()
    }
    for (const part of assistantParts) {
      if (
        part.type === 'tool' &&
        part.state !== 'output-available' &&
        part.state !== 'output-error'
      ) {
        part.state = 'output-error'
        emit('agent.tool_call.output', {
          response_id: options.runId,
          item_id: part.toolCallId,
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          output: 'Tool call ended without a result',
        })
      }
    }

    // Seal and drain all lease-scoped output, then close the Redis fence before
    // committing terminal state. Late callbacks cannot enqueue new writes.
    await closeExecutionEventFence()

    // Run terminal state and assistant history are one database commit. Redis
    // UI events are a replayable projection and can be rebuilt from this row.
    let completed = false
    if (options.threadId) {
      const completion = await persistence.completeWithAssistant({
        threadId: options.threadId,
        finalOutput,
        // clarify 命中时，工具返回的内部信号不作为正文落库。
        persistedOutput: structuredClarify ? '' : finalOutput,
        parts: assistantParts,
        metadata: {
          modelKey,
          ...(usage ? { usage } : {}),
          ...(usageCostUsd !== null ? { usageCostUsd } : {}),
        },
        replaceAssistantMessageId: options.replaceAssistantMessageId,
        lastAgentName: streamedResult.lastAgent?.name,
        lastResponseId: streamedResult.lastResponseId,
      })
      completed = completion.completed
      planMessageId = completion.messageId
      if (completed) {
        agentSessionService.scheduleSummaries(
          options.threadId,
          options.agentId,
          options.ownerId
        )
      }
    } else {
      completed = await persistence.complete(
        finalOutput,
        streamedResult.lastAgent?.name,
        streamedResult.lastResponseId
      )
    }
    if (!completed) {
      await flushPendingEmits()
      return
    }
    if (isPlanMode && structuredPlan) {
      emit(
        'response.plan_proposed',
        {
          response_id: options.runId,
          plan_message_id: planMessageId,
          plan_summary: structuredPlan.summary,
          plan_steps: structuredPlan.steps,
        },
        false
      )
    }
    if (structuredClarify) {
      // 推送澄清问题事件，前端据此渲染 ClarifyPanel 交互卡片
      emit(
        'response.clarify_created',
        {
          response_id: options.runId,
          clarify_message_id: planMessageId,
          clarify_question: structuredClarify.question,
          clarify_options: structuredClarify.options,
        },
        false
      )
    }
    emit('response.completed', {
      response_id: options.runId,
      // clarify 命中时不把工具返回的 JSON 当正文下发
      output_text: structuredClarify ? '' : finalOutput,
    })
    await flushPendingEmits()
    scheduleEventCleanup(options.runId)
  } catch (error) {
    const effectiveError = budget.normalizeError(error)
    const message = enrichAgentRunError(effectiveError)
    const callerCancelled = Boolean(options.signal?.aborted && !budget.exceeded)
    await closeExecutionEventFence()
    const terminalTransitioned = callerCancelled
      ? await new AgentRunPersistence(options.runId, options.lease).cancel(
          'Run cancelled'
        )
      : await new AgentRunPersistence(options.runId, options.lease).fail(
          message
        )

    // Only the worker that won the durable terminal CAS may publish the UI
    // failure. If completion already committed, Redis can rebuild from DB and
    // must never be overwritten by a late error projection.
    if (terminalTransitioned) {
      emit('response.failed', {
        response_id: options.runId,
        error: callerCancelled ? 'Run cancelled' : message,
      })
    }
    // Redis is a rebuildable projection. A failed emit must not skip DB state.
    await flushPendingEmits()
    scheduleEventCleanup(options.runId)
  } finally {
    budget.dispose()
    if (options.threadId) {
      WorkspaceManager.cleanupWorkspace(options.threadId)
    }
  }
}
