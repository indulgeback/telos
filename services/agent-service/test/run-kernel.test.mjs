import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  canRecoverRunningRun,
  canStartRun,
  canonicalizeRunExecution,
  isUnsafeRunRedelivery,
  isTerminalRunStatus,
} from '../dist/services/run-state.js'

describe('run execution state guards', () => {
  it('only queued runs can be claimed and terminal runs cannot restart', () => {
    assert.equal(canStartRun('queued'), true)
    assert.equal(canStartRun('running'), false)
    assert.equal(isUnsafeRunRedelivery('running'), true)
    assert.equal(isUnsafeRunRedelivery('queued'), false)
    for (const status of ['completed', 'failed', 'cancelled']) {
      assert.equal(canStartRun(status), false)
      assert.equal(isTerminalRunStatus(status), true)
    }
  })

  it('only an active BullMQ job proves a running row is recoverable', () => {
    assert.equal(canRecoverRunningRun('active'), true)
    assert.equal(canRecoverRunningRun('waiting'), false)
    assert.equal(canRecoverRunningRun('delayed'), false)
    assert.equal(canRecoverRunningRun(null), false)
  })

  it('rebuilds execution parameters from the persisted run snapshot', () => {
    const canonical = canonicalizeRunExecution({
      id: 'run-db',
      agentId: 'agent-db',
      threadId: 'thread-db',
      status: 'queued',
      input: {
        effectiveInput: 'persisted input',
        model: 'provider/model',
        reasoningEffort: 'high',
        planMode: 'execute',
      },
      metadata: {
        approvedPlan: {
          summary: 'approved work',
          steps: [{ description: 'do the work' }],
        },
        forceSkillName: 'safe-skill',
        replaceAssistantMessageId: 'assistant-old',
      },
      thread: { ownerId: 'owner-db' },
    })

    assert.deepEqual(canonical, {
      runId: 'run-db',
      agentId: 'agent-db',
      threadId: 'thread-db',
      ownerId: 'owner-db',
      input: 'persisted input',
      modelOverride: 'provider/model',
      reasoningEffort: 'high',
      planMode: 'execute',
      approvedPlan: {
        summary: 'approved work',
        steps: [{ description: 'do the work' }],
      },
      forceSkillName: 'safe-skill',
      replaceAssistantMessageId: 'assistant-old',
      userId: 'owner-db',
    })
  })

  it('rejects persisted runs without an owned thread or executable input', () => {
    const base = {
      id: 'run-db',
      agentId: 'agent-db',
      threadId: 'thread-db',
      status: 'queued',
      input: { effectiveInput: 'hello' },
      metadata: {},
      thread: { ownerId: 'owner-db' },
    }
    assert.equal(canonicalizeRunExecution({ ...base, thread: null }), null)
    assert.equal(
      canonicalizeRunExecution({ ...base, input: { effectiveInput: '' } }),
      null
    )
  })

  it('carries only the server-owned signed SDK snapshot into a resume', () => {
    const canonical = canonicalizeRunExecution({
      id: 'run-resume',
      agentId: 'agent-db',
      threadId: 'thread-db',
      status: 'queued',
      input: { effectiveInput: 'resume' },
      metadata: {},
      sdkState: 'serialized-state',
      sdkStateHash: 'signed-state',
      stateVersion: 4,
      partialOutput: 'partial',
      partialParts: [{ type: 'text', text: 'partial' }],
      thread: { ownerId: 'owner-db' },
    })
    assert.equal(canonical?.resumeState, 'serialized-state')
    assert.equal(canonical?.resumeStateHash, 'signed-state')
    assert.equal(canonical?.stateVersion, 4)
    assert.equal(canonical?.partialOutput, 'partial')
  })

  it('fails closed when execute mode lacks a valid bounded approved plan', () => {
    const base = {
      id: 'run-plan',
      agentId: 'agent-db',
      threadId: 'thread-db',
      status: 'queued',
      input: { effectiveInput: 'execute', planMode: 'execute' },
      thread: { ownerId: 'owner-db' },
    }
    assert.equal(canonicalizeRunExecution({ ...base, metadata: {} }), null)
    assert.equal(
      canonicalizeRunExecution({
        ...base,
        metadata: {
          approvedPlan: {
            summary: 'too large',
            steps: Array.from({ length: 21 }, (_, index) => ({
              description: `step ${index}`,
            })),
          },
        },
      }),
      null
    )
  })
})
