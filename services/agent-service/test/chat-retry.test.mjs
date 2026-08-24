import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canReplaceLatestAssistant } from '../dist/services/chat-retry.js'

describe('chat retry persistence', () => {
  it('replaces the answer produced by the selected run', () => {
    assert.equal(
      canReplaceLatestAssistant({ id: 'assistant-1', runId: 'run-1' }, 'run-1'),
      true
    )
  })

  it('allows retrying a failed replacement while preserving the old answer', () => {
    assert.equal(
      canReplaceLatestAssistant(
        { id: 'assistant-1', runId: 'run-1' },
        'failed-retry-run',
        'assistant-1'
      ),
      true
    )
  })

  it('rejects replacing an answer from a newer turn', () => {
    assert.equal(
      canReplaceLatestAssistant(
        { id: 'assistant-2', runId: 'run-2' },
        'run-1',
        'assistant-1'
      ),
      false
    )
  })
})
