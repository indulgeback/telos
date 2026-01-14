import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <span className={cn('flex items-center gap-1', className)}>
      <span className='inline-block size-2 animate-bounce rounded-full bg-current' />
      <span className='inline-block size-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]' />
      <span className='inline-block size-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]' />
    </span>
  )
}
