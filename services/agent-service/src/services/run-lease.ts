import { randomUUID } from 'node:crypto'
import { prisma } from './db.js'
import { enqueueOutboxEvent } from './outbox.js'
import { signSdkState, verifySdkState } from './sdk-state.js'

const DEFAULT_LEASE_MS = 30_000
const MIN_LEASE_MS = 5_000
const MAX_LEASE_MS = 5 * 60_000

export type RunLeaseStatus =
  'running' | 'completed' | 'failed' | 'expired' | 'suspended'

export interface RunLease {
  runId: string
  attemptId: string
  attempt: number
  workerId: string
  leaseToken: string
  fenceToken: number
  leaseExpiresAt: Date
}

export function getWorkerId() {
  const configured = process.env.AGENT_WORKER_ID?.trim()
  return configured || `${process.env.HOSTNAME || 'agent'}:${process.pid}`
}

function normalizeLeaseMs(value = DEFAULT_LEASE_MS) {
  if (!Number.isFinite(value)) return DEFAULT_LEASE_MS
  return Math.max(MIN_LEASE_MS, Math.min(MAX_LEASE_MS, Math.floor(value)))
}

function nextAttemptNumber(attempts: Array<{ attempt: number }>) {
  return (attempts[0]?.attempt ?? 0) + 1
}

/**
 * Claim a queued run and create its first durable attempt in one transaction.
 * The queued -> running CAS is the only path that may create a normal claim.
 */
export async function claimRunLease(
  runId: string,
  workerId = getWorkerId(),
  leaseMs = DEFAULT_LEASE_MS
): Promise<RunLease | null> {
  const duration = normalizeLeaseMs(leaseMs)
  return prisma.$transaction(async tx => {
    const claimed = await tx.agentRun.updateMany({
      where: { id: runId, status: 'queued' },
      data: { status: 'running', error: null, startedAt: new Date() },
    })
    if (claimed.count !== 1) return null

    const previous = await tx.agentRunAttempt.findMany({
      where: { runId },
      orderBy: { attempt: 'desc' },
      take: 1,
      select: { attempt: true },
    })
    const attempt = nextAttemptNumber(previous)
    const now = new Date()
    const leaseExpiresAt = new Date(now.getTime() + duration)
    const created = await tx.agentRunAttempt.create({
      data: {
        runId,
        attempt,
        workerId,
        leaseToken: randomUUID(),
        fenceToken: attempt,
        leaseExpiresAt,
        heartbeatAt: now,
        startedAt: now,
      },
    })
    return {
      runId,
      attemptId: created.id,
      attempt: created.attempt,
      workerId: created.workerId,
      leaseToken: created.leaseToken,
      fenceToken: created.fenceToken,
      leaseExpiresAt: created.leaseExpiresAt,
    }
  })
}

/**
 * Reclaim only an expired running attempt. This is deliberately separate from
 * queue delivery so an ordinary duplicate job can never steal a live lease.
 */
export async function reclaimExpiredRunLease(
  runId: string,
  workerId = getWorkerId(),
  leaseMs = DEFAULT_LEASE_MS
): Promise<RunLease | null> {
  const duration = normalizeLeaseMs(leaseMs)
  return prisma.$transaction(async tx => {
    const now = new Date()
    const latest = await tx.agentRunAttempt.findFirst({
      where: { runId, run: { status: 'running' } },
      orderBy: { attempt: 'desc' },
      select: { id: true, status: true, leaseExpiresAt: true },
    })
    if (!latest || latest.status !== 'running' || latest.leaseExpiresAt > now) {
      return null
    }
    const expired = await tx.agentRunAttempt.updateMany({
      where: {
        id: latest.id,
        runId,
        status: 'running',
        leaseExpiresAt: { lte: now },
        run: { status: 'running' },
      },
      data: { status: 'expired', completedAt: now },
    })
    if (expired.count !== 1) return null

    const run = await tx.agentRun.findUnique({
      where: { id: runId },
      select: { status: true },
    })
    if (run?.status !== 'running') return null
    const previous = await tx.agentRunAttempt.findMany({
      where: { runId },
      orderBy: { attempt: 'desc' },
      take: 1,
      select: { attempt: true },
    })
    const attempt = nextAttemptNumber(previous)
    const leaseExpiresAt = new Date(now.getTime() + duration)
    const created = await tx.agentRunAttempt.create({
      data: {
        runId,
        attempt,
        workerId,
        leaseToken: randomUUID(),
        fenceToken: attempt,
        leaseExpiresAt,
        heartbeatAt: now,
        startedAt: now,
      },
    })
    return {
      runId,
      attemptId: created.id,
      attempt: created.attempt,
      workerId: created.workerId,
      leaseToken: created.leaseToken,
      fenceToken: created.fenceToken,
      leaseExpiresAt: created.leaseExpiresAt,
    }
  })
}

export async function heartbeatRunLease(
  lease: RunLease,
  leaseMs = DEFAULT_LEASE_MS
) {
  const now = new Date()
  const leaseExpiresAt = new Date(now.getTime() + normalizeLeaseMs(leaseMs))
  const updated = await prisma.agentRunAttempt.updateMany({
    where: {
      id: lease.attemptId,
      runId: lease.runId,
      leaseToken: lease.leaseToken,
      fenceToken: lease.fenceToken,
      status: 'running',
      leaseExpiresAt: { gt: now },
      run: { status: 'running' },
    },
    data: { heartbeatAt: now, leaseExpiresAt },
  })
  if (updated.count !== 1) return false
  lease.leaseExpiresAt = leaseExpiresAt
  return true
}

export async function hasActiveRunLease(lease: RunLease) {
  const now = new Date()
  const found = await prisma.agentRunAttempt.findFirst({
    where: {
      id: lease.attemptId,
      runId: lease.runId,
      leaseToken: lease.leaseToken,
      fenceToken: lease.fenceToken,
      status: 'running',
      leaseExpiresAt: { gt: now },
      run: { status: 'running' },
    },
    select: { id: true },
  })
  return Boolean(found)
}

export async function getCurrentRunLease(
  runId: string
): Promise<RunLease | null> {
  const attempt = await prisma.agentRunAttempt.findFirst({
    where: { runId, status: 'running', run: { status: 'running' } },
    orderBy: { attempt: 'desc' },
  })
  if (!attempt || attempt.leaseExpiresAt <= new Date()) return null
  return {
    runId,
    attemptId: attempt.id,
    attempt: attempt.attempt,
    workerId: attempt.workerId,
    leaseToken: attempt.leaseToken,
    fenceToken: attempt.fenceToken,
    leaseExpiresAt: attempt.leaseExpiresAt,
  }
}

/**
 * Recover a run only when a durable SDK snapshot proves it can resume without
 * replaying an unknown external side effect. Legacy running rows fail closed.
 */
export async function requeueExpiredRun(runId: string) {
  return prisma.$transaction(async tx => {
    const now = new Date()
    const run = await tx.agentRun.findUnique({
      where: { id: runId },
      select: {
        status: true,
        agentId: true,
        sdkState: true,
        sdkStateHash: true,
        stateVersion: true,
      },
    })
    if (run?.status !== 'running') return 'none' as const
    const current = await tx.agentRunAttempt.findFirst({
      where: { runId, run: { status: 'running' } },
      orderBy: { attempt: 'desc' },
      select: { id: true, status: true, leaseExpiresAt: true },
    })
    if (!current) {
      const message = 'Historical running row has no durable execution attempt'
      const failed = await tx.agentRun.updateMany({
        where: { id: runId, status: 'running' },
        data: { status: 'failed', error: message, completedAt: now },
      })
      if (failed.count === 1) {
        await enqueueOutboxEvent(tx, {
          aggregateType: 'agent_run',
          aggregateId: runId,
          eventType: 'agent_run.failed',
          dedupeKey: `agent-run:${runId}:historical-running-without-attempt`,
          payload: { runId, error: message },
        })
      }
      return failed.count === 1 ? ('failed' as const) : ('none' as const)
    }
    if (current.status !== 'running' || current.leaseExpiresAt > now) {
      return 'none' as const
    }
    const expired = await tx.agentRunAttempt.updateMany({
      where: {
        id: current.id,
        runId,
        status: 'running',
        leaseExpiresAt: { lte: now },
        run: { status: 'running' },
      },
      data: { status: 'expired', completedAt: now },
    })
    if (expired.count !== 1) return 'none' as const
    if (
      !run.sdkState ||
      !verifySdkState(
        {
          runId,
          agentId: run.agentId,
          stateVersion: run.stateVersion,
          sdkState: run.sdkState,
        },
        run.sdkStateHash
      )
    ) {
      const message = run.sdkState
        ? 'Run lease expired with an invalid durable SDK snapshot'
        : 'Run lease expired without a durable SDK resume snapshot'
      const failed = await tx.agentRun.updateMany({
        where: { id: runId, status: 'running' },
        data: {
          status: 'failed',
          error: message,
          completedAt: now,
        },
      })
      if (failed.count === 1) {
        await enqueueOutboxEvent(tx, {
          aggregateType: 'agent_run',
          aggregateId: runId,
          eventType: 'agent_run.failed',
          dedupeKey: `agent-run:${runId}:lease-expired-state-${run.stateVersion}`,
          payload: { runId, error: message },
        })
      }
      return failed.count === 1 ? ('failed' as const) : ('none' as const)
    }
    const nextStateVersion = run.stateVersion + 1
    const nextStateHash = signSdkState({
      runId,
      agentId: run.agentId,
      stateVersion: nextStateVersion,
      sdkState: run.sdkState,
    })
    const queued = await tx.agentRun.updateMany({
      where: {
        id: runId,
        status: 'running',
        stateVersion: run.stateVersion,
      },
      data: {
        status: 'queued',
        error: null,
        stateVersion: nextStateVersion,
        sdkStateHash: nextStateHash,
      },
    })
    return queued.count === 1 ? ('queued' as const) : ('none' as const)
  })
}

export async function failExpiredRunWithoutResume(runId: string) {
  return prisma.$transaction(async tx => {
    const now = new Date()
    const run = await tx.agentRun.findUnique({
      where: { id: runId },
      select: { status: true },
    })
    if (run?.status !== 'running') return false
    const current = await tx.agentRunAttempt.findFirst({
      where: { runId, run: { status: 'running' } },
      orderBy: { attempt: 'desc' },
      select: { id: true, status: true, leaseExpiresAt: true },
    })
    if (
      current &&
      (current.status !== 'running' || current.leaseExpiresAt > now)
    ) {
      return false
    }
    if (current) {
      await tx.agentRunAttempt.updateMany({
        where: {
          id: current.id,
          status: 'running',
          leaseExpiresAt: { lte: now },
        },
        data: { status: 'expired', completedAt: now },
      })
    }
    const failed = await tx.agentRun.updateMany({
      where: { id: runId, status: 'running' },
      data: {
        status: 'failed',
        error: 'Run lease expired without a durable SDK resume snapshot',
        completedAt: now,
      },
    })
    if (failed.count === 1) {
      await enqueueOutboxEvent(tx, {
        aggregateType: 'agent_run',
        aggregateId: runId,
        eventType: 'agent_run.failed',
        dedupeKey: `agent-run:${runId}:active-delivery-lease-expired`,
        payload: {
          runId,
          error: 'Run lease expired while a queue delivery was still active',
        },
      })
    }
    return failed.count === 1
  })
}

/** Use this condition on every terminal/output mutation. */
export function runLeaseWhere(
  lease: RunLease,
  status: RunLeaseStatus = 'running'
) {
  return {
    id: lease.runId,
    status: 'running' as const,
    attempts: {
      some: {
        id: lease.attemptId,
        runId: lease.runId,
        leaseToken: lease.leaseToken,
        fenceToken: lease.fenceToken,
        status,
      },
    },
  }
}

/**
 * Fences an attempt before its run terminal state is written. Once this CAS
 * succeeds, a later worker cannot transition the same attempt or run again.
 */
export async function transitionRunLease(
  lease: RunLease,
  status: Exclude<RunLeaseStatus, 'running'>
) {
  const now = new Date()
  const updated = await prisma.agentRunAttempt.updateMany({
    where: {
      id: lease.attemptId,
      runId: lease.runId,
      leaseToken: lease.leaseToken,
      fenceToken: lease.fenceToken,
      status: 'running',
      leaseExpiresAt: { gt: now },
      run: { status: 'running' },
    },
    data: { status, completedAt: now },
  })
  return updated.count === 1
}

export function leaseDurationMs() {
  const raw = Number(process.env.AGENT_RUN_LEASE_MS || DEFAULT_LEASE_MS)
  return normalizeLeaseMs(raw)
}
