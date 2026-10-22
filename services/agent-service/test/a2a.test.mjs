import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractTextFromA2AMessage,
  mapRunStatusToA2AState,
} from '../dist/routes/a2a.js'

describe('extractTextFromA2AMessage', () => {
  it('joins text parts with newlines', () => {
    const text = extractTextFromA2AMessage({
      message: {
        role: 'user',
        parts: [
          { kind: 'text', text: '第一段' },
          { kind: 'text', text: 'second part' },
        ],
      },
    })
    assert.equal(text, '第一段\nsecond part')
  })

  it('ignores non-text parts and malformed params', () => {
    assert.equal(
      extractTextFromA2AMessage({
        message: { parts: [{ kind: 'file', file: {} }, { kind: 'text', text: 'keep' }] },
      }),
      'keep'
    )
    assert.equal(extractTextFromA2AMessage(null), '')
    assert.equal(extractTextFromA2AMessage({ message: null }), '')
    assert.equal(extractTextFromA2AMessage({ message: { parts: [] } }), '')
  })
})

describe('mapRunStatusToA2AState', () => {
  it('maps the full internal status set', () => {
    assert.equal(mapRunStatusToA2AState('queued'), 'submitted')
    assert.equal(mapRunStatusToA2AState('running'), 'working')
    assert.equal(mapRunStatusToA2AState('awaiting_approval'), 'input-required')
    assert.equal(mapRunStatusToA2AState('completed'), 'completed')
    assert.equal(mapRunStatusToA2AState('failed'), 'failed')
    assert.equal(mapRunStatusToA2AState('cancelled'), 'canceled')
    assert.equal(mapRunStatusToA2AState('unknown-state'), 'working')
  })
})
