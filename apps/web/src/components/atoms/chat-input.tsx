'use client'

import { forwardRef, TextareaHTMLAttributes } from 'react'
import { Button } from './button'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onSubmit'
> {
  onSend: () => void
  canSend: boolean
  sendDisabled?: boolean
  sendAriaLabel?: string
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      onSend,
      canSend,
      sendDisabled = false,
      sendAriaLabel = 'Send message',
      className,
      value,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend && !sendDisabled) {
          onSend()
        }
      }
    }

    return (
      <div className='flex items-end gap-3 rounded-2xl border bg-background p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20'>
        <textarea
          ref={ref}
          value={value}
          onKeyDown={handleKeyDown}
          className={cn(
            'max-h-32 min-h-[44px] w-full resize-none border-none bg-transparent px-3 py-2.5 text-sm focus-visible:ring-0',
            className
          )}
          rows={1}
          {...props}
        />
        <Button
          onClick={onSend}
          disabled={!canSend || sendDisabled}
          size='icon'
          className='size-10 shrink-0 rounded-xl'
          aria-label={sendAriaLabel}
        >
          <Send className='size-4' />
        </Button>
      </div>
    )
  }
)

ChatInput.displayName = 'ChatInput'
