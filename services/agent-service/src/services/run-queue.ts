import { Queue, Worker, type Job } from 'bullmq'
import { prisma } from './db.js'
import { config, logger } from '../config/index.js'
import { agentSessionService } from './session.js'
import { executeAgentRun } from './run-executor.js'
import { appendRunUiEvent, cleanupRunEvents } from './run-events.js'
import type { StructuredPlan } from './plan-tools.js'

export interface AgentRunJobData {
  runId: string
  agentId: string
  threadId: string
  ownerId?: string | null
  input: string
  modelOverride?: string | null
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | null
  planMode?: 'plan' | 'execute'
  approvedPlan?: StructuredPlan | null
  forceSkillName?: string
  replaceAssistantMessageId?: string | null
  userId?: string
}

const QUEUE_NAME = 'agent-runs'
const activeControllers = new Map<string, AbortController>()

function buildRedisConnectionOptions() {
  const url = new URL(config.redisUrl)
  const db = url.pathname.replace(/^\//, '')
  return {
    host: url.hostname || 'localhost',
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: db ? Number(db) : undefined,
    maxRetriesPerRequest: null,
  }
}

const connection = buildRedisConnectionOptions()

let queue: Queue<AgentRunJobData, void, 'run'> | null = null
let worker: Worker<AgentRunJobData, void, 'run'> | null = null

export function getAgentRunQueue() {
  if (!queue) {
    queue = new Queue<AgentRunJobData, void, 'run'>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    })
  }
  return queue
}

export async function enqueueAgentRun(data: AgentRunJobData) {
  const q = getAgentRunQueue()
  const existing = await q.getJob(data.runId)
  if (existing) return existing
  return q.add('run', data, {
    jobId: data.runId,
  })
}

async function processAgentRun(job: Job<AgentRunJobData>) {
  const data = job.data
  const run = await prisma.agentRun.findUnique({ where: { id: data.runId } })
  if (!run || run.status === 'cancelled') return

  await prisma.agentRun.update({
    where: { id: data.runId },
    data: { status: 'running', error: null },
  })

  const controller = new AbortController()
  activeControllers.set(data.runId, controller)

  try {
    const runtimeContext = await agentSessionService.buildRuntimeInput(
      data.threadId,
      { excludeMessageId: data.replaceAssistantMessageId }
    )
    await executeAgentRun({
      ...data,
      runtimeInput: runtimeContext.input,
      memoryInstructions: runtimeContext.memoryInstructions,
      signal: controller.signal,
      persistEvents: true,
    })
  } finally {
    activeControllers.delete(data.runId)
  }
}

async function recoverQueuedRuns() {
  const restarting = await prisma.agentRun.findMany({
    where: { status: 'running' },
    select: { id: true },
  })
  await prisma.agentRun.updateMany({
    where: { status: 'running' },
    data: { status: 'queued' },
  })
  // 重跑前清掉上一轮的残留事件流，避免回放时新旧两轮事件混排
  for (const run of restarting) {
    void cleanupRunEvents(run.id)
  }

  const runs = await prisma.agentRun.findMany({
    where: { status: 'queued' },
    include: {
      thread: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  for (const run of runs) {
    const input = run.input as Record<string, unknown>
    const metadata = run.metadata as Record<string, unknown>
    if (!run.threadId || !run.thread) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          error: 'Queued run is missing its thread context',
          completedAt: new Date(),
        },
      })
      continue
    }

    await enqueueAgentRun({
      runId: run.id,
      agentId: run.agentId,
      threadId: run.threadId,
      ownerId: run.thread.ownerId,
      input:
        typeof input.effectiveInput === 'string' ? input.effectiveInput : '',
      modelOverride:
        typeof input.model === 'string' && input.model.trim()
          ? input.model
          : null,
      reasoningEffort:
        input.reasoningEffort === 'minimal' ||
        input.reasoningEffort === 'low' ||
        input.reasoningEffort === 'medium' ||
        input.reasoningEffort === 'high'
          ? input.reasoningEffort
          : null,
      planMode:
        input.planMode === 'plan' || input.planMode === 'execute'
          ? input.planMode
          : undefined,
      approvedPlan:
        metadata.approvedPlan && typeof metadata.approvedPlan === 'object'
          ? (metadata.approvedPlan as StructuredPlan)
          : null,
      forceSkillName:
        typeof metadata.forceSkillName === 'string'
          ? metadata.forceSkillName
          : undefined,
      replaceAssistantMessageId:
        typeof metadata.replaceAssistantMessageId === 'string'
          ? metadata.replaceAssistantMessageId
          : null,
      userId: run.thread.ownerId ?? undefined,
    })
  }
}

export async function startAgentRunWorker() {
  if (worker) return worker

  worker = new Worker<AgentRunJobData, void, 'run'>(
    QUEUE_NAME,
    processAgentRun,
    {
      connection,
      concurrency: config.agentRunWorkerConcurrency,
    }
  )

  worker.on('failed', async (job, error) => {
    const runId = job?.data.runId
    logger.error({
      msg: 'Agent run worker job failed',
      runId,
      error: error instanceof Error ? error.message : String(error),
    })
    if (runId) {
      await prisma.agentRun.updateMany({
        where: { id: runId, status: { notIn: ['completed', 'cancelled'] } },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      })
      await appendRunUiEvent(runId, 'response.failed', {
        response_id: runId,
        error: error instanceof Error ? error.message : String(error),
      })
      void cleanupRunEvents(runId)
    }
  })

  worker.on('error', error => {
    logger.error({
      msg: 'Agent run worker error',
      error: error instanceof Error ? error.message : String(error),
    })
  })

  await recoverQueuedRuns()
  logger.info({
    msg: 'Agent run worker started',
    queue: QUEUE_NAME,
    concurrency: config.agentRunWorkerConcurrency,
  })
  return worker
}

export async function cancelAgentRun(runId: string, reason = 'Run cancelled') {
  activeControllers.get(runId)?.abort(reason)

  const job = await getAgentRunQueue().getJob(runId)
  if (job) {
    const state = await job.getState()
    if (state === 'waiting' || state === 'delayed' || state === 'prioritized') {
      await job.remove()
    }
  }

  await prisma.agentRun.updateMany({
    where: { id: runId, status: { in: ['queued', 'running'] } },
    data: {
      status: 'cancelled',
      error: reason,
      completedAt: new Date(),
    },
  })
  await appendRunUiEvent(runId, 'response.failed', {
    response_id: runId,
    error: reason,
  })
  void cleanupRunEvents(runId)
}

export async function closeAgentRunWorker() {
  await worker?.close()
  await queue?.close()
  worker = null
  queue = null
}
