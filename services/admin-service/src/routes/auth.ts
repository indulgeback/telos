import { Hono } from 'hono'
import { timingSafeEqual } from 'node:crypto'
import { config } from '../config/index.js'
import { signSessionToken, verifySessionToken } from '../services/session-token.js'

export const authRouter = new Hono()

/** 常量时间比较字符串 (防时序攻击) */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// POST /api/auth/login — 管理员登录
authRouter.post('/login', async c => {
  const body = await c.req.json().catch(() => ({}))
  const { username, password } = body as { username?: string; password?: string }

  if (!username || !password) {
    return c.json({ code: 400, message: '用户名和密码不能为空' }, 400)
  }

  // 常量时间比较 (即使第一个不匹配也会比较完两个, 防时序侧信道)
  const userOk = safeEqual(username, config.adminUsername)
  const passOk = safeEqual(password, config.adminPassword)
  if (!userOk || !passOk) {
    return c.json({ code: 401, message: '用户名或密码错误' }, 401)
  }

  const token = signSessionToken(username)
  return c.json({
    code: 0,
    data: { token, username, expiresInSeconds: config.sessionTtlSeconds },
  })
})

// GET /api/auth/me — 验证当前 session (需 Bearer token)
authRouter.get('/me', async c => {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const claims = token ? verifySessionToken(token) : null

  if (!claims) {
    return c.json({ code: 401, message: '未登录或会话已过期' }, 401)
  }

  return c.json({
    code: 0,
    data: { username: claims.username, role: claims.role },
  })
})
