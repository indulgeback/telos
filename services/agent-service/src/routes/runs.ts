import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { fail, ok } from '../http/response.js'
import { toSnakeCase } from '../utils/serializer.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import { cancelAgentRun } from '../services/run-queue.js'
import { safeJsonStringify } from '../utils/json.js'
import {
  cleanupRunEvents,
  readRunEvents,
  subscribeRunEvents,
} from '../services/run-events.js'

export const runsRouter = new Hono()

runsRouter.get('/:id', async c => {
  const userId = getCurrentUserId(c)
  const run = await prisma.agentRun.findFirst({
    where: {
      id: c.req.param('id'),
      thread: { ownerId: userId },
    },
    include: {
      agent: true,
      steps: { orderBy: { index: 'asc' } },
    },
  })
  if (!run) return fail(c, 404, 'Run not found')
  return ok(c, toSnakeCase(run))
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
  // 供 cancel() 回收 start() 内创建的订阅连接/心跳（controller 已失效，不能复用 close）
  const resources: {
    unsubscribe?: () => void
    heartbeat?: ReturnType<typeof setInterval>
  } = {}

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const close = () => {
        if (closed) return
        closed = true
        resources.unsubscribe?.()
        if (resources.heartbeat) clearInterval(resources.heartbeat)
        try {
          controller.close()
        } catch {
          // noop
        }
      }

      const sendPayload = (payload: unknown, sequence: string) => {
        if (closed || !sequence || sequence === lastSentSequence) return
        if (!payload || typeof payload !== 'object') return
        const chunk = payload as Record<string, unknown>
        if (typeof chunk.type !== 'string') return
        lastSentSequence = sequence
        const next = { ...chunk, sequence }
        controller.enqueue(
          encoder.encode(
            `event: ${chunk.type}\ndata: ${safeJsonStringify(next)}\n\n`
          )
        )
        if (
          chunk.type === 'response.completed' ||
          chunk.type === 'response.failed'
        ) {
          close()
        }
      }

      resources.heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': ping\n\n'))
      }, 15000)

      c.req.raw.signal.addEventListener('abort', close, { once: true })

      // 顺序关键：先回放历史、取快照最后一条 ID 作为显式 cursor 再订阅——
      // XREAD 对显式 ID 返回严格大于它的全部条目，无丢事件/重复事件窗口
      const history = await readRunEvents(
        runId,
        lastSentSequence || undefined
      )
      history.forEach(event => sendPayload(event.payload, event.sequence))

      resources.unsubscribe = subscribeRunEvents(
        runId,
        event => {
          sendPayload(event.payload, event.sequence)
        },
        history[history.length - 1]?.id ?? lastSentSequence ?? '0-0'
      )

      const latest = await prisma.agentRun.findUnique({
        where: { id: runId },
        select: { status: true },
      })
      if (
        latest &&
        (latest.status === 'completed' ||
          latest.status === 'failed' ||
          latest.status === 'cancelled')
      ) {
        // 终态 run：回放完即关流，并清理事件（会话恢复走 message parts）
        void cleanupRunEvents(runId)
        close()
      }
    },
    cancel() {
      // 客户端断开：释放订阅连接与心跳（controller 已失效，只做资源回收）
      closed = true
      resources.unsubscribe?.()
      if (resources.heartbeat) clearInterval(resources.heartbeat)
    },
  })

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
  await cancelAgentRun(run.id)
  return ok(c, { status: 'cancelled' })
})
