'use client'

import { useState } from 'react'
import { BrainCircuit, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [open, setOpen] = useState(streaming)
  const expanded = streaming || open

  return (
    <section className='overflow-hidden rounded-2xl border border-border/80 bg-muted/45 transition-colors duration-300'>
      <button
        type='button'
        onClick={() => setOpen(value => !value)}
        aria-expanded={expanded}
        className='flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors duration-200 hover:bg-card/55'
      >
        <ChevronRight
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out',
            expanded && 'rotate-90'
          )}
        />
        <span className='relative grid size-6 shrink-0 place-items-center rounded-lg bg-card text-primary ring-1 ring-border/70'>
          {streaming && (
            <span
              className='absolute inset-1 rounded-md bg-primary/25'
              style={{
                animation: 'agent-thinking-ring 1.4s ease-out infinite',
              }}
            />
          )}
          <BrainCircuit className='relative size-3.5' />
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block text-[13px] font-medium text-foreground'>
            {title}
          </span>
          <span className='block font-mono text-[10px] text-muted-foreground'>
            {streaming ? thinkingLabel : doneLabel}
          </span>
        </span>
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            streaming ? 'animate-pulse bg-primary' : 'bg-success'
          )}
        />
      </button>

      <div
        className='grid transition-[grid-template-rows] duration-300 ease-out'
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className='overflow-hidden'>
          <div className='border-t border-border/70 px-4 py-3.5'>
            <div className='relative border-l border-border pl-4'>
              <span
                className={cn(
                  'absolute -left-[4.5px] top-1.5 size-2 rounded-full ring-4 ring-muted',
                  streaming ? 'bg-primary' : 'bg-border'
                )}
              />
              <p className='whitespace-pre-wrap text-[13px] leading-6 text-foreground/75'>
                {text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
