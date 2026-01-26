'use client'

import {
  forwardRef,
  type ReactNode,
  TextareaHTMLAttributes,
  useState,
} from 'react'
import { Button } from './button'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSend: () => void
  canSend: boolean
  sendDisabled?: boolean
  sendAriaLabel?: string
  // 输入框下方的操作区域（用于工具开关、附件等）
  actions?: ReactNode
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      onSend,
      canSend,
      sendDisabled = false,
      sendAriaLabel = 'Send message',
      actions,
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
          'flex flex-col gap-2 rounded-2xl border bg-background p-2 shadow-sm transition-shadow',
          isFocused ? 'border-primary/50 shadow-2xl' : 'ring-0'
        )}
      >
        {/* 输入区域 */}
        <div className='flex items-end gap-3'>
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

        {/* 操作区域 - 在边框内 */}
        {actions && (
          <div className='flex items-center gap-2 px-1 pt-1 border-t border-border/50 mt-1'>
            {actions}
          </div>
        )}
      </div>
    )
  }
)

ChatInput.displayName = 'ChatInput'

// 输入框操作项组件
export interface ChatInputActionProps {
  icon: ReactNode
  label: string
  checked?: boolean
  onToggle?: () => void
  disabled?: boolean
  variant?: 'toggle' | 'button'
  size?: 'default' | 'sm'
}

export function ChatInputAction({
  icon,
  label,
  checked,
  onToggle,
  disabled = false,
  variant = 'toggle',
  size = 'default',
}: ChatInputActionProps) {
  if (variant === 'toggle') {
    return (
      <Button
        type='button'
        onClick={onToggle}
        disabled={disabled}
        variant={checked ? 'default' : 'secondary'}
        size={size === 'sm' ? 'sm' : 'default'}
        radius='md'
        className={cn(
          'gap-1.5 text-xs',
          !checked && 'bg-muted/50 text-muted-foreground hover:bg-muted/70'
        )}
      >
        {icon}
        <span>{label}</span>
      </Button>
    )
  }

  return (
    <Button
      type='button'
      disabled={disabled}
      variant='ghost'
      size={size === 'sm' ? 'sm' : 'default'}
      radius='md'
      className='gap-1.5 text-xs'
    >
      {icon}
      <span>{label}</span>
    </Button>
  )
}
