import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { config } from '../config/index.js'
import { logger } from '../config/logger.js'
import { safeJsonStringify } from '../utils/json.js'
import { agentSessionService } from '../services/session.js'
import { agentRuntimeService } from '../services/runtime.js'
import { createAgentRun } from '../services/persistence.js'
import { enqueueAgentRun } from '../services/run-queue.js'

const A2A_OWNER_ID = 'a2a-external'
const A2A_SEND_TIMEOUT_MS = 120_000
const A2A_POLL_INTERVAL_MS = 1_500

export const a2aRouter = new Hono()

// ---------- 鉴权（Bearer，独立于 Better Auth cookie 通道） ----------

a2aRouter.use('*', async (c, next) => {
  if (!config.a2aApiKey) {
    return c.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'A2A endpoint is disabled (A2A_API_KEY not configured)' } },
      503
    )
  }
  const header = c.req.header('Authorization') || ''
  if (header !== `Bearer ${config.a2aApiKey}`) {
    return c.json(
      { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Unauthorized' } },
      401
    )
  }
  await next()
})

// ---------- Agent Card ----------

a2aRouter.get('/.well-known/agent-card.json', async c => {
  const agentId = await agentRuntimeService.getDefaultAgentId()
  const agent = agentId
    ? await prisma.agent.findUnique({
        where: { id: agentId },
        select: { name: true, description: true },
      })
    : null

  const baseUrl = config.a2aPublicBaseUrl || new URL(c.req.url).origin + '/a2a'
  return c.json({
    name: agent?.name || 'Telos Agent',
    description:
      agent?.description ||
      'Telos agent-service: a tool-using AI agent with skills, plans, web search and file workspaces.',
    url: baseUrl,
    version: '1.0.0',
    protocolVersion: '0.3.0',
    preferredTransport: 'JSONRPC',
    capabilities: {
      streaming: false,
      pushNotifications: false,
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [
      {
        id: 'telos-agent',
        name: agent?.name || 'Telos Agent',
        description:
          'General-purpose agent: answers questions, runs tools (web search, image generation, file workspaces) and streams progress.',
        tags: ['agent', 'chat', 'tools'],
      },
    ],
    securitySchemes: {
      bearer: { type: 'http', scheme: 'bearer' },
    },
    security: [{ bearer: [] }],
  })
})

// ---------- 纯函数助手（供单测） ----------

export function extractTextFromA2AMessage(params: unknown): string {
  if (!params || typeof params !== 'object') return ''
  const message = (params as Record<string, unknown>).message
  if (!message || typeof message !== 'object') return ''
  const parts = (message as Record<string, unknown>).parts
  if (!Array.isArray(parts)) return ''
  return parts
    .map(part =>
      part && typeof part === 'object'
        ? (part as Record<string, unknown>).text
        : undefined
    )
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0)
    .join('\n')
    .trim()
}

export function mapRunStatusToA2AState(status: string): string {
  switch (status) {
    case 'queued':
      return 'submitted'
    case 'running':
      return 'working'
    case 'awaiting_approval':
      return 'input-required'
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'cancelled':
      return 'canceled'
    default:
      return 'working'
  }
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function buildTask(run: {
  id: string
  threadId: string | null
  status: string
  finalOutput: string | null
  error: string | null
}) {
  const state = mapRunStatusToA2AState(run.status)
  const status: Record<string, unknown> = {
    state,
    timestamp: new Date().toISOString(),
  }
  const task: Record<string, unknown> = {
    kind: 'task',
    id: run.id,
    contextId: run.threadId,
    status,
  }
  if (state === 'completed' && run.finalOutput?.trim()) {
    task.artifacts = [
      {
        artifactId: `${run.id}-response`,
        name: 'response',
        parts: [{ kind: 'text', text: run.finalOutput }],
      },
    ]
  }
  if (state === 'failed' && run.error) {
    status.message = { kind: 'text', text: run.error, role: 'agent' }
  }
  return task
}

async function waitForRunTerminal(runId: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        threadId: true,
        status: true,
        finalOutput: true,
        error: true,
      },
    })
    if (!run) return null
    if (
      run.status === 'completed' ||
      run.status === 'failed' ||
      run.status === 'cancelled'
    ) {
      return run
    }
    await new Promise(resolve => setTimeout(resolve, A2A_POLL_INTERVAL_MS))
  }
  return null
}

// ---------- JSON-RPC 方法 ----------

async function handleTaskGet(id: unknown, params: unknown) {
  const taskId =
    params && typeof params === 'object'
      ? String((params as Record<string, unknown>).id ?? '')
      : ''
  if (!taskId) {
    return jsonRpcError(id, -32602, 'params.id is required')
  }
  const run = await prisma.agentRun.findFirst({
    where: { id: taskId, thread: { ownerId: A2A_OWNER_ID } },
    select: {
      id: true,
      threadId: true,
      status: true,
      finalOutput: true,
      error: true,
    },
  })
  if (!run) {
    return jsonRpcError(id, -32001, 'Task not found')
  }
  return { jsonrpc: '2.0', id, result: buildTask(run) }
}

async function handleMessageSend(id: unknown, params: unknown) {
  const input = extractTextFromA2AMessage(params)
  if (!input) {
    return jsonRpcError(id, -32602, 'message.parts must contain a text part')
  }

  const agentId = await agentRuntimeService.getDefaultAgentId()
  if (!agentId) {
    return jsonRpcError(id, -32000, 'Default agent not found')
  }

  const thread = await agentSessionService.ensureThread({
    agentId,
    ownerId: A2A_OWNER_ID,
    firstInput: input,
    metadata: { source: 'a2a' },
  })
  await agentSessionService.appendUserMessage(thread.id, input, [])
  const run = await createAgentRun({
    agentId,
    threadId: thread.id,
    input: { effectiveInput: input },
    metadata: { source: 'a2a' },
  })
  if (!run) {
    return jsonRpcError(id, -32000, 'Failed to create run')
  }
  try {
    await enqueueAgentRun({
      runId: run.id,
      agentId,
      threadId: thread.id,
      input,
      ownerId: A2A_OWNER_ID,
      userId: A2A_OWNER_ID,
    })
  } catch (error) {
    logger.error({ msg: 'A2A run enqueue failed', runId: run.id, error })
    return jsonRpcError(id, -32000, 'Failed to enqueue run')
  }

  const terminal = await waitForRunTerminal(run.id, A2A_SEND_TIMEOUT_MS)
  if (!terminal) {
    // 超时：任务仍在跑，返回 working 状态 + taskId 供 tasks/get 轮询
    return {
      jsonrpc: '2.0',
      id,
      result: {
        kind: 'task',
        id: run.id,
        contextId: thread.id,
        status: {
          state: 'working',
          timestamp: new Date().toISOString(),
          message: {
            kind: 'text',
            role: 'agent',
            text: 'Task is still running; poll with tasks/get.',
          },
        },
      },
    }
  }
  return { jsonrpc: '2.0', id, result: buildTask(terminal) }
}

a2aRouter.post('/', async c => {
  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return c.json(jsonRpcError(null, -32700, 'Parse error'))
  }
  const rpcId = body.id ?? null
  const method = typeof body.method === 'string' ? body.method : ''

  try {
    if (method === 'message/send') {
      return c.json(await handleMessageSend(rpcId, body.params))
    }
    if (method === 'tasks/get') {
      return c.json(await handleTaskGet(rpcId, body.params))
    }
    return c.json(jsonRpcError(rpcId, -32601, `Method not found: ${method}`))
  } catch (error) {
    logger.error({ msg: 'A2A request failed', method, error })
    return c.json(jsonRpcError(rpcId, -32000, 'Internal error'))
  }
})
