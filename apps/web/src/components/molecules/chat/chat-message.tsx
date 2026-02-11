'use client'

import { Button, Card, TypingIndicator, ChatAvatar } from '@/components/atoms'
import { MarkdownContent } from './markdown-content'
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
  // 用户头像相关
  userAvatarUrl?: string | null
  userInitials?: string | null
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
  userAvatarUrl,
  userInitials,
}: ChatMessageProps) {
  const safeContent = content ?? ''
  const isAssistant = role === 'assistant'
  const hasContent = safeContent.length > 0

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
          'flex w-full max-w-[85%] flex-col gap-2',
          isAssistant ? 'items-start pr-4' : 'items-end'
        )}
      >
        {isAssistant ? (
          <div className='w-full'>
            <div
              key={`${id}-${hasContent ? 'content' : 'typing'}`}
              className={cn(
                'chat-assistant-markdown max-w-none text-sm leading-relaxed prose prose-sm dark:prose-invert'
              )}
            >
              {hasContent ? (
                <MarkdownContent content={safeContent} />
              ) : (
                <TypingIndicator />
              )}
            </div>
          </div>
        ) : (
          <Card className='relative px-4 py-3 shadow-sm bg-primary text-primary-foreground'>
            <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>
              {hasContent ? safeContent : <TypingIndicator />}
            </p>
          </Card>
        )}

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
                  onClick={() => onCopy(safeContent, id)}
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

      {!isAssistant && (
        <ChatAvatar
          type='user'
          imageUrl={userAvatarUrl}
          initials={userInitials}
        />
      )}
    </div>
  )
}
