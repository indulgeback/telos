import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractGeminiThoughtSignatureFromStreamEvent,
  GEMINI_THOUGHT_SIGNATURE_METADATA_KEY,
  prepareGeminiSignatureHistory,
} from '../dist/services/gemini-thought-signature-model.js'
import {
  messageToAgentInput,
  stripInternalMessageMetadata,
} from '../dist/services/session.js'

test('persists and restores a Gemini text signature across user turns', () => {
  const storedMessage = {
    role: 'assistant',
    content: '上一轮正文',
    metadata: {
      modelKey: 'google/gemini-3.7-flash',
      [GEMINI_THOUGHT_SIGNATURE_METADATA_KEY]: 'persisted-signature',
    },
  }
  const neutralHistoryItem = messageToAgentInput(storedMessage)

  const geminiHistory = prepareGeminiSignatureHistory(
    [neutralHistoryItem],
    true
  )
  assert.equal(geminiHistory[0].providerData, undefined)
  assert.equal(geminiHistory[0].content[0].text, '上一轮正文')
  assert.deepEqual(geminiHistory[0].content[1], {
    type: 'output_text',
    text: '',
    providerData: {
      extra_content: {
        google: { thought_signature: 'persisted-signature' },
      },
    },
  })

  const otherProviderHistory = prepareGeminiSignatureHistory(
    [neutralHistoryItem],
    false
  )
  assert.equal(otherProviderHistory[0].content, '上一轮正文')
  assert.equal(otherProviderHistory[0].providerData, undefined)
})

test('extracts a bounded signature from a Runner response_done event', () => {
  const event = {
    type: 'raw_model_stream_event',
    data: {
      type: 'response_done',
      response: {
        output: [
          {
            type: 'message',
            content: [
              { type: 'output_text', text: '正文' },
              {
                type: 'output_text',
                text: '',
                providerData: {
                  extra_content: {
                    google: { thought_signature: 'response-signature' },
                  },
                },
              },
            ],
          },
        ],
      },
    },
  }
  assert.equal(
    extractGeminiThoughtSignatureFromStreamEvent(event),
    'response-signature'
  )
})

test('does not expose the opaque Gemini signature in message APIs', () => {
  assert.deepEqual(
    stripInternalMessageMetadata({
      modelKey: 'google/gemini-3.7-flash',
      [GEMINI_THOUGHT_SIGNATURE_METADATA_KEY]: 'opaque-signature',
    }),
    { modelKey: 'google/gemini-3.7-flash' }
  )
})
