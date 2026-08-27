import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  compareRunEventCursors,
  normalizeRunEventCursor,
} from '../dist/services/run-event-cursor.js'

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

  it('orders stream IDs without losing 64-bit precision', () => {
    assert.equal(
      compareRunEventCursors('1724480000000-4', '1724480000000-3'),
      1
    )
    assert.equal(
      compareRunEventCursors('9999999999999999999-0', '1724480000000-99'),
      1
    )
    assert.equal(compareRunEventCursors('10-2', '10-2'), 0)
  })
})
