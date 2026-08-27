import { randomUUID } from 'node:crypto'
import { prisma } from './db.js'
import { appendRunUiEvent, appendRunUiEventOnce } from './run-events.js'
import { logger } from '../config/index.js'

export type OutboxStatus =
  'pending' | 'processing' | 'published' | 'dead_letter'

export interface OutboxEventInput {
  aggregateType: string
  aggregateId: string
  eventType: string
  dedupeKey: string
  payload: unknown
  availableAt?: Date
}

export interface ClaimedOutboxEvent {
  id: string
  aggregateType: string
  aggregateId: string
  eventType: string
  dedupeKey: string
  payload: unknown
  attempts: number
  lockToken: string
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null'
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableJson(item)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`
}

/** Insert inside the caller's transaction; the event commits with its state. */
export async function enqueueOutboxEvent(tx: any, input: OutboxEventInput) {
  const event = await tx.agentOutboxEvent.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      dedupeKey: input.dedupeKey,
      payload: input.payload as any,
      availableAt: input.availableAt,
    },
    update: {},
  })
  if (
    event.aggregateType !== input.aggregateType ||
    event.aggregateId !== input.aggregateId ||
    event.eventType !== input.eventType ||
    stableJson(event.payload) !== stableJson(input.payload)
  ) {
    throw new Error(
      `Outbox dedupe key was reused with a different event: ${input.dedupeKey}`
    )
  }
  return event
}

/** Convenience form when no other state mutation is needed. */
export async function enqueueStandaloneOutboxEvent(input: OutboxEventInput) {
  return prisma.$transaction(tx => enqueueOutboxEvent(tx, input))
}

/**
 * Claim with row locks and SKIP LOCKED. A lock token is required for ack/fail,
 * so a slow consumer cannot acknowledge a message reclaimed by another one.
 */
export async function claimOutboxEvents(
  limit = 50,
  lockMs = 60_000
): Promise<ClaimedOutboxEvent[]> {
  const boundedLimit = Math.max(1, Math.min(200, Math.floor(limit)))
  return prisma.$transaction(async tx => {
    const rows = (await tx.$queryRaw`
      SELECT id, aggregate_type, aggregate_id, event_type, dedupe_key,
             payload, attempts
      FROM agent_outbox_events
      WHERE (status = 'pending' AND available_at <= CURRENT_TIMESTAMP)
         OR (status = 'processing' AND (locked_at IS NULL OR locked_at < CURRENT_TIMESTAMP - (${lockMs} * INTERVAL '1 millisecond')))
      ORDER BY created_at ASC
      LIMIT ${boundedLimit}
      FOR UPDATE SKIP LOCKED
    `) as Array<{
      id: string
      aggregate_type: string
      aggregate_id: string
      event_type: string
      dedupe_key: string
      payload: unknown
      attempts: number
    }>
    const claimed: ClaimedOutboxEvent[] = []
    for (const row of rows) {
      const lockToken = randomUUID()
      const updated = await tx.agentOutboxEvent.updateMany({
        where: { id: row.id },
        data: {
          status: 'processing',
          lockedAt: new Date(),
          lockToken,
          attempts: { increment: 1 },
          lastError: null,
        },
      })
      if (updated.count !== 1) continue
      claimed.push({
        id: row.id,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        eventType: row.event_type,
        dedupeKey: row.dedupe_key,
        payload: row.payload,
        attempts: row.attempts + 1,
        lockToken,
      })
    }
    return claimed
  })
}

export async function acknowledgeOutboxEvent(id: string, lockToken: string) {
  const updated = await prisma.agentOutboxEvent.updateMany({
    where: { id, status: 'processing', lockToken },
    data: {
      status: 'published',
      publishedAt: new Date(),
      lockedAt: null,
      lockToken: null,
    },
  })
  return updated.count === 1
}

export async function retryOutboxEvent(
  id: string,
  lockToken: string,
  error: unknown,
  delayMs = 5_000
) {
  const message = error instanceof Error ? error.message : String(error)
  const updated = await prisma.agentOutboxEvent.updateMany({
    where: { id, status: 'processing', lockToken },
    data: {
      status: 'pending',
      availableAt: new Date(Date.now() + Math.max(0, delayMs)),
      lockedAt: null,
      lockToken: null,
      lastError: message.slice(0, 2_000),
    },
  })
  return updated.count === 1
}

export async function deadLetterOutboxEvent(
  id: string,
  lockToken: string,
  error: unknown
) {
  const message = error instanceof Error ? error.message : String(error)
  const updated = await prisma.agentOutboxEvent.updateMany({
    where: { id, status: 'processing', lockToken },
    data: {
      status: 'dead_letter',
      lockedAt: null,
      lockToken: null,
      lastError: message.slice(0, 2_000),
    },
  })
  return updated.count === 1
}

async function dispatchOutboxEvent(event: ClaimedOutboxEvent) {
  if (event.eventType === 'agent_run.approval_decided') {
    // Keep queue payload opaque even though this event came from a database
    // transaction. The worker reconstructs execution from the run row.
    const { enqueueAgentRun } = await import('./run-queue.js')
    await enqueueAgentRun({ runId: event.aggregateId } as any)
    return
  }
  if (event.eventType === 'agent_run.awaiting_approval') {
    await appendRunUiEventOnce(
      event.aggregateId,
      'response.tool_approval.required',
      {
        ...(event.payload && typeof event.payload === 'object'
          ? (event.payload as Record<string, unknown>)
          : {}),
        response_id: event.aggregateId,
      },
      event.id
    )
    return
  }
  if (
    event.eventType === 'agent_run.completed' ||
    event.eventType === 'agent_run.failed' ||
    event.eventType === 'agent_run.cancelled'
  ) {
    const payload =
      event.payload && typeof event.payload === 'object'
        ? (event.payload as Record<string, unknown>)
        : {}
    const terminalType =
      event.eventType === 'agent_run.completed'
        ? 'response.completed'
        : 'response.failed'
    await appendRunUiEvent(event.aggregateId, terminalType, {
      ...payload,
      response_id: event.aggregateId,
      ...(terminalType === 'response.failed'
        ? {
            error: payload.error || payload.reason || 'Agent run failed',
            run_status: event.eventType.slice('agent_run.'.length),
          }
        : {}),
    })
    return
  }
  throw new Error(`Unsupported outbox event type: ${event.eventType}`)
}

/** Process one bounded batch; safe to call from a timer or a dedicated loop. */
export async function pumpOutboxOnce(limit = 50) {
  const { expirePendingToolApprovals } =
    await import('./approval-persistence.js')
  await expirePendingToolApprovals(limit)
  const events = await claimOutboxEvents(limit)
  let published = 0
  for (const event of events) {
    try {
      await dispatchOutboxEvent(event)
      if (await acknowledgeOutboxEvent(event.id, event.lockToken))
        published += 1
    } catch (error) {
      logger.error({
        msg: 'Unable to dispatch agent outbox event',
        eventId: event.id,
        eventType: event.eventType,
        error,
      })
      if (event.attempts >= 20) {
        await deadLetterOutboxEvent(event.id, event.lockToken, error)
      } else {
        const delayMs = Math.min(
          60_000,
          1_000 * 2 ** Math.min(6, event.attempts)
        )
        await retryOutboxEvent(event.id, event.lockToken, error, delayMs)
      }
    }
  }
  return { claimed: events.length, published }
}

let outboxTimer: ReturnType<typeof setInterval> | null = null

export function startOutboxDispatcher(intervalMs = 1_000) {
  if (outboxTimer) return
  const interval = Math.max(250, Math.min(60_000, Math.floor(intervalMs)))
  void pumpOutboxOnce().catch(error =>
    logger.error({ msg: 'Initial agent outbox pump failed', error })
  )
  outboxTimer = setInterval(() => {
    void pumpOutboxOnce().catch(error =>
      logger.error({ msg: 'Agent outbox pump failed', error })
    )
  }, interval)
  outboxTimer.unref?.()
}

export function closeOutboxDispatcher() {
  if (!outboxTimer) return
  clearInterval(outboxTimer)
  outboxTimer = null
}
