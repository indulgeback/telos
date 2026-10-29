import assert from 'node:assert/strict'
import { test } from 'node:test'
import { upsertToolPart } from '../dist/services/run-executor.js'

function makeParts() {
  return []
}

const startPart = (callId, toolName) => ({
  type: 'tool',
  toolCallId: callId,
  toolName,
  state: 'input-available',
  input: { query: '用户喜欢的笑话类型' },
})

test('attaches the result to the started part when the end event has no call id', () => {
  const parts = makeParts()
  upsertToolPart(parts, startPart('call_rgi2abc', 'search_memory'))

  // 上游 tool_end 不回传 callId，执行器现场合成了新 id
  upsertToolPart(parts, {
    type: 'tool',
    toolCallId: 'search_memory-1793244543588-37a4rokqobl',
    toolName: 'search_memory',
    state: 'output-available',
    output: { query: '用户喜欢的笑话类型', memories: ['用户喜欢程序员笑话'] },
  })

  assert.equal(parts.length, 1)
  assert.equal(parts[0].toolCallId, 'call_rgi2abc')
  assert.equal(parts[0].state, 'output-available')
})

test('keeps matching by call id when the end event carries one', () => {
  const parts = makeParts()
  upsertToolPart(parts, startPart('call_a', 'web_search'))
  upsertToolPart(parts, {
    type: 'tool',
    toolCallId: 'call_a',
    toolName: 'web_search',
    state: 'output-available',
    output: 'ok',
  })

  assert.equal(parts.length, 1)
  assert.equal(parts[0].state, 'output-available')
})

test('still appends a distinct part for an unrelated new call', () => {
  const parts = makeParts()
  upsertToolPart(parts, startPart('call_a', 'web_search'))
  upsertToolPart(parts, {
    type: 'tool',
    toolCallId: 'call_b',
    toolName: 'search_memory',
    state: 'output-available',
    output: 'ok',
  })

  assert.equal(parts.length, 2)
  assert.equal(parts[0].state, 'input-available')
  assert.equal(parts[1].state, 'output-available')
})
