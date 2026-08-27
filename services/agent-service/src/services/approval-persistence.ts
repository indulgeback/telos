import { randomUUID } from 'node:crypto'
import { prisma } from './db.js'
import { enqueueOutboxEvent } from './outbox.js'
import {
  canonicalizeToolArguments,
  hashToolArguments,
} from './tool-checkpoint.js'
import { type RunLease } from './run-lease.js'
import { signSdkState } from './sdk-state.js'

const MAX_SDK_STATE_BYTES = 2_000_000
const MAX_PARTIAL_OUTPUT_BYTES = 2_000_000

export interface SuspendForApprovalInput {
  ownerId: string
  approvals: Array<{
    toolCallId: string
    toolName: string
    arguments: unknown
    idempotencyKey?: string
  }>
  sdkState: string
  partialOutput?: string | null
  partialParts?: unknown
  expiresAt: Date
  outboxPayload?: unknown
}

export interface DurableApprovalDecision {
  approvalId: string
  callId: string
  toolName: string
  arguments: unknown
  argumentsHash: string
  status: 'approved' | 'denied' | 'expired'
}

/**
 * Atomically fences the worker, stores the SDK RunState snapshot, creates the
 * tool checkpoint + owner-bound approval, and emits a durable wakeup event.
 */
export async function suspendRunForApproval(
  lease: RunLease,
  input: SuspendForApprovalInput
) {
  if (Buffer.byteLength(input.sdkState, 'utf8') > MAX_SDK_STATE_BYTES) {
    throw new Error('SDK state snapshot exceeds the durable size limit')
  }
  if (
    input.partialOutput &&
    Buffer.byteLength(input.partialOutput, 'utf8') > MAX_PARTIAL_OUTPUT_BYTES
  ) {
    throw new Error('Partial output exceeds the durable size limit')
  }
  const partialParts = input.partialParts ?? []
  if (
    Buffer.byteLength(JSON.stringify(partialParts) ?? 'null', 'utf8') >
    MAX_PARTIAL_OUTPUT_BYTES
  ) {
    throw new Error('Partial output parts exceed the durable size limit')
  }
  if (input.approvals.length < 1 || input.approvals.length > 20) {
    throw new Error('Approval batch must contain between 1 and 20 tool calls')
  }
  if (!input.ownerId.trim()) throw new Error('Approval owner is required')
  if (
    new Set(input.approvals.map(item => item.toolCallId)).size !==
    input.approvals.length
  ) {
    throw new Error('Approval batch contains duplicate tool call ids')
  }

  return prisma.$transaction(async tx => {
    const fenced = await tx.agentRunAttempt.updateMany({
      where: {
        id: lease.attemptId,
        runId: lease.runId,
        leaseToken: lease.leaseToken,
        fenceToken: lease.fenceToken,
        status: 'running',
        leaseExpiresAt: { gt: new Date() },
        run: { status: 'running' },
      },
      data: { status: 'suspended', completedAt: new Date() },
    })
    if (fenced.count !== 1) return false

    const persisted: Array<{
      callId: string
      toolCallId: string
      approvalId: string
      toolName: string
      arguments: unknown
      expiresAt: Date
    }> = []
    for (const requested of input.approvals) {
      const argumentsHash = hashToolArguments(requested.arguments)
      const idempotencyKey =
        requested.idempotencyKey?.trim() ||
        `${lease.runId}:${requested.toolCallId}`
      const call = await tx.agentToolCall.create({
        data: {
          runId: lease.runId,
          attemptId: lease.attemptId,
          callId: requested.toolCallId,
          toolName: requested.toolName,
          argumentsHash,
          arguments: (requested.arguments ?? null) as any,
          idempotencyKey,
          status: 'pending_approval',
          sideEffect: true,
        },
      })
      const approval = await tx.agentToolApproval.create({
        data: {
          runId: lease.runId,
          toolCallId: call.id,
          ownerId: input.ownerId,
          toolName: requested.toolName,
          argumentsHash,
          status: 'pending',
          expiresAt: input.expiresAt,
        },
      })
      persisted.push({
        callId: requested.toolCallId,
        toolCallId: call.id,
        approvalId: approval.id,
        toolName: requested.toolName,
        arguments: requested.arguments ?? null,
        expiresAt: input.expiresAt,
      })
    }

    const run = await tx.agentRun.updateMany({
      where: {
        id: lease.runId,
        status: 'running',
        attempts: {
          some: {
            id: lease.attemptId,
            status: 'suspended',
            leaseToken: lease.leaseToken,
            fenceToken: lease.fenceToken,
          },
        },
      },
      data: {
        status: 'awaiting_approval',
        sdkState: input.sdkState,
        partialOutput: input.partialOutput ?? null,
        partialParts: partialParts as any,
        stateVersion: { increment: 1 },
      },
    })
    if (run.count !== 1)
      throw new Error('Run was changed while suspending for approval')
    const snapshot = await tx.agentRun.findUnique({
      where: { id: lease.runId },
      select: { agentId: true, stateVersion: true },
    })
    if (!snapshot) throw new Error('Suspended run disappeared before signing')
    const sdkStateHash = signSdkState({
      runId: lease.runId,
      agentId: snapshot.agentId,
      stateVersion: snapshot.stateVersion,
      sdkState: input.sdkState,
    })
    const signed = await tx.agentRun.updateMany({
      where: {
        id: lease.runId,
        status: 'awaiting_approval',
        stateVersion: snapshot.stateVersion,
        sdkState: input.sdkState,
      },
      data: { sdkStateHash },
    })
    if (signed.count !== 1) {
      throw new Error('Suspended SDK state changed before it could be signed')
    }

    await enqueueOutboxEvent(tx, {
      aggregateType: 'agent_run',
      aggregateId: lease.runId,
      eventType: 'agent_run.awaiting_approval',
      dedupeKey: `agent-run:${lease.runId}:approval-batch:${lease.attemptId}`,
      payload: input.outboxPayload ?? {
        runId: lease.runId,
        approvals: persisted.map(item => ({
          id: item.approvalId,
          tool_call_id: item.callId,
          tool_name: item.toolName,
          arguments: item.arguments,
          expires_at: item.expiresAt.toISOString(),
        })),
      },
    })

    return persisted
  })
}

/** Decisions are database authority; serialized SDK state is never trusted. */
export async function loadApprovalDecisionsForRun(
  lease: RunLease
): Promise<DurableApprovalDecision[]> {
  const rows = await prisma.agentToolApproval.findMany({
    where: {
      runId: lease.runId,
      status: { in: ['approved', 'denied', 'expired'] },
      run: {
        status: 'running',
        attempts: {
          some: {
            id: lease.attemptId,
            leaseToken: lease.leaseToken,
            fenceToken: lease.fenceToken,
            status: 'running',
            leaseExpiresAt: { gt: new Date() },
          },
        },
      },
    },
    include: {
      toolCall: {
        select: {
          callId: true,
          toolName: true,
          arguments: true,
          argumentsHash: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(row => ({
    approvalId: row.id,
    callId: row.toolCall.callId,
    toolName: row.toolCall.toolName,
    arguments: row.toolCall.arguments,
    argumentsHash: row.argumentsHash,
    status: row.status as DurableApprovalDecision['status'],
  }))
}

export async function queueRunWhenApprovalBatchIsComplete(
  tx: any,
  runId: string,
  now: Date
) {
  // Approval decisions update individual rows before reaching this helper.
  // Lock the run before inspecting siblings so concurrent final decisions
  // cannot both observe a still-pending sibling and leave the run suspended.
  await tx.$queryRaw`
    SELECT id
      FROM agent_runs
     WHERE id = ${runId}
     FOR UPDATE
  `

  // Expired siblings in the same interruption batch are denied explicitly so
  // one forgotten prompt cannot leave the SDK RunState suspended forever.
  const expired = await tx.agentToolApproval.findMany({
    where: { runId, status: 'pending', expiresAt: { lte: now } },
    select: { id: true, toolCallId: true },
    take: 20,
  })
  for (const item of expired) {
    await tx.agentToolApproval.updateMany({
      where: { id: item.id, status: 'pending' },
      data: { status: 'expired', decidedAt: now },
    })
    await tx.agentToolCall.updateMany({
      where: { id: item.toolCallId, status: 'pending_approval' },
      data: { status: 'denied', error: 'Tool call approval expired' },
    })
  }
  const pending = await tx.agentToolApproval.count({
    where: { runId, status: 'pending' },
  })
  if (pending !== 0) return false
  const queued = await tx.agentRun.updateMany({
    where: { id: runId, status: 'awaiting_approval' },
    data: { status: 'queued' },
  })
  if (queued.count !== 1) return false
  await enqueueOutboxEvent(tx, {
    aggregateType: 'agent_run',
    aggregateId: runId,
    eventType: 'agent_run.approval_decided',
    dedupeKey: `agent-run:${runId}:approval-batch:${now.getTime()}`,
    payload: { runId, decision: 'batch_complete' },
  })
  return true
}

/** Owner-bound approval decision. Approval never executes a tool itself. */
export async function decideToolApproval(
  approvalId: string,
  ownerId: string,
  decision: 'approved' | 'denied'
) {
  return prisma.$transaction(async tx => {
    const now = new Date()
    const approval = await tx.agentToolApproval.findFirst({
      where: { id: approvalId, ownerId, status: 'pending' },
      select: { id: true, runId: true, toolCallId: true, expiresAt: true },
    })
    if (!approval || approval.expiresAt <= now) {
      if (approval) {
        await tx.agentToolApproval.updateMany({
          where: { id: approval.id, status: 'pending' },
          data: { status: 'expired', decidedAt: now },
        })
        await tx.agentToolCall.updateMany({
          where: { id: approval.toolCallId, status: 'pending_approval' },
          data: { status: 'denied', error: 'Tool call approval expired' },
        })
        await queueRunWhenApprovalBatchIsComplete(tx, approval.runId, now)
      }
      return false
    }
    const updated = await tx.agentToolApproval.updateMany({
      where: { id: approval.id, ownerId, status: 'pending' },
      data: { status: decision, decidedAt: now },
    })
    if (updated.count !== 1) return false
    await tx.agentToolCall.updateMany({
      where: { id: approval.toolCallId, status: 'pending_approval' },
      data: { status: decision === 'approved' ? 'prepared' : 'denied' },
    })
    await queueRunWhenApprovalBatchIsComplete(tx, approval.runId, now)
    return true
  })
}

export async function decideRunToolApproval(
  runId: string,
  approvalId: string,
  ownerId: string,
  decision: 'approved' | 'denied'
) {
  const belongsToRun = await prisma.agentToolApproval.findFirst({
    where: { id: approvalId, runId, ownerId },
    select: { id: true },
  })
  if (!belongsToRun) return false
  return decideToolApproval(approvalId, ownerId, decision)
}

export async function listPendingToolApprovals(runId: string, ownerId: string) {
  const rows = await prisma.agentToolApproval.findMany({
    where: {
      runId,
      ownerId,
      status: 'pending',
      expiresAt: { gt: new Date() },
      run: { status: 'awaiting_approval' },
    },
    include: {
      toolCall: {
        select: {
          callId: true,
          toolName: true,
          arguments: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(row => ({
    id: row.id,
    tool_call_id: row.toolCall.callId,
    tool_name: row.toolCall.toolName,
    arguments: row.toolCall.arguments,
    expires_at: row.expiresAt.toISOString(),
  }))
}

/** Expire a pending approval and resume the SDK with an explicit denial. */
export async function expireToolApproval(approvalId: string) {
  return prisma.$transaction(async tx => {
    const now = new Date()
    const approval = await tx.agentToolApproval.findFirst({
      where: { id: approvalId, status: 'pending', expiresAt: { lte: now } },
      select: { id: true, runId: true, toolCallId: true },
    })
    if (!approval) return false
    const updated = await tx.agentToolApproval.updateMany({
      where: { id: approval.id, status: 'pending' },
      data: { status: 'expired', decidedAt: now },
    })
    if (updated.count !== 1) return false
    await tx.agentToolCall.updateMany({
      where: { id: approval.toolCallId, status: 'pending_approval' },
      data: { status: 'denied', error: 'Tool call approval expired' },
    })
    await queueRunWhenApprovalBatchIsComplete(tx, approval.runId, now)
    return true
  })
}

export async function expirePendingToolApprovals(limit = 50) {
  const rows = await prisma.agentToolApproval.findMany({
    where: { status: 'pending', expiresAt: { lte: new Date() } },
    orderBy: { expiresAt: 'asc' },
    take: Math.max(1, Math.min(200, Math.floor(limit))),
    select: { id: true },
  })
  let expired = 0
  for (const row of rows) {
    if (await expireToolApproval(row.id)) expired += 1
  }
  return expired
}

/** Clear the SDK snapshot only after a new leased attempt has resumed it. */
export async function clearSdkStateForLease(lease: RunLease) {
  const updated = await prisma.agentRun.updateMany({
    where: {
      id: lease.runId,
      status: 'running',
      attempts: {
        some: {
          id: lease.attemptId,
          leaseToken: lease.leaseToken,
          fenceToken: lease.fenceToken,
          status: 'running',
        },
      },
    },
    data: { sdkState: null, sdkStateHash: null },
  })
  return updated.count === 1
}

export function stableApprovalArguments(value: unknown) {
  return canonicalizeToolArguments(value)
}

export function newApprovalId() {
  return randomUUID()
}
