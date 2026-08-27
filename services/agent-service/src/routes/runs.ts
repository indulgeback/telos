import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { fail, ok } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import { cancelAgentRun } from '../services/run-queue.js'
import { safeJsonStringify } from '../utils/json.js'
import {
  compareRunEventCursors,
  normalizeRunEventCursor,
} from '../services/run-event-cursor.js'
import {
  appendRunUiEvent,
  appendRunUiEventOnce,
  readRunEvents,
  subscribeRunEvents,
} from '../services/run-events.js'
import { buildTerminalUiPayload } from '../services/run-terminal.js'
import { BoundedByteQueue } from '../services/bounded-byte-queue.js'
import {
  decideRunToolApproval,
  listPendingToolApprovals,
} from '../services/approval-persistence.js'

export const runsRouter = new Hono()

const SSE_REPLAY_BATCH_SIZE = 500
const SSE_PENDING_BYTES = 256 * 1024

runsRouter.get('/:id', async c => {
  const userId = getCurrentUserId(c)
  const run = await prisma.agentRun.findFirst({
    where: {
      id: c.req.param('id'),
      thread: { ownerId: userId },
    },
    select: {
      id: true,
      agentId: true,
      threadId: true,
      status: true,
      input: true,
      finalOutput: true,
      lastAgentName: true,
      lastResponseId: true,
      error: true,
      metadata: true,
      partialOutput: true,
      partialParts: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      agent: {
        select: {
          id: true,
          name: true,
          description: true,
          modelKey: true,
        },
      },
      steps: {
        orderBy: { index: 'asc' },
        select: {
          id: true,
          runId: true,
          index: true,
          agentName: true,
          type: true,
          input: true,
          output: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  })
  if (!run) return fail(c, 404, 'Run not found')
  return ok(c, toSnakeCase(run))
})

runsRouter.get('/:id/approvals', async c => {
  const userId = getCurrentUserId(c)
  const runId = c.req.param('id')
  const run = await prisma.agentRun.findFirst({
    where: { id: runId, thread: { ownerId: userId } },
    select: { id: true, status: true },
  })
  if (!run) return fail(c, 404, 'Run not found')
  const approvals = await listPendingToolApprovals(runId, userId)
  return ok(c, { run_id: runId, status: run.status, approvals })
})

runsRouter.post('/:id/approvals/:approvalId', async c => {
  const userId = getCurrentUserId(c)
  const runId = c.req.param('id')
  let body: Record<string, unknown>
  try {
    body = (await c.req.json()) as Record<string, unknown>
  } catch {
    return fail(c, 400, 'Invalid JSON body')
  }
  const decision = body.decision
  if (decision !== 'approved' && decision !== 'denied') {
    return fail(c, 400, 'decision must be approved or denied')
  }
  const decided = await decideRunToolApproval(
    runId,
    c.req.param('approvalId'),
    userId,
    decision
  )
  if (!decided) return fail(c, 409, 'Approval is unavailable or expired')
  const latest = await prisma.agentRun.findFirst({
    where: { id: runId, thread: { ownerId: userId } },
    select: { status: true },
  })
  if (!latest) return fail(c, 404, 'Run not found')
  const approvals = await listPendingToolApprovals(runId, userId)
  return ok(c, { status: latest.status, approvals })
})

runsRouter.get('/:id/events', async c => {
  const userId = getCurrentUserId(c)
  const run = await prisma.agentRun.findFirst({
    where: {
      id: c.req.param('id'),
      thread: { ownerId: userId },
    },
    select: { id: true },
  })
  if (!run) return fail(c, 404, 'Run not found')
  const events = await readRunEvents(c.req.param('id'))
  return ok(c, toSnakeCase(events))
})

runsRouter.get('/:id/stream', async c => {
  const userId = getCurrentUserId(c)
  const runId = c.req.param('id')
  const run = await prisma.agentRun.findFirst({
    where: {
      id: runId,
      thread: { ownerId: userId },
    },
    select: { id: true, status: true },
  })
  if (!run) return fail(c, 404, 'Run not found')

  // after 为上一条事件的 Stream ID（如 "1690000000000-3"）；缺省从头发。
  // 格式校验：畸形值会让 XRANGE 抛错，回退为从头发
  const rawAfter = (c.req.query('after') as string) || ''
  const afterValid = /^\d+-\d+$/.test(rawAfter) ? rawAfter : ''
  let lastSentSequence = afterValid
  const encoder = new TextEncoder()
  let closed = false
  let closingAfterDrain = false
  const pending = new BoundedByteQueue<Uint8Array>(SSE_PENDING_BYTES)
  // 供 cancel() 回收 start() 内创建的订阅连接/心跳（controller 已失效，不能复用 close）
  const resources: {
    unsubscribe?: () => void
    heartbeat?: ReturnType<typeof setInterval>
  } = {}

  const stream = new ReadableStream<Uint8Array>(
    {
      async start(controller) {
        const releaseResources = () => {
          resources.unsubscribe?.()
          resources.unsubscribe = undefined
          if (resources.heartbeat) clearInterval(resources.heartbeat)
          resources.heartbeat = undefined
        }

        const close = () => {
          if (closed) return
          closed = true
          releaseResources()
          pending.clear()
          try {
            controller.close()
          } catch {
            // noop
          }
        }

        const drain = () => {
          while (!closed && pending.length > 0) {
            if ((controller.desiredSize ?? 1) <= 0) break
            const chunk = pending.shift()
            if (chunk) controller.enqueue(chunk)
          }
          if (!closed && closingAfterDrain && pending.length === 0) close()
        }

        const closeAfterDrain = () => {
          if (closed || closingAfterDrain) return
          closingAfterDrain = true
          releaseResources()
          drain()
        }

        const enqueue = (chunk: Uint8Array) => {
          if (closed || closingAfterDrain) return false
          if (pending.length === 0 && (controller.desiredSize ?? 1) > 0) {
            controller.enqueue(chunk)
            return true
          }
          if (pending.push(chunk)) return true

          // Stop this subscription instead of accumulating unbounded memory.
          // All accepted events retain their sequence, so a reconnect resumes
          // from the last event the browser actually received.
          closeAfterDrain()
          return false
        }

        const sendPayload = (payload: unknown, sequence: string) => {
          if (
            closed ||
            !sequence ||
            (lastSentSequence &&
              compareRunEventCursors(sequence, lastSentSequence) <= 0)
          ) {
            return
          }
          if (!payload || typeof payload !== 'object') return
          const chunk = payload as Record<string, unknown>
          if (typeof chunk.type !== 'string') return
          const next = { ...chunk, sequence }
          const accepted = enqueue(
            encoder.encode(
              `event: ${chunk.type}\ndata: ${safeJsonStringify(next)}\n\n`
            )
          )
          if (!accepted) return
          lastSentSequence = sequence
          if (
            chunk.type === 'response.completed' ||
            chunk.type === 'response.failed' ||
            chunk.type === 'response.tool_approval.required'
          ) {
            closeAfterDrain()
          }
        }

        resources.heartbeat = setInterval(() => {
          // Heartbeats are disposable and must never consume the bounded event
          // buffer while a client is already behind.
          if (
            !closed &&
            !closingAfterDrain &&
            pending.length === 0 &&
            (controller.desiredSize ?? 1) > 0
          ) {
            controller.enqueue(encoder.encode(': ping\n\n'))
          }
        }, 15000)

        c.req.raw.signal.addEventListener('abort', close, { once: true })

        // 顺序关键：先回放历史、取快照最后一条 ID 作为显式 cursor 再订阅——
        // XREAD 对显式 ID 返回严格大于它的全部条目，无丢事件/重复事件窗口
        const history = await readRunEvents(
          runId,
          lastSentSequence || undefined,
          SSE_REPLAY_BATCH_SIZE
        )
        for (const event of history) {
          sendPayload(event.payload, event.sequence)
          if (closingAfterDrain) break
        }

        // A replayed terminal event closes the stream. Do not create a reader
        // afterwards or it would be orphaned until its blocking read expires.
        if (closed || closingAfterDrain) return

        resources.unsubscribe = subscribeRunEvents(
          runId,
          event => {
            sendPayload(event.payload, event.sequence)
          },
          normalizeRunEventCursor(
            history[history.length - 1]?.id || lastSentSequence
          )
        )

        const latest = await prisma.agentRun.findUnique({
          where: { id: runId },
          select: { id: true, status: true, finalOutput: true, error: true },
        })
        const terminalPayload = latest ? buildTerminalUiPayload(latest) : null
        if (terminalPayload) {
          // DB 是事实源。若进程在 DB commit 后、Redis 投影前崩溃，这里用
          // 原子 terminal marker 补建一次，确保重连不会静默关闭。
          const terminalEvent = await appendRunUiEvent(
            runId,
            terminalPayload.type,
            terminalPayload
          )
          sendPayload(terminalEvent.payload, terminalEvent.sequence)
          closeAfterDrain()
        } else if (latest?.status === 'awaiting_approval') {
          const approvals = await listPendingToolApprovals(runId, userId)
          if (approvals.length) {
            const durableProjection = await prisma.agentOutboxEvent.findFirst({
              where: {
                aggregateType: 'agent_run',
                aggregateId: runId,
                eventType: 'agent_run.awaiting_approval',
              },
              orderBy: { createdAt: 'desc' },
              select: { id: true },
            })
            const approvalEvent = await appendRunUiEventOnce(
              runId,
              'response.tool_approval.required',
              {
                type: 'response.tool_approval.required',
                response_id: runId,
                approvals,
              },
              durableProjection?.id ||
                `approval-rebuild:${approvals
                  .map(approval => approval.id)
                  .sort()
                  .join(',')}`
            )
            sendPayload(approvalEvent.payload, approvalEvent.sequence)
            closeAfterDrain()
          }
        }
      },
      pull(controller) {
        while (!closed && pending.length > 0) {
          if ((controller.desiredSize ?? 1) <= 0) break
          const chunk = pending.shift()
          if (chunk) controller.enqueue(chunk)
        }
        if (!closed && closingAfterDrain && pending.length === 0) {
          closed = true
          resources.unsubscribe?.()
          resources.unsubscribe = undefined
          if (resources.heartbeat) clearInterval(resources.heartbeat)
          resources.heartbeat = undefined
          controller.close()
        }
      },
      cancel() {
        // 客户端断开：释放订阅连接与心跳（controller 已失效，只做资源回收）
        closed = true
        resources.unsubscribe?.()
        if (resources.heartbeat) clearInterval(resources.heartbeat)
        pending.clear()
      },
    },
    {
      // Account the browser-facing Web Stream queue in bytes as well. The
      // application queue above is independently capped for Redis callbacks.
      highWaterMark: 64 * 1024,
      size: chunk => chunk.byteLength,
    }
  )

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})

runsRouter.post('/:id/cancel', async c => {
  const userId = getCurrentUserId(c)
  const run = await prisma.agentRun.findFirst({
    where: {
      id: c.req.param('id'),
      thread: { ownerId: userId },
    },
    select: { id: true, status: true },
  })
  if (!run) return fail(c, 404, 'Run not found')
  if (
    run.status === 'completed' ||
    run.status === 'failed' ||
    run.status === 'cancelled'
  ) {
    return ok(c, { status: run.status })
  }
  const cancelled = await cancelAgentRun(run.id)
  if (cancelled) return ok(c, { status: 'cancelled' })

  const latest = await prisma.agentRun.findUnique({
    where: { id: run.id },
    select: { status: true },
  })
  return ok(c, { status: latest?.status ?? run.status })
})
