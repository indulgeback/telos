'use client'

import { cn } from '@/lib/utils'

interface StreamingCursorProps {
  className?: string
}

export function StreamingCursor({ className }: StreamingCursorProps) {
  return (
    <span
      className={cn(
        'inline-block ml-0.5 size-2.5 animate-streaming-cursor rounded-sm bg-primary',
        className
      )}
      aria-hidden='true'
    />
  )
}
