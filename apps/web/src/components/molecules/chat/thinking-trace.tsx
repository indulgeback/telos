'use client'

import ThinkingState from '@/components/primitives/ThinkingState'

export interface ThinkingTraceProps {
  text: string
  state?: 'streaming' | 'done'
  title: string
  thinkingLabel: string
  doneLabel: string
}

export function ThinkingTrace({
  text,
  state = 'done',
  title,
  thinkingLabel,
  doneLabel,
}: ThinkingTraceProps) {
  const streaming = state === 'streaming'

  return (
    <section
      className='beautiful-ui w-full py-1'
      aria-label={title}
      aria-live={streaming ? 'polite' : undefined}
    >
      <ThinkingState
        variant='Reasoning'
        live={{
          rows: [{ id: 'reasoning-body', primary: text }],
          working: streaming,
          activeLabel: thinkingLabel,
          doneLabel,
        }}
      />
    </section>
  )
}
