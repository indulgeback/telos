import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GEMINI_THOUGHT_TAG_MARKER,
  GeminiThoughtStreamParser,
  stripGeminiThoughtTags,
} from '../dist/services/gemini-thought-signature-model.js'

test('parses Gemini thought tags split across opening and closing chunks', () => {
  const parser = new GeminiThoughtStreamParser()
  const chunks = [
    `开头<${GEMINI_THOUGHT_TAG_MARKER.slice(0, 8)}`,
    `${GEMINI_THOUGHT_TAG_MARKER.slice(8)}>思`,
    `考</${GEMINI_THOUGHT_TAG_MARKER.slice(0, 7)}`,
    `${GEMINI_THOUGHT_TAG_MARKER.slice(7)}>正文`,
  ]
  const result = chunks.reduce(
    (all, chunk) => {
      const next = parser.push(chunk)
      all.reasoning += next.reasoning
      all.text += next.text
      return all
    },
    { reasoning: '', text: '' }
  )
  const tail = parser.finish()
  result.reasoning += tail.reasoning
  result.text += tail.text

  assert.equal(result.reasoning, '思考')
  assert.equal(result.text, '开头正文')
})

test('does not treat a normal think tag as Gemini reasoning', () => {
  assert.equal(
    stripGeminiThoughtTags('<think>普通正文</think>'),
    '<think>普通正文</think>'
  )
})

test('resets between model responses and keeps incomplete marker text safe', () => {
  const parser = new GeminiThoughtStreamParser()
  const open = `<${GEMINI_THOUGHT_TAG_MARKER}>`
  const close = `</${GEMINI_THOUGHT_TAG_MARKER}>`
  assert.deepEqual(parser.push(`${open}第一${close}甲`), {
    reasoning: '第一',
    text: '甲',
  })
  assert.deepEqual(parser.finish(), { reasoning: '', text: '' })
  assert.deepEqual(parser.push(`乙${open}第二`), {
    reasoning: '第二',
    text: '乙',
  })
  assert.deepEqual(parser.finish(), { reasoning: '', text: '' })
  assert.equal(
    stripGeminiThoughtTags('<telos_gemini_thoug'),
    '<telos_gemini_thoug'
  )
})
