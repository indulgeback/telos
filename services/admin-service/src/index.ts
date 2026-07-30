import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger as honoLogger } from 'hono/logger'
import { config, validateConfig, logger } from './config/index.js'
import { authRouter } from './routes/auth.js'
import { dashboardRouter } from './routes/dashboard.js'
import { agentsRouter } from './routes/agents.js'
import { skillsRouter } from './routes/skills.js'
import { modelsRouter } from './routes/models.js'
import { adminAuth } from './middleware/admin-auth.js'

validateConfig()

const app = new Hono()

// ========== 全局中间件 ==========
app.use('*', honoLogger())
app.use(
  '*',
  cors({
    origin: config.corsOrigins,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  })
)

// ========== 健康检查 (无需鉴权) ==========
app.get('/health', c =>
  c.json({ status: 'healthy', service: 'admin-service', time: new Date().toISOString() })
)

// ========== 认证路由 (无需鉴权) ==========
app.route('/api/auth', authRouter)

// ========== 管理路由 (需 admin 鉴权) ==========
app.use('/api/admin/*', adminAuth)
app.route('/api/admin/dashboard', dashboardRouter)
app.route('/api/admin/agents', agentsRouter)
app.route('/api/admin/skills', skillsRouter)
app.route('/api/admin/models', modelsRouter)

// ========== 404 兜底 ==========
app.notFound(c => c.json({ code: 404, message: 'Not Found' }, 404))
app.onError((err, c) => {
  logger.error({ msg: 'Unhandled error', err: err.message, stack: err.stack })
  return c.json({ code: 500, message: 'Internal Server Error' }, 500)
})

// ========== 启动 ==========
serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  info => {
    logger.info({
      msg: 'Admin Service started',
      port: info.port,
      environment: config.nodeEnv,
      framework: 'hono',
    })
  }
)
