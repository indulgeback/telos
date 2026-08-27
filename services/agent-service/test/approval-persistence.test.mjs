import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { queueRunWhenApprovalBatchIsComplete } from '../dist/services/approval-persistence.js'

describe('durable approval batch completion', () => {
  it('locks the run before counting siblings and queues exactly once', async () => {
    const calls = []
    let runStatus = 'awaiting_approval'
    let outboxEvent = null
    let lockQuery = ''

    const tx = {
      async $queryRaw(strings) {
        lockQuery = strings.join(' ')
        calls.push('lock-run')
        return [{ id: 'run-1' }]
      },
      agentToolApproval: {
        async findMany() {
          calls.push('expire-siblings')
          return []
        },
        async count() {
          calls.push('count-pending')
          return 0
        },
      },
      agentToolCall: {
        async updateMany() {
          throw new Error('no sibling should be expired')
        },
      },
      agentRun: {
        async updateMany() {
          calls.push('queue-run')
          if (runStatus !== 'awaiting_approval') return { count: 0 }
          runStatus = 'queued'
          return { count: 1 }
        },
      },
      agentOutboxEvent: {
        async upsert({ create }) {
          calls.push('outbox')
          if (!outboxEvent) outboxEvent = { id: 'outbox-1', ...create }
          return outboxEvent
        },
      },
    }

    const results = await Promise.all([
      queueRunWhenApprovalBatchIsComplete(tx, 'run-1', new Date(1)),
      queueRunWhenApprovalBatchIsComplete(tx, 'run-1', new Date(1)),
    ])

    assert.deepEqual(results.sort(), [false, true])
    assert.equal(runStatus, 'queued')
    assert.equal(outboxEvent?.eventType, 'agent_run.approval_decided')
    assert.equal(calls.filter(call => call === 'outbox').length, 1)
    assert.match(lockQuery, /FOR UPDATE/)
    assert.ok(
      calls.indexOf('lock-run') < calls.indexOf('count-pending'),
      `expected run lock before pending count, got ${calls.join(' -> ')}`
    )
  })
})
