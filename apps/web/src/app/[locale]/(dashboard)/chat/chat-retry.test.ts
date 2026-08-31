import { describe, expect, it } from 'vitest'
import { getLatestRetryTarget, replaceLatestAssistant } from './chat-retry'
import type { RetryMessage } from './chat-retry'

describe('chat retry', () => {
  it('targets the persisted run paired with the latest user turn', () => {
    expect(
      getLatestRetryTarget([
        { id: 'user-1', role: 'user', content: 'hello' },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'hi',
          runId: 'run-1',
        },
      ])
    ).toEqual({ runId: 'run-1', userContent: 'hello' })
  })

  it('does not offer a durable retry without a persisted run id', () => {
    expect(
      getLatestRetryTarget([
        { id: 'user-1', role: 'user', content: 'hello' },
        { id: 'assistant-1', role: 'assistant', content: 'hi' },
      ])
    ).toBeNull()
  })

  it('replaces the latest answer without duplicating the user message', () => {
    const messages: RetryMessage[] = [
      { id: 'user-1', role: 'user', content: 'hello' },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'old answer',
        runId: 'run-1',
      },
    ]

    expect(
      replaceLatestAssistant(messages, {
        id: 'assistant-2',
        role: 'assistant',
        content: '',
      })
    ).toEqual([
      { id: 'user-1', role: 'user', content: 'hello' },
      { id: 'assistant-2', role: 'assistant', content: '' },
    ])
  })
})
