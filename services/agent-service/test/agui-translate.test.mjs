import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isAguiTerminalEvent,
  translateRunEventToAgui,
} from '../dist/services/agui-translate.js'

describe('translateRunEventToAgui', () => {
  it('maps run lifecycle events', () => {
    const started = translateRunEventToAgui({
      type: 'agent.run.created',
      data: { threadId: 't1', runId: 'r1' },
      sequence: '1-1',
    })
    assert.equal(started?.type, 'RUN_STARTED')
    assert.equal(started?.threadId, 't1')
    assert.equal(started?.sequence, '1-1')

    const finished = translateRunEventToAgui({
      type: 'response.completed',
      response_id: 'r1',
      sequence: '9-1',
    })
    assert.equal(finished?.type, 'RUN_FINISHED')

    const failed = translateRunEventToAgui({
      type: 'response.failed',
      response_id: 'r1',
      error: 'boom',
      sequence: '9-2',
    })
    assert.equal(failed?.type, 'RUN_ERROR')
    assert.equal(failed?.message, 'boom')
  })

  it('maps text message start/content/end', () => {
    assert.equal(
      translateRunEventToAgui({ type: 'response.output_text.start', id: 'x' })
        ?.type,
      'TEXT_MESSAGE_START'
    )
    const content = translateRunEventToAgui({
      type: 'response.output_text.delta',
      id: 'x',
      delta: 'hello',
    })
    assert.equal(content?.type, 'TEXT_MESSAGE_CONTENT')
    assert.equal(content?.delta, 'hello')
    assert.equal(
      translateRunEventToAgui({ type: 'response.output_text.done', id: 'x' })
        ?.type,
      'TEXT_MESSAGE_END'
    )
  })

  it('maps reasoning to THINKING events', () => {
    const delta = translateRunEventToAgui({
      type: 'response.reasoning.delta',
      id: 'th',
      delta: 'hmm',
    })
    assert.equal(delta?.type, 'THINKING_TEXT_MESSAGE_CONTENT')
    assert.equal(
      translateRunEventToAgui({ type: 'response.reasoning.done', id: 'th' })
        ?.type,
      'THINKING_END'
    )
  })

  it('maps tool call start/args/end', () => {
    const start = translateRunEventToAgui({
      type: 'response.output_item.added',
      toolCallId: 'tc1',
      toolName: 'web_search',
      item_id: 'tc1',
    })
    assert.equal(start?.type, 'TOOL_CALL_START')
    assert.equal(start?.toolCallName, 'web_search')

    const args = translateRunEventToAgui({
      type: 'response.function_call_arguments.delta',
      toolCallId: 'tc1',
      delta: '{"q"',
    })
    assert.equal(args?.type, 'TOOL_CALL_ARGS')

    const end = translateRunEventToAgui({
      type: 'response.function_call_arguments.done',
      toolCallId: 'tc1',
    })
    assert.equal(end?.type, 'TOOL_CALL_END')
  })

  it('folds Telos-specific events into CUSTOM and drops noise', () => {
    const custom = translateRunEventToAgui({
      type: 'agent.tool_call.output',
      toolCallId: 'tc1',
      output: 'result text',
      sequence: '5-1',
    })
    assert.equal(custom?.type, 'CUSTOM')
    assert.equal(custom?.name, 'agent.tool_call.output')
    assert.equal(custom?.sequence, '5-1')

    assert.equal(
      translateRunEventToAgui({ type: 'response.in_progress' })?.type,
      'CUSTOM'
    )
    assert.equal(translateRunEventToAgui({ type: 'ping' }), null)
    assert.equal(translateRunEventToAgui({}), null)
  })

  it('marks terminal AG-UI event types', () => {
    assert.equal(isAguiTerminalEvent('RUN_FINISHED'), true)
    assert.equal(isAguiTerminalEvent('RUN_ERROR'), true)
    assert.equal(isAguiTerminalEvent('TEXT_MESSAGE_CONTENT'), false)
  })
})
