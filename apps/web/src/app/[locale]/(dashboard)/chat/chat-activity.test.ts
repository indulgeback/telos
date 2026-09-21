import { describe, expect, it } from 'vitest'
import {
  deriveAssistantActivity,
  getToolKind,
  summarizeToolInput,
  summarizeToolResult,
  truncateMiddle,
  type ActivityPart,
} from './chat-activity'

describe('deriveAssistantActivity', () => {
  it('reports preparing while loading without any parts', () => {
    expect(deriveAssistantActivity(undefined, { isLoading: true })).toEqual({
      phase: 'preparing',
    })
    expect(deriveAssistantActivity([], { isLoading: true })).toEqual({
      phase: 'preparing',
    })
  })

  it('is idle when not loading', () => {
    const parts: ActivityPart[] = [
      { type: 'reasoning', reasoning: { text: 'x', state: 'streaming' } },
    ]
    expect(deriveAssistantActivity(parts, { isLoading: false })).toEqual({
      phase: 'idle',
    })
  })

  it('detects a streaming reasoning part as thinking', () => {
    const parts: ActivityPart[] = [
      { type: 'text', text: 'earlier answer' },
      { type: 'reasoning', reasoning: { text: 'hmm', state: 'streaming' } },
    ]
    expect(deriveAssistantActivity(parts, { isLoading: true })).toEqual({
      phase: 'thinking',
    })
  })

  it('detects the latest running tool', () => {
    const parts: ActivityPart[] = [
      {
        type: 'tool',
        tool: {
          toolCallId: 'a',
          toolName: 'read_file',
          state: 'success',
          outputText: 'done',
        },
      },
      {
        type: 'tool',
        tool: { toolCallId: 'b', toolName: 'run_command', state: 'running' },
      },
    ]
    const activity = deriveAssistantActivity(parts, { isLoading: true })
    expect(activity).toEqual({
      phase: 'tool',
      tool: expect.objectContaining({ toolCallId: 'b' }),
    })
  })

  it('detects an executing plan with progress and current step', () => {
    const parts: ActivityPart[] = [
      {
        type: 'plan',
        plan: {
          steps: [
            { description: 'Inspect files' },
            { description: 'Apply fix' },
            { description: 'Run tests' },
          ],
          status: 'executing',
          stepStatuses: ['completed', 'in_progress', 'pending'],
        },
      },
    ]
    expect(deriveAssistantActivity(parts, { isLoading: true })).toEqual({
      phase: 'plan',
      done: 1,
      total: 3,
      current: 'Apply fix',
      status: 'executing',
      stepStatuses: ['completed', 'in_progress', 'pending'],
    })
  })

  it('hides the status line once answer text is streaming', () => {
    const parts: ActivityPart[] = [
      {
        type: 'reasoning',
        reasoning: { text: 'done thinking', state: 'done' },
      },
      { type: 'text', text: 'The answer is…' },
    ]
    expect(deriveAssistantActivity(parts, { isLoading: true })).toEqual({
      phase: 'idle',
    })
  })

  it('stays quiet in the gap after reasoning finishes before tools start', () => {
    const parts: ActivityPart[] = [
      { type: 'reasoning', reasoning: { text: 'done', state: 'done' } },
    ]
    expect(deriveAssistantActivity(parts, { isLoading: true })).toEqual({
      phase: 'idle',
    })
  })
})

describe('getToolKind', () => {
  it('maps tool names to action kinds', () => {
    expect(getToolKind('read_file')).toBe('read')
    expect(getToolKind('write_file')).toBe('write')
    expect(getToolKind('run_command')).toBe('run')
    expect(getToolKind('web_search')).toBe('search')
    expect(getToolKind('fetch_url')).toBe('read')
    expect(getToolKind('clarify_question')).toBe('generic')
  })
})

describe('truncateMiddle', () => {
  it('keeps short text untouched', () => {
    expect(truncateMiddle('src/app/page.tsx', 20)).toBe('src/app/page.tsx')
  })

  it('truncates the middle while keeping head and tail', () => {
    const long = '/very/long/path/to/deeply/nested/file/structure/page.tsx'
    const result = truncateMiddle(long, 20)
    expect(result).toContain('…')
    expect(result.startsWith('/very/long')).toBe(true)
    expect(result.endsWith('.tsx')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(20)
  })
})

describe('summarizeToolInput', () => {
  it('extracts the file path from a JSON payload', () => {
    expect(
      summarizeToolInput('{"file_path":"src/app/page.tsx","limit":10}')
    ).toBe('src/app/page.tsx')
  })

  it('extracts the command for run-style tools', () => {
    expect(summarizeToolInput('{"command":"pnpm test --run"}')).toBe(
      'pnpm test --run'
    )
  })

  it('falls back to raw truncation for non-JSON input', () => {
    expect(summarizeToolInput('plain text input')).toBe('plain text input')
  })

  it('returns empty for empty input', () => {
    expect(summarizeToolInput(undefined)).toBe('')
    expect(summarizeToolInput('')).toBe('')
    expect(summarizeToolInput('{"foo":{"bar":1}}')).toBe('')
  })

  it('peeks one level into nested payloads', () => {
    expect(summarizeToolInput('{"args":{"file_path":"deep/nested.ts"}}')).toBe(
      'deep/nested.ts'
    )
  })
})

describe('summarizeToolResult', () => {
  it('prefers the error text over output', () => {
    expect(
      summarizeToolResult('ok output', 'first error line\nsecond line')
    ).toBe('first error line')
  })

  it('takes the first non-empty line of output', () => {
    expect(summarizeToolResult('\nTests: 52 passed\nmore', undefined)).toBe(
      'Tests: 52 passed'
    )
  })

  it('returns empty when nothing happened yet', () => {
    expect(summarizeToolResult(undefined, undefined)).toBe('')
  })
})
