import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AgentLoadingState } from './agent-loading-state'
import { ThinkingTrace } from './thinking-trace'

describe('Beautiful UI agent primitives', () => {
  it('keeps a streaming thinking trace expanded', () => {
    const html = renderToStaticMarkup(
      <ThinkingTrace
        text='Inspecting the current interface'
        state='streaming'
        title='Reasoning process'
        thinkingLabel='Thinking'
        doneLabel='Reasoning complete'
      />
    )

    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('Inspecting the current interface')
    expect(html).toContain('Thinking')
  })

  it('collapses a completed persisted trace by default', () => {
    const html = renderToStaticMarkup(
      <ThinkingTrace
        text='Finished reasoning'
        state='done'
        title='Reasoning process'
        thinkingLabel='Thinking'
        doneLabel='Reasoning complete'
      />
    )

    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Reasoning complete')
  })

  it('announces the localized loading state', () => {
    const html = renderToStaticMarkup(<AgentLoadingState label='Thinking' />)

    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Thinking"')
  })
})
