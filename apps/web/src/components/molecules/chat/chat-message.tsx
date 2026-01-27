'use client'

import { useState } from 'react'
import { Button, Card, TypingIndicator, ChatAvatar } from '@/components/atoms'
import { MarkdownContent } from './markdown-content'
import {
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolCall } from '@/service/agent'

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
  // 工具调用 - 分为内容前和内容后
  toolCallsBefore?: ToolCall[]
  toolCallsAfter?: ToolCall[]
  // 用户头像相关
  userAvatarUrl?: string | null
  userInitials?: string | null
}

// 工具调用状态组件（在气泡内部）
function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'pending':
      case 'running':
        return (
          <Loader2 className='size-3.5 animate-spin text-muted-foreground' />
        )
      case 'success':
        return <Check className='size-3.5 text-green-600 dark:text-green-400' />
      case 'error':
        return (
          <AlertCircle className='size-3.5 text-red-600 dark:text-red-400' />
        )
    }
  }

  return (
    <div className='text-sm'>
      <div
        className='flex items-center justify-between cursor-pointer gap-2 py-1'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center gap-2'>
          <Settings className='size-3.5 text-muted-foreground' />
          <span className='text-muted-foreground'>{toolCall.displayName}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          {getStatusIcon()}
          {(toolCall.output !== undefined || toolCall.error) &&
            (isExpanded ? (
              <ChevronUp className='size-3.5 text-muted-foreground' />
            ) : (
              <ChevronDown className='size-3.5 text-muted-foreground' />
            ))}
        </div>
      </div>

      {isExpanded && (toolCall.output !== undefined || toolCall.error) && (
        <div className='mt-2 pl-5'>
          {toolCall.output !== undefined && (
            <div>
              <pre className='text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto'>
                {typeof toolCall.output === 'string'
                  ? toolCall.output
                  : JSON.stringify(toolCall.output, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.error && (
            <div className='text-xs text-red-600 dark:text-red-400 rounded p-2'>
              {toolCall.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
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
  toolCallsBefore = [],
  toolCallsAfter = [],
  userAvatarUrl,
  userInitials,
}: ChatMessageProps) {
  const isAssistant = role === 'assistant'
  const hasContent = content.length > 0
  const hasToolCallsBefore = toolCallsBefore && toolCallsBefore.length > 0
  const hasToolCallsAfter = toolCallsAfter && toolCallsAfter.length > 0
  const hasAnyToolCalls = hasToolCallsBefore || hasToolCallsAfter

  // 渲染工具调用列表
  const renderToolCalls = (toolCalls: ToolCall[]) =>
    toolCalls.map((toolCall: ToolCall, index: number) => (
      <ToolCallItem key={`${id}-tool-${index}`} toolCall={toolCall} />
    ))

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
          <div className='space-y-3'>
            {/* 内容前的工具调用 */}
            {isAssistant && hasToolCallsBefore && (
              <div className='space-y-2 pb-2 border-b border-border/50'>
                {renderToolCalls(toolCallsBefore)}
              </div>
            )}

            {/* 消息内容 */}
            {isAssistant ? (
              <div className='text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none'>
                {hasContent ? (
                  <MarkdownContent content={content} />
                ) : (
                  !hasAnyToolCalls && <TypingIndicator />
                )}
              </div>
            ) : (
              <p className='whitespace-pre-wrap break-words text-sm leading-relaxed'>
                {hasContent ? content : <TypingIndicator />}
              </p>
            )}

            {/* 内容后的工具调用 */}
            {isAssistant && hasToolCallsAfter && (
              <div className='space-y-2 pt-2 border-t border-border/50'>
                {renderToolCalls(toolCallsAfter)}
              </div>
            )}
          </div>
        </Card>

        {isAssistant && (
          <div className='flex items-center gap-1'>
            {isLoading ? (
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <TypingIndicator />
              </div>
            ) : hasContent || hasAnyToolCalls ? (
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
