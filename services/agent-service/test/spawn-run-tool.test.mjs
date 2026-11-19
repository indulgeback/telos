import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateSpawnRequest,
  MAX_ACTIVE_CHILD_RUNS,
  MAX_AUTO_TURN_DEPTH,
} from '../dist/services/spawn-run-tool.js'

const base = {
  enabled: true,
  parentRunId: null,
  autoTurnDepth: 0,
  activeChildCount: 0,
  task: '研究一下 xxx 的现状',
  targetAgentAccessible: true,
}

test('passes on a normal request', () => {
  assert.deepEqual(evaluateSpawnRequest(base), { ok: true })
})

test('rejects when the feature switch is off', () => {
  const v = evaluateSpawnRequest({ ...base, enabled: false })
  assert.equal(v.ok, false)
})

test('rejects depth > 1 (child run cannot spawn)', () => {
  const v = evaluateSpawnRequest({ ...base, parentRunId: 'parent-1' })
  assert.equal(v.ok, false)
  if (!v.ok) assert.match(v.error, /深度/)
})

test('rejects auto turn chain over the cap', () => {
  const v = evaluateSpawnRequest({ ...base, autoTurnDepth: MAX_AUTO_TURN_DEPTH })
  assert.equal(v.ok, false)
})

test('rejects when active children reach the cap', () => {
  const v = evaluateSpawnRequest({
    ...base,
    activeChildCount: MAX_ACTIVE_CHILD_RUNS,
  })
  assert.equal(v.ok, false)
})

test('rejects inaccessible target agent', () => {
  const v = evaluateSpawnRequest({ ...base, targetAgentAccessible: false })
  assert.equal(v.ok, false)
  if (!v.ok) assert.match(v.error, /agent/i)
})

test('rejects empty and oversized task', () => {
  assert.equal(evaluateSpawnRequest({ ...base, task: '   ' }).ok, false)
  assert.equal(
    evaluateSpawnRequest({ ...base, task: 'x'.repeat(512 * 1024 + 1) }).ok,
    false
  )
})
