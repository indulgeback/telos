import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { upstreamHandshakeStatus } from '../dist/services/realtime/volc-realtime.js'

describe('upstreamHandshakeStatus', () => {
  it('extracts the HTTP status from a ws handshake rejection', () => {
    assert.equal(
      upstreamHandshakeStatus(new Error('Unexpected server response: 403')),
      403
    )
    assert.equal(
      upstreamHandshakeStatus(new Error('Unexpected server response: 401')),
      401
    )
  })

  it('returns null for non-handshake errors', () => {
    assert.equal(upstreamHandshakeStatus(new Error('connect ETIMEDOUT')), null)
    assert.equal(upstreamHandshakeStatus(new Error('boom')), null)
    assert.equal(upstreamHandshakeStatus('boom'), null)
    assert.equal(upstreamHandshakeStatus(undefined), null)
  })
})
