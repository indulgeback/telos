import { Hono } from 'hono'
import { prisma } from '../services/db.js'
import { fail } from '../http/response.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import { safeJsonStringify } from '../utils/json.js'
import { logger } from '../config/logger.js'
import {
  compareRunEventCursors,
  normalizeRunEventCursor,
} from '../services/run-event-cursor.js'
import {
  appendRunUiEvent,
  readRunEvents,
  subscribeRunEvents,
} from '../services/run-events.js'
import { buildTerminalUiPayload } from '../services/run-terminal.js'
import {
  isAguiTerminalEvent,
  translateRunEventToAgui,
} from '../services/agui-translate.js'

const AGUI_REPLAY_BATCH_SIZE = 500

export const runsAguiRouter = new Hono()

/**
 * AG-UI 协议端点：把 run 的内部 Redis 事件流实时翻译为 AG-UI 标准事件
 * （RUN_STARTED / TEXT_MESSAGE_* / THINKING_* / TOOL_CALL_* / RUN_FINISHED…）
 * 下发给标准 AG-UI 客户端。断线续传语义与内部流一致（?after= 上一条 sequence）。
 * 内部前端继续用 /:id/stream，此端点不影响它。
 */
runsAguiRouter.get('/:id/agui', async c => {
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

  const rawAfter = (c.req.query('after') as string) || ''
  const afterValid = /^\d+-\d+$/.test(rawAfter) ? rawAfter : ''
  let lastSentSequence = afterValid
  const encoder = new TextEncoder()
  let closed = false
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
          try {
            controller.close()
          } catch {
            // noop
          }
        }

        // AG-UI SSE 帧：事件类型在 JSON 的 type 字段内，无 event: 行。
        // 直接写 controller，由 ReadableStream 内部队列缓冲（运行事件量级小，
        // 无需内部端点那套慢消费者 BoundedByteQueue/drain 机制）。
        const sendAgui = (agui: {
          type: string
          [key: string]: unknown
        }) => {
          if (closed) return false
          const sequence = typeof agui.sequence === 'string' ? agui.sequence : ''
          if (
            !sequence ||
            (lastSentSequence &&
              compareRunEventCursors(sequence, lastSentSequence) <= 0)
          ) {
            return false
          }
          try {
            controller.enqueue(
              encoder.encode(`data: ${safeJsonStringify(agui)}\n\n`)
            )
          } catch {
            return false
          }
          lastSentSequence = sequence
          if (isAguiTerminalEvent(agui.type)) close()
          return true
        }

        const translateAndSend = (payload: unknown, sequence: string) => {
          if (!payload || typeof payload !== 'object') return
          try {
            const translated = translateRunEventToAgui({
              ...(payload as Record<string, unknown>),
              sequence,
            })
            if (translated) sendAgui(translated)
          } catch (error) {
            logger.error({
              msg: 'AG-UI translate/send failed',
              runId,
              sequence,
              error,
            })
          }
        }

        resources.heartbeat = setInterval(() => {
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(': ping\n\n'))
            } catch {
              releaseResources()
            }
          }
        }, 15000)

        c.req.raw.signal.addEventListener('abort', close, { once: true })

        let history: Awaited<ReturnType<typeof readRunEvents>> = []
        try {
          history = await readRunEvents(
            runId,
            lastSentSequence || undefined,
            AGUI_REPLAY_BATCH_SIZE
          )
        } catch (error) {
          logger.error({
            msg: 'Failed to replay run events for AG-UI SSE',
            runId,
            error,
          })
          close()
          return
        }
        logger.info({
          msg: 'AG-UI replay start',
          runId,
          historyLen: history.length,
          after: lastSentSequence || '(start)',
        })
        for (const event of history) {
          translateAndSend(event.payload, event.sequence)
          if (closed) break
        }
        logger.info({
          msg: 'AG-UI replay done',
          runId,
          historyLen: history.length,
          lastSentSequence,
          closed,
        })
        if (closed) return

        resources.unsubscribe = subscribeRunEvents(
          runId,
          event => {
            translateAndSend(event.payload, event.sequence)
          },
          normalizeRunEventCursor(
            history[history.length - 1]?.id || lastSentSequence
          )
        )

        // DB 是事实源：运行已终态而 Redis 投影缺失时补建终态事件
        const latest = await prisma.agentRun.findUnique({
          where: { id: runId },
          select: { id: true, status: true, finalOutput: true, error: true },
        })
        if (closed) return
        const terminalPayload = latest ? buildTerminalUiPayload(latest) : null
        if (terminalPayload) {
          const terminalEvent = await appendRunUiEvent(
            runId,
            terminalPayload.type,
            terminalPayload
          )
          translateAndSend(terminalEvent.payload, terminalEvent.sequence)
          close()
        }
      },
      cancel() {
        closed = true
        releaseResourcesSafe(resources)
      },
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

function releaseResourcesSafe(resources: {
  unsubscribe?: () => void
  heartbeat?: ReturnType<typeof setInterval>
}) {
  resources.unsubscribe?.()
  resources.unsubscribe = undefined
  if (resources.heartbeat) clearInterval(resources.heartbeat)
  resources.heartbeat = undefined
}
