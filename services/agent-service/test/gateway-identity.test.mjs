import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { Hono } from 'hono'
import {
  canonicalRequest,
  canonicalizeQuery,
  setGatewayNonceStoreForTests,
  signGatewayIdentity,
  gatewayIdentityMiddleware,
  verifyGatewayIdentity,
} from '../dist/middleware/gatewayIdentity.js'

const body = JSON.stringify({ hello: 'world' })
const bodyDigest = createHash('sha256').update(body).digest('hex')
const emptyDigest = createHash('sha256').update('').digest('hex')

test('canonical query is RFC3986 encoded and deterministically sorted', () => {
  assert.equal(
    canonicalizeQuery('tag=b&q=hello+world&tag=a&empty'),
    'empty=&q=hello%20world&tag=a&tag=b'
  )
  assert.match(
    canonicalRequest({
      method: 'post',
      path: '/api/agent/threads',
      query: 'b=2&a=1',
      bodyDigest,
      userId: 'user-1',
      timestamp: '1700000000',
      nonce: 'a'.repeat(32),
    }),
    /^POST\n\/api\/agent\/threads\na=1&b=2\n/
  )
})

test('valid signature is one-shot and binds query and body digest', async () => {
  const used = new Set()
  setGatewayNonceStoreForTests({
    async reserve(nonce) {
      if (used.has(nonce)) return false
      used.add(nonce)
      return true
    },
  })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = 'b'.repeat(32)
  const rawUrl = '/api/agent/threads?b=2&a=hello+world'
  const signature = signGatewayIdentity({
    method: 'POST',
    path: '/api/agent/threads',
    query: 'a=hello+world&b=2',
    bodyDigest,
    userId: 'user-1',
    timestamp,
    nonce,
  })
  const options = {
    method: 'POST',
    rawUrl,
    bodyDigest,
    bodyHeader: bodyDigest,
    userId: 'user-1',
    timestamp,
    nonce,
    signature,
  }
  assert.equal(await verifyGatewayIdentity(options), true)
  assert.equal(await verifyGatewayIdentity(options), false)

  const changedNonce = 'c'.repeat(32)
  const changedSignature = signGatewayIdentity({
    method: 'POST',
    path: '/api/agent/threads',
    query: 'a=hello+world&b=2',
    bodyDigest: emptyDigest,
    userId: 'user-1',
    timestamp,
    nonce: changedNonce,
  })
  assert.equal(
    await verifyGatewayIdentity({
      ...options,
      nonce: changedNonce,
      bodyDigest: emptyDigest,
      bodyHeader: bodyDigest,
      signature: changedSignature,
    }),
    false
  )
})

test('body digest header is mandatory even when the signature is otherwise valid', async () => {
  setGatewayNonceStoreForTests({
    async reserve() {
      return true
    },
  })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = 'e'.repeat(32)
  const signature = signGatewayIdentity({
    method: 'POST',
    path: '/echo',
    query: '',
    bodyDigest,
    userId: 'user-1',
    timestamp,
    nonce,
  })
  assert.equal(
    await verifyGatewayIdentity({
      method: 'POST',
      rawUrl: '/echo',
      bodyDigest,
      bodyHeader: '',
      userId: 'user-1',
      timestamp,
      nonce,
      signature,
    }),
    false
  )
})

test('middleware hashes a clone and leaves the original body readable', async () => {
  const used = new Set()
  setGatewayNonceStoreForTests({
    async reserve(nonce) {
      if (used.has(nonce)) return false
      used.add(nonce)
      return true
    },
  })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = 'd'.repeat(32)
  const signature = signGatewayIdentity({
    method: 'POST',
    path: '/echo',
    query: '',
    bodyDigest,
    userId: 'user-1',
    timestamp,
    nonce,
  })
  const app = new Hono()
  app.use('*', gatewayIdentityMiddleware)
  app.post('/echo', async c => c.text(await c.req.text()))
  const response = await app.request('/echo', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'X-User-ID': 'user-1',
      'X-Gateway-Timestamp': timestamp,
      'X-Gateway-Nonce': nonce,
      'X-Gateway-Body-SHA256': bodyDigest,
      'X-Gateway-Signature': signature,
    },
  })
  assert.equal(response.status, 200)
  assert.equal(await response.text(), body)
})
