import { parseExplicitSkillTrigger } from '../services/skill-loader.js'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { fail, ok, parseJson } from '../http/response.js'
import { createAgentRun } from '../services/persistence.js'
import { agentSessionService } from '../services/session.js'
import { PlanStore } from '../services/plan-store.js'
import { normalizeUserImageParts } from '../services/image-input.js'
import {
  decidePlan,
  markPlanExecutionStarted,
  persistPlanExecution,
  PlanStateError,
  resolveApprovedPlanForExecution,
} from '../services/plan-state.js'
import { extractPromptFromBody } from '../services/runtime-input.js'
import { prisma } from '../services/db.js'
import { findEnabledChatModel, listChatModels } from '../services/chat.js'
import { toSnakeCase } from '../utils/serializer.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import {
  findAccessibleAgent,
  findDefaultAccessibleAgent,
} from '../services/agent-access.js'
import { enqueueAgentRun } from '../services/run-queue.js'
import { canReplaceLatestAssistant } from '../services/chat-retry.js'

export const chatRouter = new Hono()

async function handleChat(c: Context) {
  const body = await parseJson(c)
  const input = extractPromptFromBody(body)
  if (!input) return fail(c, 400, '消息不能为空')

  // A run id is an opaque server-owned execution identity.  Reusing one from
  // the request used to let a caller enqueue an existing run with a new
  // payload (and, before the ownership checks below, another user's run).
  // Retries have their own owner-checked retryRunId flow; normal chat always
  // creates a fresh run.
  if (typeof body.runId === 'string' && body.runId.trim()) {
    return fail(c, 400, 'Client-supplied runId is not supported')
  }

  // Validate all request-owned execution controls before creating a thread or
  // appending a user message, so a rejected request leaves no orphan state.
  const requestedModelOverride =
    typeof body.model === 'string' && body.model.trim()
      ? body.model.trim()
      : null
  let modelOverride: string | null = null
  if (requestedModelOverride) {
    const enabledModel = await findEnabledChatModel(requestedModelOverride)
    if (!enabledModel) return fail(c, 400, 'Requested model is not enabled')
    modelOverride = enabledModel.model
  }
  const reasoningEffort =
    body.reasoningEffort === 'minimal' ||
    body.reasoningEffort === 'low' ||
    body.reasoningEffort === 'medium' ||
    body.reasoningEffort === 'high'
      ? body.reasoningEffort
      : null
  const planMode =
    body.planMode === 'plan' || body.planMode === 'execute'
      ? body.planMode
      : undefined
  const approvedPlanMessageId =
    typeof body.approvedPlanMessageId === 'string'
      ? body.approvedPlanMessageId.trim()
      : ''
  if (planMode === 'execute' && !approvedPlanMessageId) {
    return fail(c, 400, 'execute plan mode requires an approvedPlanMessageId')
  }
  let normalizedImages: ReturnType<typeof normalizeUserImageParts>
  try {
    normalizedImages = normalizeUserImageParts(body.images)
  } catch (error) {
    return fail(
      c,
      400,
      error instanceof Error ? error.message : 'Image attachments are invalid'
    )
  }

  // 解析显式 skill 触发（对标 Codex 的 $skill-name 语法）。
  // 若触发，剥离前缀，用户看到 / 落库的是纯净消息，skill 全文由 runtime 注入。
  const { skillName: parsedSkillName, message: skillMessage } =
    parseExplicitSkillTrigger(input)
  let forceSkillName = parsedSkillName
  let effectiveInput = forceSkillName ? skillMessage : input

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

  let approvedPlan = null
  if (planMode === 'execute') {
    try {
      approvedPlan = await resolveApprovedPlanForExecution(
        approvedPlanMessageId,
        ownerId,
        typeof body.threadId === 'string' ? body.threadId : null
      )
    } catch (error) {
      if (error instanceof PlanStateError) {
        return fail(c, error.status, error.message)
      }
      throw error
    }
  }
  const thread = await agentSessionService.ensureThread({
    agentId,
    threadId:
      approvedPlan?.threadId ??
      (typeof body.threadId === 'string' ? body.threadId : null),
    ownerId,
    firstInput: effectiveInput,
    metadata: { source: 'chat' },
  })
  const retryRunId =
    typeof body.retryRunId === 'string' && body.retryRunId.trim()
      ? body.retryRunId.trim()
      : null
  let replaceAssistantMessageId: string | null = null
  let userMessage

  if (retryRunId) {
    const retryRun = await prisma.agentRun.findFirst({
      where: {
        id: retryRunId,
        threadId: thread.id,
        agentId,
      },
      select: {
        status: true,
        metadata: true,
      },
    })
    if (!retryRun) return fail(c, 404, 'Retry run not found')
    if (
      retryRun.status === 'queued' ||
      retryRun.status === 'running' ||
      retryRun.status === 'awaiting_approval'
    ) {
      return fail(c, 409, 'Run is still in progress')
    }

    const retryMetadata =
      retryRun.metadata && typeof retryRun.metadata === 'object'
        ? (retryRun.metadata as Record<string, unknown>)
        : {}
    const retryUserMessageId =
      typeof retryMetadata.userMessageId === 'string'
        ? retryMetadata.userMessageId
        : ''
    const previousReplacementMessageId =
      typeof retryMetadata.replaceAssistantMessageId === 'string'
        ? retryMetadata.replaceAssistantMessageId
        : null
    if (!retryUserMessageId) {
      return fail(c, 409, 'Run cannot be retried safely')
    }

    const retryUserMessage = await prisma.agentMessage.findFirst({
      where: {
        id: retryUserMessageId,
        threadId: thread.id,
        role: 'user',
      },
    })
    if (!retryUserMessage) {
      return fail(c, 409, 'Retry user message not found')
    }

    const laterUserMessage = await prisma.agentMessage.findFirst({
      where: {
        threadId: thread.id,
        role: 'user',
        sequence: { gt: retryUserMessage.sequence },
      },
      select: { id: true },
    })
    if (laterUserMessage) {
      return fail(c, 409, 'Only the latest turn can be retried')
    }

    const latestAssistantMessage = await prisma.agentMessage.findFirst({
      where: {
        threadId: thread.id,
        role: 'assistant',
        sequence: { gt: retryUserMessage.sequence },
      },
      orderBy: { sequence: 'desc' },
      select: { id: true, runId: true },
    })
    if (
      !canReplaceLatestAssistant(
        latestAssistantMessage,
        retryRunId,
        previousReplacementMessageId
      )
    ) {
      return fail(c, 409, 'Only the latest answer can be retried')
    }
    replaceAssistantMessageId = latestAssistantMessage?.id ?? null
    userMessage = retryUserMessage
    effectiveInput = retryUserMessage.content
    forceSkillName =
      typeof retryMetadata.forceSkillName === 'string'
        ? retryMetadata.forceSkillName
        : null
  } else if (planMode === 'execute' && approvedPlan) {
    const planMessage = await prisma.agentMessage.findUnique({
      where: { id: approvedPlan.messageId },
      select: { sequence: true },
    })
    userMessage = planMessage
      ? await prisma.agentMessage.findFirst({
          where: {
            threadId: thread.id,
            role: 'user',
            sequence: { lt: planMessage.sequence },
          },
          orderBy: { sequence: 'desc' },
        })
      : null
    if (!userMessage) {
      return fail(c, 409, 'The plan source message is no longer available')
    }
    effectiveInput = userMessage.content
  } else {
    userMessage = await agentSessionService.appendUserMessage(
      thread.id,
      effectiveInput,
      normalizedImages
    )
  }
  const run = await createAgentRun({
    agentId,
    threadId: thread.id,
    input: {
      effectiveInput,
      model: modelOverride,
      reasoningEffort,
      planMode,
    },
    metadata: {
      source: 'chat',
      userMessageId: userMessage.id,
      approvedPlan,
      approvedPlanMessageId: approvedPlan?.messageId ?? null,
      forceSkillName: forceSkillName || null,
      retryOfRunId: retryRunId,
      replaceAssistantMessageId,
    },
  })

  if (!run) return fail(c, 404, 'Run not found')

  if (approvedPlan) {
    try {
      await markPlanExecutionStarted(approvedPlan.messageId, ownerId, run.id)
    } catch (error) {
      await prisma.agentRun.updateMany({
        where: { id: run.id, status: 'queued' },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      })
      if (error instanceof PlanStateError) {
        return fail(c, error.status, error.message)
      }
      throw error
    }
  }

  try {
    await enqueueAgentRun({
      runId: run.id,
      agentId,
      threadId: thread.id,
      input: effectiveInput,
      ownerId,
      modelOverride,
      reasoningEffort,
      planMode,
      approvedPlan,
      approvedPlanMessageId: approvedPlan?.messageId,
      forceSkillName: forceSkillName || undefined,
      replaceAssistantMessageId,
      userId: ownerId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await prisma.agentRun.updateMany({
      where: { id: run.id, status: 'queued' },
      data: { status: 'failed', error: message, completedAt: new Date() },
    })
    if (approvedPlan) {
      await persistPlanExecution(
        approvedPlan.messageId,
        run.id,
        approvedPlan.stepStatuses,
        'failed'
      ).catch(() => undefined)
    }
    throw error
  }

  return ok(c, { run_id: run.id, thread_id: thread.id, status: 'queued' }, 202)
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

chatRouter.get('/threads/:id/runs', async c => {
  const threadId = c.req.param('id')
  const ownerId = getCurrentUserId(c)
  const thread = await prisma.agentThread.findFirst({
    where: {
      id: threadId,
      ownerId,
      status: { not: 'deleted' },
    },
    select: { id: true },
  })
  if (!thread) return fail(c, 404, 'Thread not found')

  const runs = await prisma.agentRun.findMany({
    where: { threadId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      agentId: true,
      threadId: true,
      status: true,
      startedAt: true,
      completedAt: true,
      partialOutput: true,
      partialParts: true,
    },
  })
  return ok(c, toSnakeCase(runs))
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

chatRouter.patch('/messages/:messageId/clarify', async c => {
  const messageId = c.req.param('messageId')
  const body = await parseJson(c)
  const selectedOption = String(body.selectedOption || '')

  const message = await prisma.agentMessage.findFirst({
    where: {
      id: messageId,
      thread: { ownerId: getCurrentUserId(c) },
    },
  })
  if (!message) return fail(c, 404, 'Message not found')

  const parts = Array.isArray(message.parts) ? message.parts : []
  const newParts = parts.map((part: any) => {
    if (part && part.type === 'clarify' && part.clarify) {
      return {
        ...part,
        clarify: {
          ...part.clarify,
          status: 'answered',
          selectedOption,
        },
      }
    }
    return part
  })

  await prisma.agentMessage.update({
    where: { id: messageId },
    data: { parts: newParts as any },
  })

  return ok(c, { success: true })
})

chatRouter.patch('/messages/:messageId/plan', async c => {
  const messageId = c.req.param('messageId')
  const body = await parseJson(c)
  const decision = body.decision
  if (decision !== 'approved' && decision !== 'rejected') {
    return fail(c, 400, 'decision must be approved or rejected')
  }

  try {
    const plan = await decidePlan(messageId, getCurrentUserId(c), decision)
    return ok(c, { success: true, plan: toSnakeCase(plan) })
  } catch (error) {
    if (error instanceof PlanStateError) {
      return fail(c, error.status, error.message)
    }
    throw error
  }
})
