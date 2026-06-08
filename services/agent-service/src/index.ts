import { serve } from '@hono/node-server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { Hono } from 'hono'
import WebSocket, { WebSocketServer } from 'ws'
import { logger } from './config/index.js'
import { config, validateConfig } from './config/index.js'
import { agentsRouter } from './routes/agents.js'
import { chatRouter } from './routes/chat.js'
import { mcpRouter } from './routes/mcp.js'
import { realtimeRouter } from './routes/realtime.js'
import { runsRouter } from './routes/runs.js'
import { skillsRouter } from './routes/skills.js'
import { toolsRouter } from './routes/tools.js'
import { gatewayIdentityMiddleware } from './middleware/gatewayIdentity.js'
import { ensureBuiltinTools } from './services/builtin-tools.js'
import { db } from './services/db.js'
import { performRegistration } from './services/registry.js'
import { handleVolcRealtimeAudioSocket } from './services/realtime/volc-realtime.js'
import { ANONYMOUS_OWNER_ID } from './services/session.js'

validateConfig()

const app = new Hono()

app.use('*', async (c, next) => {
  logger.info({
    msg: `${c.req.method} ${c.req.path}`,
    requestId: c.req.header('X-Request-ID'),
    agentId: c.req.header('X-Agent-ID'),
  })
  await next()
})

app.onError((err, c) => {
  logger.error({
    msg: 'Unhandled error',
    err,
  })
  return c.json(
    {
      code: 500,
      message:
        config.nodeEnv === 'development' ? err.message : 'Internal Server Error',
    },
    500
  )
})

app.notFound(c => {
  return c.json(
    {
      code: 404,
      message: 'Not Found',
    },
    404
  )
})

app.get('/health', async c => {
  const isHealthy = await db.healthCheck()
  return c.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      time: new Date().toISOString(),
      service: 'agent-service',
    },
    isHealthy ? 200 : 503
  )
})

app.get('/ready', c => c.json({ status: 'ready' }))
app.get('/info', c =>
  c.json({
    service: 'agent-service',
    version: '1.0.0',
    framework: 'hono + openai-agents-sdk',
    model: 'db-managed',
  })
)

app.use('/api/*', gatewayIdentityMiddleware)

app.route('/api/agent/realtime', realtimeRouter)
app.route('/api/agent', chatRouter)
app.route('/api/agents', agentsRouter)
app.route('/api/tools', toolsRouter)
app.route('/api/skills', skillsRouter)
app.route('/api/mcp-servers', mcpRouter)
app.route('/api/runs', runsRouter)

const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  info => {
    logger.info({
      msg: 'Agent Service started',
      port: info.port,
      environment: config.nodeEnv,
      framework: 'hono + openai-agents-sdk',
    })
    void ensureBuiltinTools({ attachToExistingAgents: true }).catch(error => {
      logger.error({
        msg: 'Failed to ensure builtin tools',
        err: error,
      })
    })
    void performRegistration()
  }
)

const realtimeAudioWss = new WebSocketServer({ noServer: true })

function signGatewayIdentity(options: {
  method: string
  path: string
  userId: string
  timestamp: string
  nonce: string
}) {
  return createHmac('sha256', config.gatewayInternalSecret)
    .update(
      [
        options.method,
        options.path,
        options.userId,
        options.timestamp,
        options.nonce,
      ].join('\n')
    )
    .digest('hex')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function resolveRealtimeSocketUserId(request: {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
}) {
  if (config.allowAnonymousOwner) return ANONYMOUS_OWNER_ID

  const rawPath = request.url || '/api/agent/realtime/audio'
  const path = rawPath.split('?')[0] || '/api/agent/realtime/audio'
  const userId = String(request.headers['x-user-id'] || '').trim()
  const timestamp = String(request.headers['x-gateway-timestamp'] || '').trim()
  const nonce = String(request.headers['x-gateway-nonce'] || '').trim()
  const signature = String(request.headers['x-gateway-signature'] || '').trim()

  if (!userId || !timestamp || !nonce || !signature) return null

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return null
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (
    Math.abs(nowSeconds - timestampSeconds) >
    config.authClockSkewSeconds
  ) {
    return null
  }

  const expected = signGatewayIdentity({
    method: request.method || 'GET',
    path,
    userId,
    timestamp,
    nonce,
  })
  return safeEqual(expected, signature) ? userId : null
}

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url?.split('?')[0]
  logger.info({
    msg: 'Realtime audio upgrade request',
    path: pathname,
  })
  if (pathname !== '/api/agent/realtime/audio') {
    socket.destroy()
    return
  }

  const userId = resolveRealtimeSocketUserId(request)
  if (!userId) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }

  realtimeAudioWss.handleUpgrade(request, socket, head, ws => {
    realtimeAudioWss.emit('connection', ws, request, userId)
  })
})

realtimeAudioWss.on(
  'connection',
  (ws: WebSocket, _request: IncomingMessage, userId: unknown) => {
    void handleVolcRealtimeAudioSocket({
      client: ws,
      userId: typeof userId === 'string' ? userId : ANONYMOUS_OWNER_ID,
    })
  }
)

const shutdown = async () => {
  logger.info({ msg: 'Shutting down gracefully...' })

  server.close(async () => {
    try {
      await db.disconnect()
      logger.info({ msg: 'Database disconnected' })
      process.exit(0)
    } catch (error) {
      logger.error({ msg: 'Error during shutdown', err: error })
      process.exit(1)
    }
  })

  setTimeout(() => {
    logger.error({ msg: 'Forced shutdown after timeout' })
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    msg: 'Unhandled Rejection',
    promise,
    reason,
  })
})

process.on('uncaughtException', error => {
  logger.error({
    msg: 'Uncaught Exception',
    err: error,
  })
  void shutdown()
})
