import { createHash } from 'node:crypto'
import { prisma } from './db.js'
import { hasActiveRunLease, type RunLease } from './run-lease.js'

export type ToolCheckpointStatus =
  'prepared' | 'running' | 'completed' | 'failed' | 'denied'

export interface PrepareToolCallInput {
  callId: string
  toolName: string
  arguments: unknown
  idempotencyKey?: string
  sideEffect?: boolean
}

export function canonicalizeToolArguments(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    return encoded === undefined ? 'null' : encoded
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalizeToolArguments(item)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map(
      key => `${JSON.stringify(key)}:${canonicalizeToolArguments(record[key])}`
    )
    .join(',')}}`
}

export function hashToolArguments(value: unknown) {
  return createHash('sha256')
    .update(canonicalizeToolArguments(value))
    .digest('hex')
}

function uniqueViolation(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (error as { code?: string }).code === 'P2002'
  )
}

/**
 * Prepare is idempotent: a retry gets the original record, while a reused
 * idempotency key with different arguments is rejected by hash comparison.
 */
export async function prepareToolCall(
  lease: RunLease,
  input: PrepareToolCallInput
) {
  if (!(await hasActiveRunLease(lease))) {
    throw new Error('Run lease is not active')
  }
  const argumentsHash = hashToolArguments(input.arguments)
  const idempotencyKey =
    input.idempotencyKey?.trim() || `${lease.runId}:${input.callId}`
  try {
    return await prisma.agentToolCall.create({
      data: {
        runId: lease.runId,
        attemptId: lease.attemptId,
        callId: input.callId,
        toolName: input.toolName,
        argumentsHash,
        arguments: input.arguments as any,
        idempotencyKey,
        sideEffect: input.sideEffect ?? false,
      },
    })
  } catch (error) {
    if (!uniqueViolation(error)) throw error
    const existing = await prisma.agentToolCall.findUnique({
      where: { idempotencyKey },
    })
    if (
      !existing ||
      existing.runId !== lease.runId ||
      existing.callId !== input.callId ||
      existing.toolName !== input.toolName ||
      existing.argumentsHash !== argumentsHash ||
      existing.sideEffect !== (input.sideEffect ?? false)
    ) {
      throw new Error(
        'Tool idempotency key was reused with different arguments'
      )
    }
    return existing
  }
}

/** Claim a prepared checkpoint. Completed checkpoints are replay-safe. */
export async function claimToolCall(lease: RunLease, id: string) {
  if (!(await hasActiveRunLease(lease))) {
    throw new Error('Run lease is not active')
  }
  const existing = await prisma.agentToolCall.findFirst({
    where: { id, runId: lease.runId },
    include: { approval: { select: { status: true } } },
  })
  if (!existing) throw new Error('Tool checkpoint not found')
  if (existing.status === 'completed') return 'completed' as const
  if (
    existing.status === 'prepared' &&
    existing.approval &&
    existing.approval.status !== 'approved'
  ) {
    throw new Error('Tool checkpoint is not approved')
  }
  // One SQL statement both validates the current lease/fence and rebinds a
  // checkpoint created by the prior suspended attempt. This removes the
  // lease-check/update TOCTOU window before an external side effect starts.
  const claimed = await prisma.$executeRaw`
    UPDATE agent_tool_calls AS tool_call
       SET attempt_id = ${lease.attemptId},
           status = 'running',
           started_at = CURRENT_TIMESTAMP,
           error = NULL,
           updated_at = CURRENT_TIMESTAMP
     WHERE tool_call.id = ${id}
       AND tool_call.run_id = ${lease.runId}
       AND tool_call.status = 'prepared'
       AND EXISTS (
         SELECT 1
           FROM agent_run_attempts AS attempt
           JOIN agent_runs AS run ON run.id = attempt.run_id
          WHERE attempt.id = ${lease.attemptId}
            AND attempt.run_id = ${lease.runId}
            AND attempt.lease_token = ${lease.leaseToken}
            AND attempt.fence_token = ${lease.fenceToken}
            AND attempt.status = 'running'
            AND attempt.lease_expires_at > CURRENT_TIMESTAMP
            AND run.status = 'running'
       )
  `
  if (claimed === 1) return 'claimed' as const
  if (existing?.status === 'running') {
    throw new Error('Tool checkpoint is already running')
  }
  throw new Error('Tool checkpoint is not claimable by this lease')
}

export async function completeToolCall(
  lease: RunLease,
  id: string,
  result: unknown
) {
  const encodedResult = JSON.stringify(result === undefined ? null : result)
  if (encodedResult === undefined) {
    throw new Error('Tool result is not JSON serializable')
  }
  const updated = await prisma.$executeRaw`
    UPDATE agent_tool_calls AS tool_call
       SET status = 'completed',
           result = CAST(${encodedResult} AS jsonb),
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
     WHERE tool_call.id = ${id}
       AND tool_call.run_id = ${lease.runId}
       AND tool_call.attempt_id = ${lease.attemptId}
       AND tool_call.status = 'running'
       AND EXISTS (
         SELECT 1
           FROM agent_run_attempts AS attempt
           JOIN agent_runs AS run ON run.id = attempt.run_id
          WHERE attempt.id = ${lease.attemptId}
            AND attempt.run_id = ${lease.runId}
            AND attempt.lease_token = ${lease.leaseToken}
            AND attempt.fence_token = ${lease.fenceToken}
            AND attempt.status = 'running'
            AND attempt.lease_expires_at > CURRENT_TIMESTAMP
            AND run.status = 'running'
       )
  `
  return updated === 1
}

export async function failToolCall(
  lease: RunLease,
  id: string,
  error: unknown
) {
  const message = error instanceof Error ? error.message : String(error)
  const updated = await prisma.$executeRaw`
    UPDATE agent_tool_calls AS tool_call
       SET status = 'failed',
           error = ${message.slice(0, 2_000)},
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
     WHERE tool_call.id = ${id}
       AND tool_call.run_id = ${lease.runId}
       AND tool_call.attempt_id = ${lease.attemptId}
       AND tool_call.status = 'running'
       AND EXISTS (
         SELECT 1
           FROM agent_run_attempts AS attempt
           JOIN agent_runs AS run ON run.id = attempt.run_id
          WHERE attempt.id = ${lease.attemptId}
            AND attempt.run_id = ${lease.runId}
            AND attempt.lease_token = ${lease.leaseToken}
            AND attempt.fence_token = ${lease.fenceToken}
            AND attempt.status = 'running'
            AND attempt.lease_expires_at > CURRENT_TIMESTAMP
            AND run.status = 'running'
       )
  `
  return updated === 1
}

export async function getToolCall(lease: RunLease, id: string) {
  return prisma.agentToolCall.findFirst({
    where: { id, runId: lease.runId },
  })
}
