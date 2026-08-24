import { describe, expect, it } from 'vitest'
import { resolveMessageModelLabel } from './chat-model-label'

const modelOptions = [
  { model: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { model: 'google/gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
]

describe('resolveMessageModelLabel', () => {
  it('keeps the persisted message model after the selected model changes', () => {
    expect(
      resolveMessageModelLabel({
        persistedModelKey: 'deepseek-v4-flash',
        transientLabel: 'Gemini 3.7 Flash',
        modelOptions,
      })
    ).toBe('DeepSeek V4 Flash')
  })

  it('shows an unknown persisted model key instead of lying about the model', () => {
    expect(
      resolveMessageModelLabel({
        persistedModelKey: 'legacy-model',
        transientLabel: 'Gemini 3.7 Flash',
        modelOptions,
      })
    ).toBe('legacy-model')
  })

  it('uses the transient label only for an unpersisted live message', () => {
    expect(
      resolveMessageModelLabel({
        transientLabel: 'Gemini 3.7 Flash',
        modelOptions,
      })
    ).toBe('Gemini 3.7 Flash')
  })
})
