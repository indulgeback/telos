import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import Redis from 'ioredis'
import type { Context, Next } from 'hono'
import { config, logger } from '../config/index.js'
import { ANONYMOUS_OWNER_ID } from '../services/session.js'

const USER_ID_KEY = 'currentUserId'
const AUTHENTICATED_KEY = 'gatewayAuthenticated'
const EMPTY_BODY_DIGEST = createHash('sha256').update('').digest('hex')

export interface GatewayNonceStore {
  reserve(nonce: string, ttlSeconds: number): Promise<boolean>
}

class RedisGatewayNonceStore implements GatewayNonceStore {
  private client: Redis | null = null
  private connecting: Promise<void> | null = null

  private getClient() {
    if (!this.client) {
      this.client = new Redis(config.redisUrl, {
        connectTimeout: 1000,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      })
      const client = this.client
      client.on('error', err =>
        logger.error({ msg: 'gateway nonce Redis client error', err })
      )
      client.on('end', () => {
        if (this.client === client) this.client = null
      })
    }
    return this.client
  }

  async reserve(nonce: string, ttlSeconds: number) {
    const client = this.getClient()
    if (client.status === 'wait') {
      this.connecting ??= client.connect().finally(() => {
        this.connecting = null
      })
    }
    if (this.connecting) await this.connecting
    if (client.status !== 'ready') {
      throw new Error(`Gateway nonce Redis is not ready (${client.status})`)
    }
    const result = await client.set(
      `${config.gatewayNonceKeyPrefix}:${nonce}`,
      '1',
      'EX',
      ttlSeconds,
      'NX'
    )
    return result === 'OK'
  }
}

let nonceStore: GatewayNonceStore = new RedisGatewayNonceStore()

/** Test hook; production always uses the Redis-backed atomic store. */
export function setGatewayNonceStoreForTests(store: GatewayNonceStore) {
  nonceStore = store
}

function encodeRFC3986(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

export function canonicalizePath(rawPath: string) {
  const path = rawPath.trim() || '/'
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  return withLeadingSlash
    .split('/')
    .map(segment => encodeRFC3986(decodeURIComponent(segment)))
    .join('/')
}

export function canonicalizeQuery(rawQuery: string) {
  if (!rawQuery) return ''
  const pairs = rawQuery
    .split('&')
    .filter(Boolean)
    .map(rawPair => {
      const [rawKey, ...rawValue] = rawPair.split('=')
      const decode = (value: string) =>
        decodeURIComponent(value.replace(/\+/g, ' '))
      const key = decode(rawKey)
      const value = decode(rawValue.length > 0 ? rawValue.join('=') : '')
      return `${encodeRFC3986(key)}=${encodeRFC3986(value)}`
    })
  return pairs.sort().join('&')
}

export function requestTarget(rawUrl: string) {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl)) {
    const parsed = new URL(rawUrl)
    return {
      path: canonicalizePath(parsed.pathname || '/'),
      query: canonicalizeQuery(parsed.search.slice(1)),
    }
  }
  const question = rawUrl.indexOf('?')
  const rawPath = question >= 0 ? rawUrl.slice(0, question) : rawUrl
  const rawQuery = question >= 0 ? rawUrl.slice(question + 1) : ''
  return {
    path: canonicalizePath(rawPath || '/'),
    query: canonicalizeQuery(rawQuery),
  }
}

export function canonicalRequest(options: {
  method: string
  path: string
  query: string
  bodyDigest: string
  userId: string
  timestamp: string
  nonce: string
}) {
  return [
    options.method.trim().toUpperCase(),
    canonicalizePath(options.path),
    canonicalizeQuery(options.query),
    options.bodyDigest.trim().toLowerCase(),
    options.userId.trim(),
    options.timestamp.trim(),
    options.nonce.trim(),
  ].join('\n')
}

export function signGatewayIdentity(options: {
  method: string
  path: string
  query: string
  bodyDigest: string
  userId: string
  timestamp: string
  nonce: string
}) {
  return createHmac('sha256', config.gatewayInternalSecret)
    .update(canonicalRequest(options))
    .digest('hex')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

async function readBodyDigest(c: Context) {
  const contentLength = Number(c.req.header('content-length') || 0)
  if (contentLength > config.gatewaySignatureBodyMaxBytes)
    throw new Error('body too large')
  const rawRequest = c.req.raw
  if (!rawRequest.body) return EMPTY_BODY_DIGEST

  // Consume a clone. The original Request stream remains available to Hono and
  // route handlers, avoiding the classic signature middleware body-loss bug.
  const reader = rawRequest.clone().body?.getReader()
  if (!reader) return EMPTY_BODY_DIGEST
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > config.gatewaySignatureBodyMaxBytes)
        throw new Error('body too large')
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
  return createHash('sha256').update(body).digest('hex')
}

export async function verifyGatewayIdentity(options: {
  method: string
  rawUrl: string
  bodyDigest: string
  userId: string
  timestamp: string
  nonce: string
  signature: string
  bodyHeader: string
}) {
  if (!/^\d{1,15}$/.test(options.timestamp)) return false
  if (!/^[a-f0-9]{32,128}$/i.test(options.nonce)) return false
  if (!/^[a-f0-9]{64}$/i.test(options.bodyDigest)) return false
  if (!/^[a-f0-9]{64}$/i.test(options.bodyHeader)) return false
  if (!safeEqual(options.bodyDigest, options.bodyHeader)) return false

  const timestampSeconds = Number(options.timestamp)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (!Number.isSafeInteger(timestampSeconds)) return false
  if (Math.abs(nowSeconds - timestampSeconds) > config.authClockSkewSeconds)
    return false

  let target: ReturnType<typeof requestTarget>
  try {
    target = requestTarget(options.rawUrl)
  } catch {
    return false
  }
  const expected = signGatewayIdentity({
    method: options.method,
    path: target.path,
    query: target.query,
    bodyDigest: options.bodyDigest,
    userId: options.userId,
    timestamp: options.timestamp,
    nonce: options.nonce,
  })
  if (!safeEqual(expected, options.signature)) return false

  try {
    // SET NX EX is the replay fence. Redis failures reject the request rather
    // than silently falling back to a process-local map in production.
    return await nonceStore.reserve(
      options.nonce,
      config.gatewayNonceTtlSeconds
    )
  } catch (error) {
    logger.error({ msg: 'gateway nonce reservation failed', err: error })
    return false
  }
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

export function getAuthenticatedUserId(c: Context): string | null {
  const authenticated = c.get(AUTHENTICATED_KEY as never) as boolean | undefined
  if (!authenticated) return null
  return (c.get(USER_ID_KEY as never) as string | undefined) ?? null
}

export function isConfiguredAdminUser(userId: string | null | undefined) {
  return Boolean(userId && config.agentAdminUserIds.includes(userId))
}

export function isAuthenticatedAdmin(c: Context) {
  return isConfiguredAdminUser(getAuthenticatedUserId(c))
}

export async function gatewayIdentityMiddleware(c: Context, next: Next) {
  const userId = c.req.header('X-User-ID')?.trim()
  const timestamp = c.req.header('X-Gateway-Timestamp')?.trim()
  const nonce = c.req.header('X-Gateway-Nonce')?.trim()
  const bodyHeader = c.req.header('X-Gateway-Body-SHA256')?.trim()
  const signature = c.req.header('X-Gateway-Signature')?.trim()

  if (!userId || !timestamp || !nonce || !bodyHeader || !signature) {
    if (config.allowAnonymousOwner) {
      c.set(USER_ID_KEY as never, ANONYMOUS_OWNER_ID as never)
      c.set(AUTHENTICATED_KEY as never, false as never)
      await next()
      return
    }
    return unauthorized(c)
  }

  let bodyDigest: string
  try {
    bodyDigest = await readBodyDigest(c)
  } catch {
    return unauthorized(c)
  }
  const valid = await verifyGatewayIdentity({
    method: c.req.method,
    rawUrl: c.req.raw.url,
    bodyDigest,
    bodyHeader,
    userId,
    timestamp,
    nonce,
    signature,
  })
  if (!valid) return unauthorized(c)

  c.set(USER_ID_KEY as never, userId as never)
  c.set(AUTHENTICATED_KEY as never, true as never)
  await next()
}
