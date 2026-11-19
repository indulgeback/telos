import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSettlementMessage,
  deliverSettlement,
  triggerParentFollowUp,
  maybeTriggerFollowUpForChildren,
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

function createFakeSettlementDeps(seed = {}) {
  const state = {
    messages: [], // { threadId, text }
    createdRuns: [],
    enqueued: [],
    locks: new Map(seed.locks ?? []), // key -> true
    released: [],
  }
  const runsById = new Map(Object.entries(seed.runsById ?? {}))
  const deps = {
    async findRunById(id) {
      return runsById.get(id) ?? null
    },
    async appendUserMessage(threadId, text) {
      state.messages.push({ threadId, text })
    },
    async createAgentRun(data) {
      state.createdRuns.push(data)
      return { id: `followup-${state.createdRuns.length}` }
    },
    async enqueueAgentRun(data) {
      state.enqueued.push(data)
    },
    async hasActiveRunOnThread(threadId) {
      return Boolean(seed.activeThreadIds?.[threadId])
    },
    async countTerminalChildren(parentRunId) {
      return seed.terminalChildCounts?.[parentRunId] ?? 0
    },
    async acquireLock(key) {
      if (state.locks.has(key)) return false
      state.locks.set(key, true)
      return true
    },
    async releaseLock(key) {
      state.locks.delete(key)
      state.released.push(key)
    },
    logger: { warn() {}, error() {} },
  }
  return { deps, state }
}

const parentRun = {
  id: 'parent-1',
  agentId: 'agent-self',
  threadId: 'parent-thread',
  parentRunId: null,
  status: 'completed',
  finalOutput: '父结论',
  error: null,
  metadata: {},
}
const childRun = {
  id: 'child-1',
  agentId: 'agent-self',
  threadId: 'child-thread',
  parentRunId: 'parent-1',
  status: 'completed',
  finalOutput: '子结论',
  error: null,
  metadata: { label: '调研任务' },
}

test('deliverSettlement ignores non-child runs', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'root-1': { ...parentRun, id: 'root-1' } },
  })
  await deliverSettlement('root-1', deps)
  assert.equal(state.messages.length, 0)
})

test('deliverSettlement writes notice then triggers follow-up', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'child-1': childRun, 'parent-1': parentRun },
  })
  await deliverSettlement('child-1', deps)
  assert.equal(state.messages.length, 1)
  assert.equal(state.messages[0].threadId, 'parent-thread')
  assert.match(state.messages[0].text, /^↳ \[子任务完成\] 调研任务：/)
  assert.equal(state.createdRuns.length, 1)
  assert.equal(state.createdRuns[0].threadId, 'parent-thread')
  assert.equal(state.createdRuns[0].metadata.autoTurnDepth, 1)
  assert.deepEqual(state.enqueued, [{ runId: 'followup-1' }])
})

test('deliverSettlement is idempotent under the lock', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'child-1': childRun, 'parent-1': parentRun },
    locks: new Map([['settlement:child-1', true]]),
  })
  await deliverSettlement('child-1', deps)
  assert.equal(state.messages.length, 0)
  assert.equal(state.createdRuns.length, 0)
})

test('failed child produces a failure notice', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: {
      'child-1': { ...childRun, status: 'failed', finalOutput: null, error: 'boom' },
      'parent-1': parentRun,
    },
  })
  await deliverSettlement('child-1', deps)
  assert.match(state.messages[0].text, /^↳ \[子任务失败\] 调研任务 未能完成：boom/)
})

test('follow-up skips while parent thread has an active run', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    activeThreadIds: { 'parent-thread': true },
  })
  await triggerParentFollowUp('parent-1', {}, deps)
  assert.equal(state.createdRuns.length, 0)
})

test('authoritative trigger clears a stale debounce lock', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    locks: new Map([['followup:parent-1', true]]),
  })
  await triggerParentFollowUp('parent-1', { authoritative: true }, deps)
  assert.equal(state.released.includes('followup:parent-1'), true)
  assert.equal(state.createdRuns.length, 1)
})

test('non-authoritative trigger respects the debounce lock (regression)', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    locks: new Map([['followup:parent-1', true]]),
  })
  await triggerParentFollowUp('parent-1', {}, deps)
  assert.equal(state.createdRuns.length, 0)
})

test('maybeTriggerFollowUpForChildren is a no-op without children', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
  })
  await maybeTriggerFollowUpForChildren('parent-1', deps)
  assert.equal(state.createdRuns.length, 0)
})

test('maybeTriggerFollowUpForChildren triggers authoritatively with children', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    terminalChildCounts: { 'parent-1': 2 },
    locks: new Map([['followup:parent-1', true]]),
  })
  await maybeTriggerFollowUpForChildren('parent-1', deps)
  assert.equal(state.createdRuns.length, 1)
})
