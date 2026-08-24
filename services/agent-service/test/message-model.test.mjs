import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveMessageModelKey } from '../dist/services/message-model.js'

describe('message model persistence', () => {
  it('prefers the resolved model stored on the assistant message', () => {
    assert.equal(
      resolveMessageModelKey({
        messageMetadata: { modelKey: 'google/gemini-3.7-flash' },
        runInput: { model: 'deepseek-v4-flash' },
      }),
      'google/gemini-3.7-flash'
    )
  })

  it('recovers legacy messages from the model requested by their run', () => {
    assert.equal(
      resolveMessageModelKey({
        messageMetadata: {},
        runInput: { model: 'deepseek-v4-pro' },
      }),
      'deepseek-v4-pro'
    )
  })

  it('does not guess when a legacy run did not record its model', () => {
    assert.equal(
      resolveMessageModelKey({
        messageMetadata: {},
        runInput: {},
      }),
      null
    )
  })
})
