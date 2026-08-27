import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTerminalUiPayload,
  isTerminalUiEventType,
} from '../dist/services/run-terminal.js'

describe('terminal run UI projection', () => {
  it('rebuilds a completed response from durable final output', () => {
    assert.deepEqual(
      buildTerminalUiPayload({
        id: 'run-1',
        status: 'completed',
        finalOutput: 'done',
      }),
      {
        type: 'response.completed',
        response_id: 'run-1',
        output_text: 'done',
      }
    )
  })

  it('rebuilds failed and cancelled terminal responses', () => {
    assert.deepEqual(
      buildTerminalUiPayload({
        id: 'run-2',
        status: 'failed',
        error: 'boom',
      }),
      {
        type: 'response.failed',
        response_id: 'run-2',
        error: 'boom',
        run_status: 'failed',
      }
    )
    assert.deepEqual(
      buildTerminalUiPayload({
        id: 'run-3',
        status: 'cancelled',
        error: null,
      }),
      {
        type: 'response.failed',
        response_id: 'run-3',
        error: 'Run cancelled',
        run_status: 'cancelled',
      }
    )
    assert.equal(
      buildTerminalUiPayload({ id: 'run-4', status: 'running' }),
      null
    )
  })

  it('recognizes only UI terminal event types', () => {
    assert.equal(isTerminalUiEventType('response.completed'), true)
    assert.equal(isTerminalUiEventType('response.failed'), true)
    assert.equal(isTerminalUiEventType('response.output_text.delta'), false)
  })
})
