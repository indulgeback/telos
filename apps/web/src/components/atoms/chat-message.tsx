'use client'

import { useState } from 'react'
import { Button } from './button'
import { Card } from './card'
import { MarkdownContent } from './markdown-content'
import { TypingIndicator } from './typing-indicator'
import { ChatAvatar } from './chat-avatar'
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
  toolCalls?: ToolCall[]
}

// 工具调用状态组件
function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'pending':
      case 'running':
        return <Loader2 className='size-4 animate-spin text-yellow-500' />
      case 'success':
        return <div className='size-4 rounded-full bg-green-500' />
      case 'error':
        return <AlertCircle className='size-4 text-red-500' />
    }
  }

  const getStatusText = () => {
    switch (toolCall.status) {
      case 'pending':
        return '准备中'
      case 'running':
        return '执行中'
      case 'success':
        return '成功'
      case 'error':
        return '失败'
    }
  }

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'running':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-sm',
        toolCall.status === 'running' && 'bg-blue-50/50 border-blue-200',
        toolCall.status === 'error' && 'bg-red-50/50 border-red-200',
        toolCall.status === 'success' && 'bg-green-50/50 border-green-200'
      )}
    >
      <div
        className='flex items-center justify-between cursor-pointer'
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center gap-2'>
          <Settings className='size-4 text-muted-foreground' />
          <span className='font-medium'>{toolCall.displayName}</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs border',
              getStatusColor()
            )}
          >
            {getStatusText()}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {getStatusIcon()}
          {(toolCall.input || toolCall.output || toolCall.error) &&
            (isExpanded ? (
              <ChevronUp className='size-4' />
            ) : (
              <ChevronDown className='size-4' />
            ))}
        </div>
      </div>

      {isExpanded && (
        <div className='mt-3 space-y-2 pl-6'>
          {toolCall.input && (
            <div>
              <div className='text-xs text-muted-foreground mb-1'>
                输入参数:
              </div>
              <pre className='text-xs bg-muted rounded p-2 overflow-x-auto'>
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.output !== undefined && (
            <div>
              <div className='text-xs text-muted-foreground mb-1'>
                返回结果:
              </div>
              <pre className='text-xs bg-muted rounded p-2 overflow-x-auto max-h-32 overflow-y-auto'>
                {typeof toolCall.output === 'string'
                  ? toolCall.output
                  : JSON.stringify(toolCall.output, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.error && (
            <div>
              <div className='text-xs text-red-500 mb-1'>错误信息:</div>
              <div className='text-xs bg-red-50 text-red-600 rounded p-2'>
                {toolCall.error}
              </div>
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
  toolCalls = [],
}: ChatMessageProps) {
  const isAssistant = role === 'assistant'
  const hasContent = content.length > 0
  const hasToolCalls = toolCalls && toolCalls.length > 0

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

        {/* 工具调用列表 */}
        {isAssistant && hasToolCalls && (
          <div className='space-y-2 w-full'>
            {toolCalls.map((toolCall, index) => (
              <ToolCallItem key={`${id}-tool-${index}`} toolCall={toolCall} />
            ))}
          </div>
        )}

        {isAssistant && (
          <div className='flex items-center gap-1'>
            {isLoading ? (
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <TypingIndicator />
              </div>
            ) : hasContent || hasToolCalls ? (
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
