import { describe, expect, it } from 'vitest'
import {
  extractAssistantContentParts,
  extractRunApprovals,
  parseClientPlanSteps,
  parsePlanPart,
  parseToolCallPart,
} from './chat-plan-utils'

describe('chat plan and message parsing', () => {
  it('parses numbered plans and stops at explanatory sections', () => {
    expect(
      parseClientPlanSteps(
        '1. Inspect the issue\n2) Apply the fix\n## 说明\nIgnore this'
      )
    ).toEqual(['Inspect the issue', 'Apply the fix'])
  })

  it('supports legacy text plans and nested plan payloads', () => {
    expect(
      parsePlanPart({ type: 'plan', text: '1. First\n- Second' })
    ).toMatchObject({
      steps: [{ description: 'First' }, { description: 'Second' }],
      status: 'pending',
    })
    expect(
      parsePlanPart({
        type: 'plan',
        plan: {
          status: 'executing',
          steps: [{ description: 'Run', tool_hint: 'shell' }],
        },
      })
    ).toMatchObject({
      status: 'executing',
      steps: [{ description: 'Run', tool_hint: 'shell' }],
    })
  })

  it('normalizes approval envelopes and legacy approval fields', () => {
    expect(
      extractRunApprovals({
        approval_id: 'approval-1',
        tool_call_id: 'call-1',
        tool_name: 'shell',
        arguments: { command: 'pwd' },
        expires_at: '2030-01-01T00:00:00Z',
      })
    ).toMatchObject([
      { id: 'approval-1', tool_call_id: 'call-1', status: 'pending' },
    ])
  })

  it('deduplicates tool updates and keeps tagged reasoning separate', () => {
    expect(
      extractAssistantContentParts([
        { type: 'text', text: 'before <think>consider</think> after' },
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'search',
          state: 'input-available',
        },
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'search',
          state: 'output-available',
          output: 'done',
        },
      ])
    ).toEqual([
      { type: 'text', text: 'before ' },
      { type: 'reasoning', reasoning: { text: 'consider', state: 'done' } },
      { type: 'text', text: ' after' },
      {
        type: 'tool',
        tool: {
          toolCallId: 'call-1',
          toolName: 'search',
          state: 'success',
          inputText: undefined,
          outputText: 'done',
          errorText: undefined,
        },
      },
    ])
    expect(
      parseToolCallPart({ type: 'tool-clarify_question', toolCallId: 'hidden' })
    ).toBeNull()
  })
})
