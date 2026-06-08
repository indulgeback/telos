import { Hono } from 'hono'
import { fail, ok, parseJson } from '../http/response.js'
import { getCurrentUserId } from '../middleware/gatewayIdentity.js'
import { safeJsonStringify } from '../utils/json.js'
import {
  getVolcRealtimePublicConfig,
  runVolcRealtimeTextTurn,
  serializeRealtimeError,
} from '../services/realtime/volc-realtime.js'

export const realtimeRouter = new Hono()

type RealtimeStreamWriter = (
  type: string,
  event?: Record<string, unknown>
) => void

function createRealtimeStreamResponse(
  signal: AbortSignal,
  execute: (write: RealtimeStreamWriter) => Promise<void>
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write: RealtimeStreamWriter = (type, event = {}) => {
        const payload = { ...event, type }
        controller.enqueue(
          encoder.encode(`event: ${type}\ndata: ${safeJsonStringify(payload)}\n\n`)
        )
      }

      const abortHandler = () => {
        try {
          controller.close()
        } catch {
          // noop
        }
      }
      signal.addEventListener('abort', abortHandler, { once: true })

      try {
        await execute(write)
      } catch (error) {
        write('response.failed', {
          error: serializeRealtimeError(error),
        })
      } finally {
        signal.removeEventListener('abort', abortHandler)
        try {
          controller.close()
        } catch {
          // noop
        }
      }
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
}

realtimeRouter.get('/config', c => {
  return ok(c, getVolcRealtimePublicConfig())
})

realtimeRouter.post('/text', async c => {
  const body = await parseJson<{
    input?: unknown
    message?: unknown
    instructions?: unknown
    sessionId?: unknown
  }>(c)
  const input =
    typeof body.input === 'string'
      ? body.input
      : typeof body.message === 'string'
        ? body.message
        : ''
  if (!input.trim()) {
    return fail(c, 400, 'input is required')
  }

  const userId = getCurrentUserId(c)
  const instructions =
    typeof body.instructions === 'string' ? body.instructions : undefined
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined

  return createRealtimeStreamResponse(c.req.raw.signal, async write => {
    write('agent.run.created', {
      data: {
        userId,
        provider: 'volcengine',
        mode: 'realtime_text',
      },
    })
    await runVolcRealtimeTextTurn(
      {
        input,
        instructions,
        sessionId,
        signal: c.req.raw.signal,
      },
      write
    )
  })
})
