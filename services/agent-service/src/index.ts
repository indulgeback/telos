import { serve } from '@hono/node-server'
import type { IncomingMessage } from 'node:http'
import path from 'node:path'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import WebSocket, { WebSocketServer } from 'ws'
import { logger } from './config/index.js'
import { config, validateConfig } from './config/index.js'
// 代理初始化必须最先执行（副作用 import：给全局 fetch 挂 EnvHttpProxyAgent），
// 之后所有 fetch（Gemini/Vertex/gcloud 等）才会经过代理
import './services/proxy-setup.js'
import { agentsRouter } from './routes/agents.js'
import { chatRouter } from './routes/chat.js'
import { mcpRouter } from './routes/mcp.js'
import { realtimeRouter } from './routes/realtime.js'
import { runsRouter } from './routes/runs.js'
import { skillsRouter } from './routes/skills.js'
import { toolsRouter } from './routes/tools.js'
import {
  gatewayIdentityMiddleware,
  getAuthenticatedUserId,
  verifyGatewayIdentity,
} from './middleware/gatewayIdentity.js'
import { ensureBuiltinTools } from './services/builtin-tools.js'
import { ensureDefaultAgent } from './services/default-agent.js'
import { ensureSystemSkills } from './services/default-skills.js'
import { db, prisma } from './services/db.js'
import { performRegistration } from './services/registry.js'
import { handleVolcRealtimeAudioSocket } from './services/realtime/volc-realtime.js'
import { ANONYMOUS_OWNER_ID } from './services/session.js'
import {
  closeAgentRunWorker,
  isAgentRunWorkerReady,
  startAgentRunWorker,
} from './services/run-queue.js'
import {
  closeOutboxDispatcher,
  startOutboxDispatcher,
} from './services/outbox.js'
import {
  openSharedFile,
  SharedPathAccessError,
} from './services/workspace-share.js'

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
  if (err instanceof HTTPException) {
    return c.json(
      {
        code: err.status,
        message: err.message,
      },
      err.status as any
    )
  }
  return c.json(
    {
      code: 500,
      message:
        config.nodeEnv === 'development'
          ? err.message
          : 'Internal Server Error',
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

// /health 是存活探针（liveness）：只要进程能响应即为 healthy。
// 不检查 DB 连通性，避免 DB 抖动/连接池耗尽时进程仍存活却被 Consul 摘除。
// DB 连通性检查由 db.healthCheck() 提供，如需就绪探针可单独挂在 /ready 上。
app.get('/health', c =>
  c.json({
    status: 'healthy',
    time: new Date().toISOString(),
    service: 'agent-service',
  })
)

app.get('/ready', async c => {
  const [database, runWorker] = await Promise.all([
    db.healthCheck(),
    isAgentRunWorkerReady(),
  ])
  const ready = database && runWorker
  return c.json(
    {
      status: ready ? 'ready' : 'not_ready',
      checks: { database, run_worker: runWorker },
    },
    ready ? 200 : 503
  )
})
app.get('/info', c =>
  c.json({
    service: 'agent-service',
    version: '1.0.0',
    framework: 'hono + openai-agents-sdk',
    model: 'db-managed',
  })
)

app.use('/workspaces/shares/*', gatewayIdentityMiddleware)

app.get('/workspaces/shares/:threadId/*', async c => {
  const threadId = c.req.param('threadId')
  const userId = getAuthenticatedUserId(c)
  if (!userId) return c.text('Unauthorized', 401)

  const thread = await prisma.agentThread.findFirst({
    where: { id: threadId, ownerId: userId, status: { not: 'deleted' } },
    select: { id: true },
  })
  if (!thread) return c.text('File Not Found', 404)

  let relativePath: string
  try {
    relativePath = decodeURIComponent(
      c.req.path.slice(`/workspaces/shares/${threadId}/`.length)
    )
  } catch {
    return c.text('Invalid path', 400)
  }

  const persistedDir = path.resolve(process.cwd(), '.persisted-workspaces')
  const wsRoot = path.join(persistedDir, 'workspaces', threadId)

  let openedFile: Awaited<ReturnType<typeof openSharedFile>>
  try {
    openedFile = await openSharedFile(wsRoot, relativePath)
  } catch (error) {
    if (error instanceof SharedPathAccessError) {
      return c.text('Access Denied', 403)
    }
    return c.text('File Not Found', 404)
  }

  try {
    const fileBuffer = await openedFile.fileHandle.readFile()
    const baseName = path.basename(openedFile.realFilePath)
    c.header('Content-Length', openedFile.stat.size.toString())
    c.header('Cache-Control', 'private, no-store')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(baseName)}"; filename*=UTF-8''${encodeURIComponent(baseName)}`
    )
    return c.body(fileBuffer)
  } catch {
    return c.text('File Not Found', 404)
  } finally {
    await openedFile.fileHandle.close().catch(() => undefined)
  }
})

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
    void ensureDefaultAgent().catch(error => {
      logger.error({
        msg: 'Failed to ensure default agent',
        err: error,
      })
    })
    void ensureSystemSkills().catch(error => {
      logger.error({
        msg: 'Failed to ensure system skills',
        err: error,
      })
    })
    void performRegistration()
    void startAgentRunWorker().catch(error => {
      logger.error({
        msg: 'Failed to start agent run worker',
        err: error,
      })
    })
    startOutboxDispatcher()
  }
)

const realtimeAudioWss = new WebSocketServer({ noServer: true })

async function resolveRealtimeSocketUserId(request: {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
}) {
  if (config.allowAnonymousOwner) return ANONYMOUS_OWNER_ID

  const rawUrl = request.url || '/api/agent/realtime/audio'
  const userId = String(request.headers['x-user-id'] || '').trim()
  const timestamp = String(request.headers['x-gateway-timestamp'] || '').trim()
  const nonce = String(request.headers['x-gateway-nonce'] || '').trim()
  const bodyHeader = String(
    request.headers['x-gateway-body-sha256'] || ''
  ).trim()
  const signature = String(request.headers['x-gateway-signature'] || '').trim()

  if (!userId || !timestamp || !nonce || !bodyHeader || !signature) return null

  const valid = await verifyGatewayIdentity({
    method: request.method || 'GET',
    rawUrl,
    bodyDigest:
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    bodyHeader,
    userId,
    timestamp,
    nonce,
    signature,
  })
  return valid ? userId : null
}

server.on('upgrade', (request, socket, head) => {
  void (async () => {
    const pathname = request.url?.split('?')[0]
    logger.info({
      msg: 'Realtime audio upgrade request',
      path: pathname,
    })
    if (pathname !== '/api/agent/realtime/audio') {
      socket.destroy()
      return
    }

    const userId = await resolveRealtimeSocketUserId(request)
    if (!userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    realtimeAudioWss.handleUpgrade(request, socket, head, ws => {
      realtimeAudioWss.emit('connection', ws, request, userId)
    })
  })()
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
      closeOutboxDispatcher()
      await closeAgentRunWorker()
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
