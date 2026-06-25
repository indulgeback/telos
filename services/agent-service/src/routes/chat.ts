import type { Context } from 'hono'
import { Hono } from 'hono'
import { fail, ok, parseJson } from '../http/response.js'
import { createAgentRun } from '../services/persistence.js'
import { agentSessionService } from '../services/session.js'
import { PlanStore } from '../services/plan-store.js'
import type { StructuredPlan } from '../services/plan-tools.js'

/**
 * 解析请求体中的 approvedPlan（可能是 JSON 字符串或对象）为 StructuredPlan。
 */
function parseApprovedPlan(raw: unknown): StructuredPlan | null {
  if (!raw) return null
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (
      obj &&
      typeof obj === 'object' &&
      typeof (obj as any).summary === 'string' &&
      Array.isArray((obj as any).steps)
    ) {
      return obj as StructuredPlan
    }
  } catch {
    // 解析失败返回 null
  }
  return null
}
import {
  agentRuntimeService,
  extractPromptFromBody,
  parseExplicitSkillTrigger,
} from '../services/runtime.js'
import { prisma } from '../services/db.js'
import { listChatModels } from '../services/chat.js'
import { toSnakeCase } from '../utils/serializer.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import { safeJsonStringify } from '../utils/json.js'
import {
  findAccessibleAgent,
  findDefaultAccessibleAgent,
} from '../services/agent-access.js'

export const chatRouter = new Hono()

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

type OpenAiStyleStreamEvent = Record<string, unknown> & { type: string }
type OpenAiStyleStreamWriter = (
  type: string,
  event?: Record<string, unknown>
) => void

function createOpenAiStyleStreamResponse(
  signal: AbortSignal,
  execute: (write: OpenAiStyleStreamWriter) => Promise<void>
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write: OpenAiStyleStreamWriter = (type, event = {}) => {
        const payload: OpenAiStyleStreamEvent = { ...event, type }
        controller.enqueue(
          encoder.encode(
            `event: ${type}\ndata: ${safeJsonStringify(payload)}\n\n`
          )
        )
      }

      const abortHandler = () => {
        try {
          controller.close()
        } catch {
          // noop
        }
      }
      signal.addEventListener('abort', abortHandler, { once: true })

      try {
        await execute(write)
      } catch (error) {
        write('response.failed', {
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        signal.removeEventListener('abort', abortHandler)
        try {
          controller.close()
        } catch {
          // noop
        }
      }
    },
    cancel() {
      // The request abort signal handles runtime cancellation.
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function createAgentStreamResponse(
  c: Context,
  params: {
    agentId: string
    runId: string
    input: string
    threadId?: string | null
    ownerId?: string | null
    modelOverride?: string | null
    reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | null
    runtimeInput?: any
    memoryInstructions?: string
    planMode?: 'plan' | 'execute'
    approvedPlan?: StructuredPlan | null
    planStore?: PlanStore
    forceSkillName?: string
    userId?: string
  }
) {
  const abortController = new AbortController()
  c.req.raw.signal.addEventListener('abort', () => abortController.abort())

  return createOpenAiStyleStreamResponse(
    abortController.signal,
    async write => {
      const textId = `text-${params.runId}`
      const activeToolCalls = new Map<string, string>()
      const assistantParts: PersistedAssistantPart[] = []
      try {
        write('agent.run.created', {
          data: {
            threadId: params.threadId,
            runId: params.runId,
            agentId: params.agentId,
          },
        })
        write('response.in_progress', {
          response_id: params.runId,
        })

        // execute 阶段：创建 PlanStore，模型调用 update_plan_status 时通过 SSE 推送进度
        let planStore: PlanStore | undefined
        if (params.planMode === 'execute' && params.approvedPlan) {
          planStore = new PlanStore(params.approvedPlan, update => {
            write('response.plan_step_updated', {
              response_id: params.runId,
              step_index: update.step_index,
              plan_step_status: update.status,
              note: update.note,
            })
          })
          params.planStore = planStore
        }
        const { result, persistence } = await agentRuntimeService.run(
          params.agentId,
          {
            runId: params.runId,
            input: params.runtimeInput ?? params.input,
            threadId: params.threadId,
            stream: true,
            signal: abortController.signal,
            modelOverride: params.modelOverride,
            reasoningEffort: params.reasoningEffort,
            memoryInstructions: params.memoryInstructions,
            planMode: params.planMode,
            approvedPlan: params.approvedPlan,
            planStore: params.planStore,
            forceSkillName: params.forceSkillName,
            userId: params.userId,
            onEvent: event => {
              if (event.type === 'tool_start') {
                const toolCallId = toolCallIdFromPayload(event.payload)
                const toolName = toolNameFromPayload(event.payload)
                const input = toolInputFromPayload(event.payload)
                activeToolCalls.set(toolName, toolCallId)
                write('response.output_item.added', {
                  response_id: params.runId,
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
                  write('response.function_call_arguments.delta', {
                    response_id: params.runId,
                    item_id: toolCallId,
                    output_index: activeToolCalls.size - 1,
                    toolCallId,
                    toolName,
                    delta: inputText,
                    inputTextDelta: inputText,
                  })
                }
                write('response.function_call_arguments.done', {
                  response_id: params.runId,
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
                write('agent.tool_call.output', {
                  response_id: params.runId,
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
                write('agent.handoff', {
                  data: event.payload,
                })
              }
            },
          }
        )
        const streamedResult = result as any

        let finalText = ''
        let textStarted = false
        const reasoningId = `reasoning-${params.runId}`
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
            if (!reasoningStarted) {
              reasoningStarted = true
            }
            write('response.reasoning.delta', {
              response_id: params.runId,
              id: reasoningId,
              delta: reasoningDeltaResult.delta,
            })
            appendReasoningPart(assistantParts, reasoningDeltaResult.delta)
          }

          const value = extractTextDeltaFromStreamEvent(event)
          if (!value) continue
          finalText += value
          if (!textStarted) {
            write('response.output_text.start', {
              response_id: params.runId,
              id: textId,
            })
            textStarted = true
          }
          write('response.output_text.delta', {
            response_id: params.runId,
            id: textId,
            delta: value,
          })
          appendTextPart(assistantParts, value)
        }

        await streamedResult.completed
        if (textStarted) {
          write('response.output_text.done', {
            response_id: params.runId,
            id: textId,
          })
        }
        if (reasoningStarted) {
          write('response.reasoning.done', {
            response_id: params.runId,
            id: reasoningId,
          })
        }

        const finalOutput = String(streamedResult.finalOutput ?? finalText)
        await persistence.complete(
          finalOutput,
          streamedResult.lastAgent?.name,
          streamedResult.lastResponseId
        )
        // 计划模式：从 runtime 的 pendingPlanCache 取出模型通过 create_plan 产出的结构化计划
        const isPlanMode = params.planMode === 'plan'
        let planMessageId: string | undefined
        const structuredPlan = isPlanMode
          ? agentRuntimeService.consumePendingPlan(params.runId)
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
        if (params.threadId) {
          const savedMessage = await agentSessionService.appendAssistantMessage(
            params.threadId,
            params.runId,
            finalOutput,
            assistantParts
          )
          planMessageId = savedMessage?.id
          agentSessionService.scheduleSummaries(
            params.threadId,
            params.agentId,
            params.ownerId
          )
        }
        if (isPlanMode && structuredPlan) {
          // 推送结构化计划（summary + steps），前端据此渲染计划气泡
          write('response.plan_proposed', {
            response_id: params.runId,
            plan_message_id: planMessageId,
            plan_summary: structuredPlan.summary,
            plan_steps: structuredPlan.steps,
          })
        }
        // execute 阶段兜底收尾：把残留的 in_progress 标记为 completed，
        // pending 标记为 skipped，防止模型忘记标记最后一步
        if (planStore) {
          planStore.finalize()
        }
        // 兜底：把所有未完成的 tool part（input-streaming/input-available）
        // 强制标记为 output-available 并补发 SSE 事件。
        // 解决 stopAtToolNames 导致 run 提前结束时 tool_end 事件丢失的问题。
        for (const part of assistantParts) {
          if (
            part.type === 'tool' &&
            part.state !== 'output-available' &&
            part.state !== 'output-error'
          ) {
            part.state = 'output-available'
            write('agent.tool_call.output', {
              response_id: params.runId,
              item_id: part.toolCallId,
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              output: '(completed)',
            })
          }
        }
        write('response.completed', {
          response_id: params.runId,
          output_text: finalOutput,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        write('response.failed', {
          response_id: params.runId,
          error: message,
        })
        const { AgentRunPersistence } = await import(
          '../services/persistence.js'
        )
        await new AgentRunPersistence(params.runId).fail(error)
      } finally {
        if (params.threadId) {
          const { WorkspaceManager } = await import('../services/workspace.js')
          WorkspaceManager.cleanupWorkspace(params.threadId)
        }
      }
    }
  )
}

async function handleChat(c: Context) {
  const body = await parseJson(c)
  const input = extractPromptFromBody(body)
  if (!input) return fail(c, 400, '消息不能为空')

  // 解析显式 skill 触发（对标 Codex 的 $skill-name 语法）。
  // 若触发，剥离前缀，用户看到 / 落库的是纯净消息，skill 全文由 runtime 注入。
  const { skillName: forceSkillName, message: skillMessage } =
    parseExplicitSkillTrigger(input)
  const effectiveInput = forceSkillName ? skillMessage : input

  const ownerId = getCurrentUserId(c)
  const defaultAgent =
    typeof body.agentId === 'string' && body.agentId.trim()
      ? null
      : await findDefaultAccessibleAgent(ownerId)
  const agentId =
    typeof body.agentId === 'string' && body.agentId.trim()
      ? body.agentId.trim()
      : defaultAgent?.id
  if (!agentId) return fail(c, 400, '未配置默认 Agent')

  const agent = await findAccessibleAgent(agentId, ownerId)
  if (!agent) return fail(c, 404, 'Agent 不存在')

  const thread = await agentSessionService.ensureThread({
    agentId,
    threadId: typeof body.threadId === 'string' ? body.threadId : null,
    ownerId,
    firstInput: effectiveInput,
    metadata: { source: 'chat' },
  })
  const userMessage = await agentSessionService.appendUserMessage(
    thread.id,
    effectiveInput,
    Array.isArray(body.images) ? body.images : []
  )
  const runtimeContext = await agentSessionService.buildRuntimeInput(thread.id)

  const run = body.runId
    ? await prisma.agentRun.findUnique({ where: { id: String(body.runId) } })
    : await createAgentRun({
        agentId,
        threadId: thread.id,
        input: body,
        metadata: { source: 'chat', userMessageId: userMessage.id },
      })

  if (!run) return fail(c, 404, 'Run not found')

  return createAgentStreamResponse(c, {
    agentId,
    runId: run.id,
    input: effectiveInput,
    threadId: thread.id,
    ownerId,
    runtimeInput: runtimeContext.input,
    memoryInstructions: runtimeContext.memoryInstructions,
    modelOverride:
      typeof body.model === 'string' && body.model.trim()
        ? body.model.trim()
        : null,
    reasoningEffort:
      body.reasoningEffort === 'minimal' ||
      body.reasoningEffort === 'low' ||
      body.reasoningEffort === 'medium' ||
      body.reasoningEffort === 'high'
        ? body.reasoningEffort
        : null,
    planMode:
      body.planMode === 'plan' || body.planMode === 'execute'
        ? body.planMode
        : undefined,
    approvedPlan: parseApprovedPlan(body.approvedPlan),
    forceSkillName: forceSkillName || undefined,
    userId: ownerId,
  })
}

chatRouter.get('/threads', async c => {
  const agentId = c.req.query('agentId') || c.req.query('agent_id') || null
  const ownerId = getCurrentUserId(c)
  return ok(
    c,
    toSnakeCase(
      await agentSessionService.listThreads({
        agentId,
        ownerId,
      })
    )
  )
})

chatRouter.post('/threads', async c => {
  const body = await parseJson(c)
  const ownerId = getCurrentUserId(c)
  const defaultAgent =
    typeof body.agentId === 'string' && body.agentId.trim()
      ? null
      : await findDefaultAccessibleAgent(ownerId)
  const agentId =
    typeof body.agentId === 'string' && body.agentId.trim()
      ? body.agentId.trim()
      : defaultAgent?.id
  if (!agentId) return fail(c, 400, '未配置默认 Agent')
  const agent = await findAccessibleAgent(agentId, ownerId)
  if (!agent) return fail(c, 404, 'Agent 不存在')

  const thread = await agentSessionService.createThread({
    agentId,
    ownerId,
    title: typeof body.title === 'string' ? body.title : undefined,
    metadata: body.metadata,
  })
  return ok(c, toSnakeCase(thread), 201)
})

chatRouter.get('/threads/:id/messages', async c => {
  return ok(
    c,
    toSnakeCase(
      await agentSessionService.listMessagesForOwner(
        c.req.param('id'),
        getCurrentUserId(c)
      )
    )
  )
})

chatRouter.patch('/threads/:id', async c => {
  const body = await parseJson(c)
  return ok(
    c,
    toSnakeCase(
      await agentSessionService.updateThread(
        c.req.param('id'),
        body,
        getCurrentUserId(c)
      )
    )
  )
})

chatRouter.delete('/threads/:id', async c => {
  await agentSessionService.deleteThread(c.req.param('id'), getCurrentUserId(c))
  return ok(c, { deleted: true })
})

chatRouter.post('/', handleChat)

chatRouter.post('/chat', handleChat)

chatRouter.get('/models', async c => {
  return ok(c, await listChatModels())
})

chatRouter.get('/health', c => {
  return c.json({
    status: 'healthy',
    time: new Date().toISOString(),
    service: 'agent-service',
  })
})

chatRouter.get('/ready', c => c.json({ status: 'ready' }))

chatRouter.get('/info', c => {
  return c.json({
    service: 'agent-service',
    version: '1.0.0',
    framework: 'hono + openai-agents-sdk',
  })
})
