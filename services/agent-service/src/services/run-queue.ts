import { Queue } from 'bullmq'
import { prisma } from './db.js'
import { config, logger } from '../config/index.js'
import { markRunCancelled } from './run-events.js'
import type { StructuredPlan } from './plan-tools.js'
import { AgentRunPersistence } from './persistence.js'

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
  approvedPlanMessageId?: string
  forceSkillName?: string
  replaceAssistantMessageId?: string | null
  userId?: string
}

export const QUEUE_NAME = 'agent-runs'
export function buildRedisConnectionOptions() {
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
export function getAgentRunQueue() {
  if (!queue) {
    queue = new Queue<AgentRunJobData, void, 'run'>(QUEUE_NAME, {
      connection: { ...connection, maxRetriesPerRequest: 1 },
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    })
  }
  return queue
}

export function queueJobId(runId: string, stateVersion: number) {
  return stateVersion > 0 ? `${runId}-state-${stateVersion}` : runId
}

export async function enqueueAgentRun(data: AgentRunJobData) {
  const q = getAgentRunQueue()
  const run = await prisma.agentRun.findUnique({
    where: { id: data.runId },
    select: { stateVersion: true },
  })
  if (!run) throw new Error(`Agent run not found: ${data.runId}`)
  const jobId = queueJobId(data.runId, run.stateVersion)
  const existing = await q.getJob(jobId)
  if (existing) return existing
  // Redis carries only an opaque execution identity. The worker reconstructs
  // every executable parameter from the durable, owner-bound DB snapshot.
  return q.add('run', { runId: data.runId } as AgentRunJobData, {
    jobId,
  })
}

export async function cancelAgentRun(runId: string, reason = 'Run cancelled') {
  // The DB transition is authoritative. Redis/local cancellation accelerates
  // abortion of the worker but must not be able to make cancellation fail.
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { stateVersion: true },
  })
  if (!run) return false
  const cancelled = await new AgentRunPersistence(runId).cancel(reason)
  if (!cancelled) return false

  try {
    await markRunCancelled(runId, reason)
  } catch (error) {
    logger.warn({
      msg: 'Unable to persist run cancellation marker',
      runId,
      error,
    })
  }

  try {
    const job = await getAgentRunQueue().getJob(
      queueJobId(runId, run.stateVersion)
    )
    if (job) {
      const state = await job.getState()
      if (
        state === 'waiting' ||
        state === 'delayed' ||
        state === 'prioritized'
      ) {
        await job.remove()
      }
    }
  } catch (error) {
    logger.warn({ msg: 'Unable to remove cancelled queue job', runId, error })
  }

  return true
}

export async function isAgentRunQueueReady() {
  try {
    const client = await getAgentRunQueue().client
    if (client.status !== 'ready') return false
    await getAgentRunQueue().getJobCounts('waiting')
    return true
  } catch {
    return false
  }
}

export async function closeAgentRunQueue() {
  await queue?.close()
  queue = null
}
