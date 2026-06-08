import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Context, Next } from 'hono'
import { config } from '../config/index.js'
import { ANONYMOUS_OWNER_ID } from '../services/session.js'

const USER_ID_KEY = 'currentUserId'

function signIdentity(options: {
  method: string
  path: string
  userId: string
  timestamp: string
  nonce: string
}) {
  const payload = [
    options.method,
    options.path,
    options.userId,
    options.timestamp,
    options.nonce,
  ].join('\n')
  return createHmac('sha256', config.gatewayInternalSecret)
    .update(payload)
    .digest('hex')
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function unauthorized(c: Context) {
  return c.json({ code: 401, message: 'unauthorized' }, 401)
}

export function getCurrentUserId(c: Context) {
  const userId = c.get(USER_ID_KEY as never) as string | undefined
  if (userId) return userId
  if (config.allowAnonymousOwner) return ANONYMOUS_OWNER_ID
  throw new Error('Authenticated user is required')
}

export async function gatewayIdentityMiddleware(c: Context, next: Next) {
  const userId = c.req.header('X-User-ID')?.trim()
  const timestamp = c.req.header('X-Gateway-Timestamp')?.trim()
  const nonce = c.req.header('X-Gateway-Nonce')?.trim()
  const signature = c.req.header('X-Gateway-Signature')?.trim()

  if (!userId || !timestamp || !nonce || !signature) {
    if (config.allowAnonymousOwner) {
      c.set(USER_ID_KEY as never, ANONYMOUS_OWNER_ID as never)
      await next()
      return
    }
    return unauthorized(c)
  }

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) {
    return unauthorized(c)
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (
    Math.abs(nowSeconds - timestampSeconds) >
    config.authClockSkewSeconds
  ) {
    return unauthorized(c)
  }

  const expected = signIdentity({
    method: c.req.method,
    path: c.req.path,
    userId,
    timestamp,
    nonce,
  })
  if (!safeEqual(expected, signature)) {
    return unauthorized(c)
  }

  c.set(USER_ID_KEY as never, userId as never)
  await next()
}
