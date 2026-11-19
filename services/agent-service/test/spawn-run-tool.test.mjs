import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateSpawnRequest,
  executeSpawn,
  executeListSubagentRuns,
  buildSpawnRunTool,
  buildListSubagentRunsTool,
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

function createFakeDeps(overrides = {}) {
  const calls = {
    createdThreads: [],
    appendedMessages: [],
    createdRuns: [],
    enqueued: [],
    events: [],
  }
  const fakePersistence = {
    async event(type, payload) {
      calls.events.push({ type, payload })
    },
  }
  const baseDeps = {
    async findRunById(id) {
      return (
        overrides.runsById?.[id] ?? {
          id,
          agentId: 'agent-self',
          parentRunId: null,
          metadata: {},
          thread: { ownerId: 'user-1' },
        }
      )
    },
    async findAgentById(id) {
      return overrides.agentById?.[id] ?? { id, name: 'self-agent' }
    },
    async findAccessibleAgent(id) {
      if (overrides.inaccessibleAgentIds?.includes(id)) return null
      return { id, name: 'target-agent' }
    },
    async countActiveChildren() {
      return overrides.activeChildCount ?? 0
    },
    async createThread(opts) {
      calls.createdThreads.push(opts)
      return { id: `child-thread-${calls.createdThreads.length}` }
    },
    async appendUserMessage(threadId, text) {
      calls.appendedMessages.push({ threadId, text })
      return { id: `msg-${calls.appendedMessages.length}` }
    },
    async createAgentRun(data) {
      calls.createdRuns.push(data)
      return { id: `child-run-${calls.createdRuns.length}` }
    },
    async enqueueAgentRun(data) {
      calls.enqueued.push(data)
    },
    async listChildrenByParent() {
      return overrides.children ?? []
    },
    ...overrides.deps,
  }
  return { deps: baseDeps, calls, fakePersistence }
}

test('executeSpawn happy path: thread + message + run + enqueue', async () => {
  const { deps, calls, fakePersistence } = createFakeDeps()
  const result = await executeSpawn(
    { runId: 'root-run-1', persistence: fakePersistence },
    deps,
    {
      task: '调研 deepseek harness 的 subagent 实现',
    }
  )
  const parsed = JSON.parse(result)
  assert.equal(parsed.status, 'queued')
  assert.equal(parsed.run_id, 'child-run-1')
  assert.equal(calls.createdThreads[0].title.startsWith('↳ '), true)
  assert.equal(
    calls.createdThreads[0].metadata.spawnedByRunId,
    'root-run-1'
  )
  assert.equal(calls.appendedMessages[0].threadId, 'child-thread-1')
  assert.deepEqual(calls.createdRuns[0].parentRunId, 'root-run-1')
  assert.deepEqual(calls.createdRuns[0].input, {
    effectiveInput: '调研 deepseek harness 的 subagent 实现',
  })
  assert.equal(calls.createdRuns[0].metadata.spawnDepth, 1)
  assert.deepEqual(calls.enqueued, [{ runId: 'child-run-1' }])
  assert.equal(calls.events[0].type, 'spawn_run.created')
})

test('executeSpawn derives label from task when label missing', async () => {
  const { deps, calls } = createFakeDeps()
  await executeSpawn({ runId: 'root-run-1' }, deps, {
    task: '这是一段很长的中文任务描述用来验证标签截断逻辑是否生效',
  })
  assert.equal(
    calls.createdRuns[0].metadata.label,
    '这是一段很长的中文任务描述用来验证标签截断逻辑是' // titleFromInput 的 24 字符截断
  )
})

test('executeSpawn surfaces verdict errors as text', async () => {
  const { deps } = createFakeDeps({
    runsById: {
      'child-run-x': {
        id: 'child-run-x',
        agentId: 'agent-self',
        parentRunId: 'root-run-1',
        metadata: {},
        thread: { ownerId: 'user-1' },
      },
    },
  })
  const result = await executeSpawn(
    { runId: 'child-run-x' },
    deps,
    { task: '再来一层' }
  )
  const parsed = JSON.parse(result)
  assert.equal(parsed.run_id, undefined)
  assert.match(parsed.error, /深度/)
})

test('executeSpawn rejects inaccessible target agent', async () => {
  const { deps } = createFakeDeps({
    inaccessibleAgentIds: ['agent-other'],
  })
  const result = await executeSpawn({ runId: 'root-run-1' }, deps, {
    task: '干活',
    agent_id: 'agent-other',
  })
  const parsed = JSON.parse(result)
  assert.equal(parsed.run_id, undefined)
  assert.match(parsed.error, /agent/)
})

test('executeListSubagentRuns returns labeled summaries', async () => {
  const { deps } = createFakeDeps({
    children: [
      {
        id: 'child-run-1',
        threadId: 'child-thread-1',
        status: 'completed',
        createdAt: '2026-11-19T00:00:00.000Z',
        metadata: { label: '调研任务' },
      },
      {
        id: 'child-run-2',
        threadId: 'child-thread-2',
        status: 'running',
        createdAt: '2026-11-19T00:01:00.000Z',
        metadata: {},
      },
    ],
  })
  const result = await executeListSubagentRuns({ runId: 'root-run-1' }, deps)
  const parsed = JSON.parse(result)
  assert.equal(parsed.children.length, 2)
  assert.equal(parsed.children[0].label, '调研任务')
  assert.equal(parsed.children[0].status, 'completed')
  assert.equal(parsed.children[1].label, '')
})

test('tool builders expose stable names and schemas', () => {
  const { deps } = createFakeDeps()
  const spawn = buildSpawnRunTool({ runId: 'r1' }, deps)
  const list = buildListSubagentRunsTool({ runId: 'r1' }, deps)
  assert.equal(spawn.name, 'spawn_run')
  assert.equal(list.name, 'list_subagent_runs')
  assert.deepEqual(spawn.parameters.required, ['task'])
})
