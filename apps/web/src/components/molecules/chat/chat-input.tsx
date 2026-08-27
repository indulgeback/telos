'use client'

import {
  forwardRef,
  type ReactNode,
  TextareaHTMLAttributes,
  useState,
} from 'react'
import { Button } from '@/components/atoms'
import { ArrowUp, Sparkles, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSend: () => void
  onStop?: () => void
  canSend: boolean
  isLoading?: boolean
  sendDisabled?: boolean
  sendAriaLabel?: string
  stopAriaLabel?: string
  // 输入框下方的操作区域（用于工具开关、附件等）
  actions?: ReactNode
  // 附件预览，放在输入框内部，避免与当前消息脱节
  attachments?: ReactNode
  imageDropEnabled?: boolean
  imageDropLabel?: string
  onDropImages?: (files: FileList) => void
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      onSend,
      onStop,
      canSend,
      isLoading = false,
      sendDisabled = false,
      sendAriaLabel = 'Send message',
      stopAriaLabel = 'Stop generation',
      actions,
      attachments,
      imageDropEnabled = false,
      imageDropLabel = 'Drop images here',
      onDropImages,
      className,
      value,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false)
    const [isComposing, setIsComposing] = useState(false)
    const [isStopCooldown, setIsStopCooldown] = useState(false)
    const [isImageDragActive, setIsImageDragActive] = useState(false)

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // 防止在输入法选词时按回车直接提交
      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
        e.preventDefault()
        if (isLoading) return
        if (canSend && !sendDisabled) {
          onSend()
        }
      }
    }

    const handleCompositionStart = () => {
      setIsComposing(true)
    }

    const handleCompositionEnd = (
      e: React.CompositionEvent<HTMLTextAreaElement>
    ) => {
      setIsComposing(false)
      // 输入法结束后，如果用户按了回车确认选词，手动触发提交
      if (e.data && canSend && !sendDisabled) {
        // 使用 nextTick 确保 isComposing 状态已更新
        setTimeout(() => {
          if (!isComposing) {
            onSend()
          }
        }, 0)
      }
    }

    const handleFocus = () => {
      setIsFocused(true)
    }

    const handleBlur = () => {
      setIsFocused(false)
    }

    const handleActionClick = () => {
      if (isLoading) {
        if (!onStop || isStopCooldown) return
        onStop()
        setIsStopCooldown(true)
        window.setTimeout(() => {
          setIsStopCooldown(false)
        }, 300)
        return
      }

      if (!canSend || sendDisabled) return
      onSend()
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      if (!imageDropEnabled || !event.dataTransfer.types.includes('Files')) {
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setIsImageDragActive(true)
    }

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return
      }
      setIsImageDragActive(false)
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      if (!imageDropEnabled) return
      event.preventDefault()
      setIsImageDragActive(false)
      if (event.dataTransfer.files.length > 0) {
        onDropImages?.(event.dataTransfer.files)
      }
    }

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'agent-surface-shadow relative flex flex-col overflow-hidden rounded-2xl border bg-card/95 p-2.5 transition-[border-color,box-shadow,background-color] duration-200',
          isFocused ? 'border-primary/55' : 'border-border',
          isImageDragActive &&
            'border-primary/60 bg-accent ring-2 ring-primary/10'
        )}
      >
        {attachments && <div className='px-2 pt-1.5'>{attachments}</div>}

        {isImageDragActive && (
          <div className='pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-xl border border-dashed border-primary/45 bg-background/90 text-xs font-medium text-foreground backdrop-blur-sm'>
            {imageDropLabel}
          </div>
        )}

        {/* 输入区域 */}
        <div className='flex items-start gap-1'>
          <Sparkles className='ml-2 mt-3 size-4 shrink-0 text-primary' />
          <textarea
            ref={ref}
            value={value}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              'max-h-40 min-h-11 w-full resize-none border-none bg-transparent px-2 py-2.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70',
              className
            )}
            rows={1}
            {...props}
          />
        </div>

        {/* 操作区域 - 在边框内 */}
        <div className='mt-1.5 flex items-center justify-between gap-2 border-t border-border/70 px-1 pt-2'>
          <div className='min-w-0 flex-1'>{actions}</div>
          <div className='shrink-0'>
            <Button
              onClick={handleActionClick}
              disabled={
                isLoading ? !onStop || isStopCooldown : !canSend || sendDisabled
              }
              size='icon'
              className={cn(
                'size-9 rounded-lg bg-primary text-primary-foreground shadow-none transition-all duration-200 hover:bg-primary/90 active:scale-[0.96]',
                isLoading && isStopCooldown && 'opacity-60'
              )}
              aria-label={isLoading ? stopAriaLabel : sendAriaLabel}
            >
              {isLoading ? (
                <Square className='size-3.5 fill-current' />
              ) : (
                <ArrowUp className='size-4' />
              )}
            </Button>
          </div>
        </div>
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
