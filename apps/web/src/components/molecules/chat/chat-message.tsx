'use client'

import { memo, useEffect, useRef, useState } from 'react'
import {
  AiLottieIcon,
  Button,
  Card,
  TypingIndicator,
  ChatAvatar,
} from '@/components/atoms'
import { MarkdownContent } from './markdown-content'
import { ToolCallStatus, type ToolCallPreview } from './tool-call-status'
import { Copy, Check, RotateCcw, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AssistantContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'reasoning'
      reasoning: {
        text: string
        state?: 'streaming' | 'done'
      }
    }
  | { type: 'tool'; tool: ToolCallPreview }

export interface ChatMessageProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  contentParts?: AssistantContentPart[]
  toolCalls?: ToolCallPreview[]
  copiedId: string | null
  onCopy: (content: string, id: string) => void
  copyLabel: string
  copiedLabel: string
  isLoading?: boolean
  onRetry?: () => void
  retryLabel?: string
  reasoningTitle?: string
  reasoningThinkingLabel?: string
  reasoningDoneLabel?: string
  // 用户头像相关
  userAvatarUrl?: string | null
  userInitials?: string | null
}

function compareToolPreview(
  prev: ToolCallPreview,
  next: ToolCallPreview
): boolean {
  return (
    prev.toolCallId === next.toolCallId &&
    prev.toolName === next.toolName &&
    prev.state === next.state &&
    prev.inputText === next.inputText &&
    prev.outputText === next.outputText &&
    prev.errorText === next.errorText
  )
}

function compareContentParts(
  prev: AssistantContentPart[] | undefined,
  next: AssistantContentPart[] | undefined
): boolean {
  const prevParts = prev ?? []
  const nextParts = next ?? []
  if (prevParts.length !== nextParts.length) return false

  for (let i = 0; i < prevParts.length; i += 1) {
    const prevPart = prevParts[i]
    const nextPart = nextParts[i]
    if (!prevPart || !nextPart || prevPart.type !== nextPart.type) return false

    if (prevPart.type === 'text' && nextPart.type === 'text') {
      if (prevPart.text !== nextPart.text) return false
      continue
    }

    if (prevPart.type === 'reasoning' && nextPart.type === 'reasoning') {
      if (
        prevPart.reasoning.text !== nextPart.reasoning.text ||
        prevPart.reasoning.state !== nextPart.reasoning.state
      ) {
        return false
      }
      continue
    }

    if (prevPart.type === 'tool' && nextPart.type === 'tool') {
      if (!compareToolPreview(prevPart.tool, nextPart.tool)) return false
      continue
    }

    return false
  }

  return true
}

function compareToolCalls(
  prev: ToolCallPreview[] | undefined,
  next: ToolCallPreview[] | undefined
): boolean {
  const prevCalls = prev ?? []
  const nextCalls = next ?? []
  if (prevCalls.length !== nextCalls.length) return false
  for (let i = 0; i < prevCalls.length; i += 1) {
    const prevCall = prevCalls[i]
    const nextCall = nextCalls[i]
    if (!prevCall || !nextCall || !compareToolPreview(prevCall, nextCall)) {
      return false
    }
  }
  return true
}

function ChatMessageInner({
  id,
  role,
  content,
  contentParts = [],
  toolCalls: _toolCalls = [],
  copiedId,
  onCopy,
  copyLabel,
  copiedLabel,
  isLoading = false,
  onRetry,
  retryLabel = 'Retry',
  reasoningTitle = 'Reasoning',
  reasoningThinkingLabel = 'Thinking',
  reasoningDoneLabel = 'Done',
  userAvatarUrl,
  userInitials,
}: ChatMessageProps) {
  const safeContent = content ?? ''
  const safeContentParts = contentParts ?? []
  const isAssistant = role === 'assistant'
  const hasContent = safeContent.length > 0
  const [isAvatarBouncing, setIsAvatarBouncing] = useState(false)
  const avatarBounceTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (avatarBounceTimerRef.current) {
        window.clearTimeout(avatarBounceTimerRef.current)
      }
    }
  }, [])

  const handleAssistantAvatarClick = () => {
    setIsAvatarBouncing(false)
    requestAnimationFrame(() => {
      setIsAvatarBouncing(true)
      if (avatarBounceTimerRef.current) {
        window.clearTimeout(avatarBounceTimerRef.current)
      }
      avatarBounceTimerRef.current = window.setTimeout(() => {
        setIsAvatarBouncing(false)
      }, 780)
    })
  }

  return (
    <div
      className={cn(
        'flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isAssistant ? 'justify-start' : 'justify-end'
      )}
    >
      {isAssistant && (
        <button
          type='button'
          onClick={handleAssistantAvatarClick}
          aria-label='Animate assistant avatar'
          className={cn(
            'flex size-14 shrink-0 items-center justify-center outline-none',
            isAvatarBouncing && 'chat-assistant-avatar-jelly'
          )}
        >
          <AiLottieIcon className='size-14' play={isLoading} />
        </button>
      )}

      <div
        className={cn(
          'flex w-full max-w-[85%] flex-col gap-2',
          isAssistant ? 'items-start pr-4' : 'items-end'
        )}
      >
        {isAssistant ? (
          <div className='w-full'>
            {safeContentParts.length > 0 ? (
              <div className='space-y-3'>
                {safeContentParts.map((part, index) => {
                  if (part.type === 'tool') {
                    return (
                      <ToolCallStatus
                        key={`${part.tool.toolCallId}-${index}`}
                        tool={part.tool}
                      />
                    )
                  }

                  if (part.type === 'reasoning') {
                    return (
                      <details
                        key={`reasoning-${id}-${index}`}
                        className='chat-reasoning-details rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-xs text-muted-foreground [&_summary::-webkit-details-marker]:hidden'
                      >
                        <summary className='flex cursor-pointer list-none items-center justify-between gap-2'>
                          <span className='flex items-center gap-1.5 font-medium'>
                            <ChevronRight className='chat-reasoning-chevron size-3.5' />
                            {reasoningTitle}
                          </span>
                          <span className='text-[11px]'>
                            {part.reasoning.state === 'streaming'
                              ? reasoningThinkingLabel
                              : reasoningDoneLabel}
                          </span>
                        </summary>
                        <div className='mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground/80'>
                          {part.reasoning.text}
                        </div>
                      </details>
                    )
                  }

                  return (
                    <div
                      key={`text-${id}-${index}`}
                      className='max-w-none text-sm leading-relaxed'
                    >
                      {isLoading ? (
                        <p className='whitespace-pre-wrap break-words'>
                          {part.text}
                        </p>
                      ) : (
                        <div
                          className={cn(
                            'chat-assistant-markdown prose prose-sm dark:prose-invert'
                          )}
                        >
                          <MarkdownContent content={part.text} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : hasContent ? (
              <div
                key={`${id}-content`}
                className='max-w-none text-sm leading-relaxed'
              >
                {isLoading ? (
                  <p className='whitespace-pre-wrap break-words'>
                    {safeContent}
                  </p>
                ) : (
                  <div
                    className={cn(
                      'chat-assistant-markdown prose prose-sm dark:prose-invert'
                    )}
                  >
                    <MarkdownContent content={safeContent} />
                  </div>
                )}
              </div>
            ) : null}
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

function areEqual(prev: ChatMessageProps, next: ChatMessageProps): boolean {
  if (prev.id !== next.id) return false
  if (prev.role !== next.role) return false
  if (prev.content !== next.content) return false
  if (prev.isLoading !== next.isLoading) return false
  if (prev.retryLabel !== next.retryLabel) return false
  if (prev.reasoningTitle !== next.reasoningTitle) return false
  if (prev.reasoningThinkingLabel !== next.reasoningThinkingLabel) return false
  if (prev.reasoningDoneLabel !== next.reasoningDoneLabel) return false
  if (prev.userAvatarUrl !== next.userAvatarUrl) return false
  if (prev.userInitials !== next.userInitials) return false

  const prevCopied = prev.copiedId === prev.id
  const nextCopied = next.copiedId === next.id
  if (prevCopied !== nextCopied) return false

  if (!compareContentParts(prev.contentParts, next.contentParts)) return false
  if (!compareToolCalls(prev.toolCalls, next.toolCalls)) return false

  return true
}

export const ChatMessage = memo(ChatMessageInner, areEqual)
ChatMessage.displayName = 'ChatMessage'
