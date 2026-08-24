import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CHAT_MODEL_MIGRATIONS,
  DEFAULT_CHAT_MODELS,
  normalizeChatModelKey,
} from '../dist/services/chat-model-catalog.js'

describe('chat model catalog', () => {
  it('contains only unique production model IDs', () => {
    const modelKeys = DEFAULT_CHAT_MODELS.map(model => model.modelKey)

    assert.equal(new Set(modelKeys).size, modelKeys.length)
    assert.equal(modelKeys.length, 10)
  })

  it('keeps the ShortAPI model unchanged', () => {
    const shortApiModels = DEFAULT_CHAT_MODELS.filter(
      model => model.provider === 'shortapi'
    )

    assert.deepEqual(
      shortApiModels.map(model => model.modelKey),
      ['openai/gpt-5.5']
    )
  })

  it('replaces deprecated catalog entries with verified successors', () => {
    const modelKeys = new Set(DEFAULT_CHAT_MODELS.map(model => model.modelKey))

    for (const [previousModelKey, nextModelKey] of Object.entries(
      CHAT_MODEL_MIGRATIONS
    )) {
      assert.equal(modelKeys.has(previousModelKey), false)
      assert.equal(modelKeys.has(nextModelKey), true)
      assert.equal(normalizeChatModelKey(previousModelKey), nextModelKey)
    }
  })

  it('does not rewrite current or unknown model IDs', () => {
    assert.equal(
      normalizeChatModelKey('deepseek-v4-flash'),
      'deepseek-v4-flash'
    )
    assert.equal(normalizeChatModelKey('custom-model'), 'custom-model')
  })
})
