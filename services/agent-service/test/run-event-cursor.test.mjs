import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRunEventCursor } from '../dist/services/run-event-cursor.js'

describe('run event stream cursor', () => {
  it('uses 0-0 when no replay event has been sent yet', () => {
    assert.equal(normalizeRunEventCursor(), '0-0')
    assert.equal(normalizeRunEventCursor(''), '0-0')
  })

  it('keeps valid Redis stream IDs and rejects malformed cursors', () => {
    assert.equal(normalizeRunEventCursor('1724480000000-3'), '1724480000000-3')
    assert.equal(normalizeRunEventCursor('$'), '0-0')
    assert.equal(normalizeRunEventCursor('not-a-stream-id'), '0-0')
  })
})
