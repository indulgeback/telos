import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSettlementMessage,
  SETTLEMENT_OUTPUT_LIMIT_BYTES,
} from '../dist/services/settlement.js'

test('completed with output prefixes and includes the result', () => {
  const text = buildSettlementMessage({
    status: 'completed',
    label: '调研任务',
    finalOutput: '结论：xxx',
  })
  assert.match(text, /^↳ \[子任务完成\] 调研任务：/)
  assert.ok(text.includes('结论：xxx'))
})

test('completed without output explains the empty result', () => {
  const text = buildSettlementMessage({
    status: 'completed',
    label: 't',
    finalOutput: null,
  })
  assert.match(text, /没有产出文本结果/)
})

test('failed includes the reason and stays actionable', () => {
  const text = buildSettlementMessage({
    status: 'failed',
    label: 't',
    error: 'boom',
  })
  assert.match(text, /^↳ \[子任务失败\] t 未能完成：boom/)
})

test('failed without error falls back to unknown reason', () => {
  const text = buildSettlementMessage({
    status: 'failed',
    label: 't',
    error: null,
  })
  assert.match(text, /原因未知/)
})

test('cancelled explains the stop', () => {
  const text = buildSettlementMessage({
    status: 'cancelled',
    label: 't',
  })
  assert.match(text, /^↳ \[子任务中止\]/)
})

test('oversized output is truncated under the byte limit', () => {
  const text = buildSettlementMessage({
    status: 'completed',
    label: 't',
    finalOutput: '很长的结果'.repeat(5000),
  })
  assert.ok(Buffer.byteLength(text, 'utf8') < SETTLEMENT_OUTPUT_LIMIT_BYTES * 2)
  assert.match(text, /截断/)
})
