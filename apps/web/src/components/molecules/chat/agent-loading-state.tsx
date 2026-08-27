'use client'

import { useEffect, useState } from 'react'

export function AgentLoadingState({ label }: { label: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000)
    }, 100)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      className='w-full max-w-md rounded-2xl border border-border/80 bg-muted/45 px-4 py-3.5'
      role='status'
      aria-label={label}
    >
      <div className='flex items-center gap-3'>
        <span className='flex items-end gap-1' aria-hidden='true'>
          {[0, 1, 2, 3].map(index => (
            <span
              key={index}
              className='size-1.5 rounded-[2px] bg-primary'
              style={{
                animation: `agent-pixel-wave 900ms ease-in-out ${index * 110}ms infinite`,
              }}
            />
          ))}
        </span>
        <span className='font-mono text-[11px] text-muted-foreground'>
          {label}
        </span>
        <span className='ml-auto font-mono text-[10px] tabular-nums text-muted-foreground/70'>
          {elapsed.toFixed(1)}s
        </span>
      </div>
      <div className='mt-3 space-y-2' aria-hidden='true'>
        {[100, 84, 62].map((width, index) => (
          <span
            key={width}
            className='relative block h-1.5 overflow-hidden rounded-full bg-border/65'
            style={{ width: `${width}%` }}
          >
            <span
              className='absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-card to-transparent opacity-90'
              style={{
                animation: `agent-loading-sweep 1.55s ease-in-out ${index * 120}ms infinite`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
