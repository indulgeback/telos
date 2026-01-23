'use client'

import { forwardRef, TextareaHTMLAttributes, useState } from 'react'
import { Button } from './button'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'

interface ChatInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
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
    const [isFocused, setIsFocused] = useState(false)

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (canSend && !sendDisabled) {
          onSend()
        }
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = () => {
      setIsFocused(false)
    }

    return (
      <div
        className={cn(
          'flex items-end gap-3 rounded-2xl border bg-background p-2 shadow-sm transition-shadow',
          isFocused ? 'border-primary/50 shadow-2xl' : 'ring-0'
        )}
      >
        <textarea
          ref={ref}
          value={value}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'max-h-32 min-h-11 w-full resize-none border-none bg-transparent px-3 py-2.5 text-sm outline-none',
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
