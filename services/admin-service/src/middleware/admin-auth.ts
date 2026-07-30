import type { Context, Next } from 'hono'
import { verifySessionToken } from '../services/session-token.js'

// =============================================================================
// Admin 鉴权中间件
// 校验 Authorization: Bearer <token>, 把 claims 挂到 c.set('admin', claims)
// =============================================================================
export async function adminAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return c.json({ code: 401, message: '未登录' }, 401)
  }

  const claims = verifySessionToken(token)
  if (!claims) {
    return c.json({ code: 401, message: '会话已过期或无效' }, 401)
  }

  c.set('admin', claims)
  await next()
}
