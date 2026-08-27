import { Queue, Worker, type Job } from 'bullmq'
import { prisma } from './db.js'
import { config, logger } from '../config/index.js'
import { agentSessionService } from './session.js'
import { executeAgentRun } from './run-executor.js'
import {
  appendRunUiEvent,
  isRunCancelled,
  markRunCancelled,
} from './run-events.js'
import type { StructuredPlan } from './plan-tools.js'
import { AgentRunPersistence } from './persistence.js'
import {
  canStartRun,
  canonicalizeRunExecution,
  isUnsafeRunRedelivery,
} from './run-state.js'
import {
  claimRunLease,
  failExpiredRunWithoutResume,
  getWorkerId,
  getCurrentRunLease,
  heartbeatRunLease,
  leaseDurationMs,
  requeueExpiredRun,
  type RunLease,
} from './run-lease.js'
import { enqueueOutboxEvent } from './outbox.js'

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
const activeLeases = new Map<string, RunLease>()

export function getActiveRunLease(runId: string) {
  return activeLeases.get(runId)
}

async function appendRunUiEventBestEffort(
  runId: string,
  type: string,
  payload: Record<string, unknown>
) {
  try {
    await appendRunUiEvent(runId, type, payload)
  } catch (error) {
    logger.warn({
      msg: 'Unable to append run UI projection',
      runId,
      type,
      error,
    })
  }
}

export {
  canRecoverRunningRun,
  canStartRun,
  isTerminalRunStatus,
} from './run-state.js'

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
let recoveryTimer: ReturnType<typeof setInterval> | null = null
let recoveryInFlight: Promise<void> | null = null

async function failQueuedRun(runId: string, error: string, dedupeKey: string) {
  return prisma.$transaction(async tx => {
    const failed = await tx.agentRun.updateMany({
      where: { id: runId, status: 'queued' },
      data: { status: 'failed', error, completedAt: new Date() },
    })
    if (failed.count === 1) {
      await enqueueOutboxEvent(tx, {
        aggregateType: 'agent_run',
        aggregateId: runId,
        eventType: 'agent_run.failed',
        dedupeKey,
        payload: { runId, error },
      })
    }
    return failed.count === 1
  })
}

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

async function processAgentRun(job: Job<AgentRunJobData>) {
  const runId = job.data.runId
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { thread: { select: { ownerId: true } } },
  })
  if (!run) return

  if (isUnsafeRunRedelivery(run.status)) {
    // A running row belongs to its durable attempt. A duplicate delivery must
    // not fail or steal it; lease expiry/recovery is an explicit operation.
    logger.warn({ msg: 'Ignoring duplicate delivery for running run', runId })
    return
  }
  if (!canStartRun(run.status)) return

  const data = canonicalizeRunExecution(run)
  if (!data) {
    const error = 'Queued run has invalid persisted execution context'
    if (
      await failQueuedRun(runId, error, `agent-run:${runId}:invalid-context`)
    ) {
      await appendRunUiEventBestEffort(runId, 'response.failed', {
        response_id: runId,
        error,
      })
    }
    return
  }

  // Multiple replicas can receive the same BullMQ delivery after a stall or
  // an operator retry. The DB CAS and attempt creation happen atomically.
  const lease = await claimRunLease(runId, getWorkerId(), leaseDurationMs())
  if (!lease) return

  const controller = new AbortController()
  activeControllers.set(runId, controller)
  activeLeases.set(runId, lease)

  // Cancellation may have committed after the claim but before the local
  // controller was registered. Re-read the DB truth before starting tools.
  const claimedRun = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { status: true },
  })
  if (claimedRun?.status !== 'running') {
    activeControllers.delete(runId)
    activeLeases.delete(runId)
    return
  }

  const cancellationPoller = setInterval(() => {
    void Promise.all([
      isRunCancelled(runId).catch(error => {
        logger.warn({
          msg: 'Unable to read run cancellation marker',
          runId,
          error,
        })
        return false
      }),
      prisma.agentRun.findUnique({
        where: { id: runId },
        select: { status: true },
      }),
    ])
      .then(([cancelled, latest]) => {
        if (cancelled || latest?.status === 'cancelled') {
          controller.abort('Run cancelled')
        }
      })
      .catch(error => {
        logger.warn({
          msg: 'Unable to verify distributed run cancellation',
          runId,
          error,
        })
      })
  }, 1_000)
  const heartbeatPoller = setInterval(
    () => {
      void heartbeatRunLease(lease, leaseDurationMs())
        .then(active => {
          if (!active) {
            logger.error({ msg: 'Run lease lost; aborting execution', runId })
            controller.abort('Run lease lost')
          }
        })
        .catch(error => {
          logger.error({ msg: 'Unable to heartbeat run lease', runId, error })
          controller.abort('Run lease heartbeat failed')
        })
    },
    Math.max(1_000, Math.floor(leaseDurationMs() / 3))
  )

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
      // run-executor/runtime consume this lease in the Phase 2 integration;
      // keep the queue payload itself runId-only across BullMQ.
      lease,
    } as any)
  } finally {
    clearInterval(cancellationPoller)
    clearInterval(heartbeatPoller)
    activeControllers.delete(runId)
    activeLeases.delete(runId)
  }
}

export async function recoverQueuedRuns() {
  const q = getAgentRunQueue()
  const restarting = await prisma.agentRun.findMany({
    where: { status: 'running' },
    select: { id: true, stateVersion: true },
  })

  // A live DB lease, not a BullMQ state snapshot, proves ownership. Expired
  // runs may only be requeued when a durable SDK snapshot exists.
  for (const run of restarting) {
    if (await getCurrentRunLease(run.id)) continue
    const latestJob = await q.getJob(queueJobId(run.id, run.stateVersion))
    const latestState = latestJob ? await latestJob.getState() : null
    // A stale active job can still contain an external side effect in flight;
    // do not start another attempt while it exists. Fail closed instead.
    if (latestState === 'active') {
      const failed = await failExpiredRunWithoutResume(run.id)
      if (failed) {
        await appendRunUiEventBestEffort(run.id, 'response.failed', {
          response_id: run.id,
          error: 'Run lease expired while a queue delivery was still active',
        })
      }
      continue
    }
    const recovered = await requeueExpiredRun(run.id)
    if (recovered === 'failed') {
      const latest = await prisma.agentRun.findUnique({
        where: { id: run.id },
        select: { error: true },
      })
      await appendRunUiEventBestEffort(run.id, 'response.failed', {
        response_id: run.id,
        error:
          latest?.error ||
          'Run lease expired without a durable SDK resume snapshot',
      })
    }
  }

  const runs = await prisma.agentRun.findMany({
    where: { status: 'queued' },
    include: {
      thread: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  for (const run of runs) {
    const existingJob = await q.getJob(queueJobId(run.id, run.stateVersion))
    if (existingJob) {
      const state = await existingJob.getState()
      if (
        state === 'waiting' ||
        state === 'delayed' ||
        state === 'prioritized' ||
        state === 'active'
      ) {
        continue
      }
      // A queued DB row with a terminal/unknown queue job cannot be safely
      // replayed because the original delivery may already have side effects.
      const error = `Queue job is not recoverable (state: ${state})`
      if (
        await failQueuedRun(
          run.id,
          error,
          `agent-run:${run.id}:unrecoverable-queue-state:${run.stateVersion}`
        )
      ) {
        await appendRunUiEventBestEffort(run.id, 'response.failed', {
          response_id: run.id,
          error,
        })
      }
      continue
    }
    const data = canonicalizeRunExecution(run)
    if (!data) {
      const error = 'Queued run is missing its canonical execution context'
      if (
        await failQueuedRun(
          run.id,
          error,
          `agent-run:${run.id}:missing-canonical-context`
        )
      ) {
        await appendRunUiEventBestEffort(run.id, 'response.failed', {
          response_id: run.id,
          error,
        })
      }
      continue
    }

    await enqueueAgentRun({
      ...data,
    })
  }
}

export async function startAgentRunWorker() {
  if (worker) return worker

  // Recover before starting this replica's Worker. Otherwise a newly claimed
  // job can become `running` between the active-job snapshot and DB scan and
  // be falsely marked failed by recovery.
  await recoverQueuedRuns()

  worker = new Worker<AgentRunJobData, void, 'run'>(
    QUEUE_NAME,
    processAgentRun,
    {
      connection,
      concurrency: config.agentRunWorkerConcurrency,
    }
  )

  worker.on('failed', (job, error) => {
    // EventEmitter does not observe a returned Promise. Keep the async work
    // explicitly contained so a transient database failure cannot become an
    // unhandled rejection that destabilizes the worker process.
    void (async () => {
      const runId = job?.data.runId
      logger.error({
        msg: 'Agent run worker job failed',
        runId,
        error: error instanceof Error ? error.message : String(error),
      })
      // The attempt may already have expired and been reclaimed by another
      // worker. Never write a terminal state from a BullMQ failure callback
      // without the matching lease/fence token.
    })().catch(handlerError => {
      logger.error({
        msg: 'Failed to persist worker failure state',
        runId: job?.data.runId,
        error:
          handlerError instanceof Error
            ? handlerError.message
            : String(handlerError),
      })
    })
  })

  worker.on('error', error => {
    logger.error({
      msg: 'Agent run worker error',
      error: error instanceof Error ? error.message : String(error),
    })
  })

  const recoveryInterval = Math.max(
    5_000,
    Math.min(60_000, Math.floor(leaseDurationMs() / 2))
  )
  recoveryTimer = setInterval(() => {
    if (recoveryInFlight) return
    recoveryInFlight = recoverQueuedRuns()
      .catch(error => {
        logger.error({ msg: 'Periodic run recovery failed', error })
      })
      .finally(() => {
        recoveryInFlight = null
      })
  }, recoveryInterval)
  recoveryTimer.unref?.()

  logger.info({
    msg: 'Agent run worker started',
    queue: QUEUE_NAME,
    concurrency: config.agentRunWorkerConcurrency,
  })
  return worker
}

/**
 * Readiness is intentionally stricter than process liveness: the API should
 * not advertise itself as ready to accept new runs until the local worker and
 * its Redis connection are both active.
 */
export async function isAgentRunWorkerReady() {
  if (!worker?.isRunning()) return false
  try {
    const client = await worker.client
    return client.status === 'ready'
  } catch {
    return false
  }
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

  activeControllers.get(runId)?.abort(reason)

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

export async function closeAgentRunWorker() {
  if (recoveryTimer) {
    clearInterval(recoveryTimer)
    recoveryTimer = null
  }
  await recoveryInFlight?.catch(() => undefined)
  recoveryInFlight = null
  await worker?.close()
  await queue?.close()
  worker = null
  queue = null
}
