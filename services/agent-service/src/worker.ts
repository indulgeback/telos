import './services/proxy-setup.js'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { config, logger, validateConfig } from './config/index.js'
import { db } from './services/db.js'
import { closeAgentRunQueue } from './services/run-queue.js'
import {
  startAgentRunWorker,
  closeAgentRunWorker,
  isAgentRunWorkerReady,
} from './services/run-worker.js'
import {
  startOutboxDispatcher,
  closeOutboxDispatcher,
} from './services/outbox.js'

validateConfig()

let stopping = false
let started = false
const app = new Hono()
app.get('/health', c => c.json({ status: 'healthy', service: 'agent-worker' }))
app.get('/ready', async c => {
  const [database, worker] = await Promise.all([
    db.healthCheck(),
    isAgentRunWorkerReady(),
  ])
  const ready = started && !stopping && database && worker
  return c.json(
    { status: ready ? 'ready' : 'not_ready', checks: { database, worker } },
    ready ? 200 : 503
  )
})

// Health-only listener. Workers never register as API backends in Consul.
const server = serve({ fetch: app.fetch, port: config.workerHealthPort })

async function shutdown(exitCode = 0) {
  if (stopping) return
  stopping = true
  logger.info({
    msg: 'Draining agent worker',
    timeoutMs: config.workerShutdownTimeoutMs,
  })
  const timeout = setTimeout(() => {
    // Never re-enqueue here: a tool can still have an external side effect in
    // flight. Lease expiry uses the existing conservative recovery policy.
    logger.error({
      msg: 'Worker drain timed out; leaving recovery to durable leases',
    })
    process.exit(1)
  }, config.workerShutdownTimeoutMs)
  timeout.unref()
  server.close()
  try {
    await startup
    await closeAgentRunWorker()
    await closeOutboxDispatcher()
    await closeAgentRunQueue()
    await db.disconnect()
    process.exit(exitCode)
  } catch (error) {
    logger.error({ msg: 'Worker shutdown failed', error })
    process.exit(1)
  }
}

const startup = startAgentRunWorker()
  .then(() => {
    startOutboxDispatcher()
    started = true
    logger.info({ msg: 'Independent agent worker ready' })
  })
  .catch(error => {
    logger.error({ msg: 'Worker startup failed', error })
    // Schedule shutdown after the startup promise settles, avoiding a self-wait.
    setImmediate(() => {
      void shutdown(1)
    })
  })

process.on('SIGTERM', () => {
  void shutdown()
})
process.on('SIGINT', () => {
  void shutdown()
})
process.on('uncaughtException', error => {
  logger.error({ msg: 'Uncaught worker exception', error })
  void shutdown(1)
})
process.on('unhandledRejection', error => {
  logger.error({ msg: 'Unhandled worker rejection', error })
  void shutdown(1)
})
