'use client'

import { Button } from './button'
import { Card } from './card'
import { MarkdownContent } from './markdown-content'
import { TypingIndicator } from './typing-indicator'
import { ChatAvatar } from './chat-avatar'
import { Copy, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChatMessageProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  copiedId: string | null
  onCopy: (content: string, id: string) => void
  copyLabel: string
  copiedLabel: string
  isLoading?: boolean
  onRetry?: () => void
  retryLabel?: string
}

export function ChatMessage({
  id,
  role,
  content,
  copiedId,
  onCopy,
  copyLabel,
  copiedLabel,
  isLoading = false,
  onRetry,
  retryLabel = 'Retry',
}: ChatMessageProps) {
  const isAssistant = role === 'assistant'
  const hasContent = content.length > 0

  return (
    <div
      className={cn(
        'flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isAssistant ? 'justify-start' : 'justify-end'
      )}
    >
      {isAssistant && <ChatAvatar type='assistant' />}

      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-2',
          isAssistant ? 'items-start' : 'items-end'
        )}
      >
        <Card
          className={cn(
            'relative px-4 py-3 shadow-sm',
            !isAssistant ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
          )}
        >
          {isAssistant ? (
            <div className='text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none'>
              {hasContent ? (
                <MarkdownContent content={content} />
              ) : (
                <TypingIndicator />
              )}
            </div>
          ) : (
            <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>
              {hasContent ? content : <TypingIndicator />}
            </p>
          )}
        </Card>

        {isAssistant && (
          <div className='flex items-center gap-1'>
            {isLoading ? (
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <TypingIndicator />
              </div>
            ) : hasContent ? (
              <>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 gap-1 px-2 text-xs text-muted-foreground'
                  onClick={() => onCopy(content, id)}
                >
                  {copiedId === id ? (
                    <>
                      <Check className='size-3' />
                      {copiedLabel}
                    </>
                  ) : (
                    <>
                      <Copy className='size-3' />
                      {copyLabel}
                    </>
                  )}
                </Button>
                {onRetry && (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 gap-1 px-2 text-xs text-muted-foreground'
                    onClick={onRetry}
                  >
                    <RotateCcw className='size-3' />
                    {retryLabel}
                  </Button>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {!isAssistant && <ChatAvatar type='user' />}
    </div>
  )
}
