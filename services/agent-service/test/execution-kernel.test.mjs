import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalizeToolArguments,
  hashToolArguments,
} from '../dist/services/tool-checkpoint.js'
import { runLeaseWhere } from '../dist/services/run-lease.js'
import { queueJobId } from '../dist/services/run-queue.js'
import { mergeResumedOutput } from '../dist/services/run-executor.js'

describe('phase 2 execution kernel primitives', () => {
  it('hashes semantically equivalent object arguments identically', () => {
    assert.equal(
      canonicalizeToolArguments({ z: 2, nested: { b: true, a: 1 } }),
      canonicalizeToolArguments({ nested: { a: 1, b: true }, z: 2 })
    )
    assert.equal(
      hashToolArguments({ z: 2, nested: { b: true, a: 1 } }),
      hashToolArguments({ nested: { a: 1, b: true }, z: 2 })
    )
    assert.notEqual(
      hashToolArguments({ value: 1 }),
      hashToolArguments({ value: 2 })
    )
  })

  it('binds terminal mutations to run, attempt, lease, and fence', () => {
    const where = runLeaseWhere(
      {
        runId: 'run-1',
        attemptId: 'attempt-1',
        attempt: 1,
        workerId: 'worker-1',
        leaseToken: 'lease-1',
        fenceToken: 1,
        leaseExpiresAt: new Date(),
      },
      'completed'
    )
    assert.deepEqual(where, {
      id: 'run-1',
      status: 'running',
      attempts: {
        some: {
          id: 'attempt-1',
          runId: 'run-1',
          leaseToken: 'lease-1',
          fenceToken: 1,
          status: 'completed',
        },
      },
    })
  })

  it('uses a fresh queue identity for each durable resume state', () => {
    assert.equal(queueJobId('run-1', 0), 'run-1')
    assert.equal(queueJobId('run-1', 1), 'run-1-state-1')
    assert.equal(queueJobId('run-1', 2), 'run-1-state-2')
  })

  it('merges resumed output without duplicating the persisted prefix', () => {
    assert.equal(
      mergeResumedOutput('before ', 'before after', 'before after'),
      'before after'
    )
    assert.equal(
      mergeResumedOutput('before ', 'after', 'before after'),
      'before after'
    )
    assert.equal(
      mergeResumedOutput('before ', '', 'before streamed'),
      'before streamed'
    )
  })
})
