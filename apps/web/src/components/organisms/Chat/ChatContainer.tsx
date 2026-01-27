'use client'

import type { RefObject } from 'react'
import {
  Button,
  SuggestionPromptButton,
  type SuggestionPrompt,
} from '@/components/atoms'
import { ChatInput, ChatInputAction, ChatMessage } from '@/components/molecules'
import { Sparkles, Bot } from 'lucide-react'
import { AgentSelector } from './AgentSelector'
import { Agent, type ToolCall } from '@/service/agent'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  // 工具调用列表 - 分为内容前和内容后
  toolCallsBefore?: ToolCall[]
  toolCallsAfter?: ToolCall[]
}

export interface ChatContainerProps {
  // State
  messages: Message[]
  input: string
  isLoading: boolean
  copiedId: string | null
  selectedAgentId: string | null
  suggestionPrompts: SuggestionPrompt[]
  lastUserMessage: string
  // Refs
  scrollRef: RefObject<HTMLDivElement | null>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  // Callbacks
  onInputChange: (value: string) => void
  onSend: (messageContent?: string) => void
  onRetry: () => void
  onCopy: (content: string, id: string) => void
  onClear: () => void
  onAgentChange: (agent: Agent | null) => void
  // Text
  title: string
  subtitle: string
  clearConversationLabel: string
  inputPlaceholder: string
  sendAriaLabel: string
  disclaimer: string
  emptyStateTitle: string
  emptyStateDescription: string
  copyLabel: string
  copiedLabel: string
  retryLabel: string
  errorMessage: string
  // 输入框操作区域
  inputActions?: React.ReactNode
  // 用户头像相关
  userAvatarUrl?: string | null
  userInitials?: string | null
}

export function ChatContainer({
  messages,
  input,
  isLoading,
  copiedId,
  selectedAgentId,
  suggestionPrompts,
  lastUserMessage,
  scrollRef,
  textareaRef,
  onInputChange,
  onSend,
  onRetry,
  onCopy,
  onClear,
  onAgentChange,
  title,
  subtitle,
  clearConversationLabel,
  inputPlaceholder,
  sendAriaLabel,
  disclaimer,
  emptyStateTitle,
  emptyStateDescription,
  copyLabel,
  copiedLabel,
  retryLabel,
  errorMessage,
  inputActions,
  userAvatarUrl,
  userInitials,
}: ChatContainerProps) {
  return (
    <div className='flex h-full w-full flex-col overflow-hidden bg-linear-to-br from-background via-background to-muted/20'>
      {/* Header */}
      <div className='shrink-0 border-b bg-background/80 backdrop-blur-lg'>
        <div className='flex items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10'>
              <Sparkles className='size-5 text-primary' />
            </div>
            <div>
              <h1 className='font-semibold'>{title}</h1>
              <p className='text-sm text-muted-foreground'>{subtitle}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <AgentSelector
              selectedAgentId={selectedAgentId}
              onAgentChange={onAgentChange}
            />
            <Button
              variant='ghost'
              size='sm'
              onClick={onClear}
              className='text-muted-foreground'
            >
              {clearConversationLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className='flex-1 overflow-y-auto' ref={scrollRef}>
        <div className='mx-auto max-w-3xl px-4 py-8'>
          {messages.length === 0 ? (
            <div className='flex min-h-full flex-col items-center justify-center'>
              <div className='mb-8 text-center'>
                <div className='mb-4 inline-flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-primary/5'>
                  <Bot className='size-10 text-primary' />
                </div>
                <h2 className='mb-2 text-2xl font-bold'>{emptyStateTitle}</h2>
                <p className='text-muted-foreground'>{emptyStateDescription}</p>
              </div>

              <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                {suggestionPrompts.map(suggestion => (
                  <SuggestionPromptButton
                    key={suggestion.label}
                    suggestion={suggestion}
                    onClick={onInputChange}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className='space-y-6'>
              {messages.map(message => {
                const isLastAssistantMessage =
                  message.role === 'assistant' &&
                  message.id === messages[messages.length - 1]?.id
                const showRetry = isLastAssistantMessage && lastUserMessage

                return (
                  <ChatMessage
                    key={message.id}
                    id={message.id}
                    role={message.role}
                    content={message.content}
                    copiedId={copiedId}
                    onCopy={onCopy}
                    copyLabel={copyLabel}
                    copiedLabel={copiedLabel}
                    isLoading={isLastAssistantMessage && isLoading}
                    onRetry={showRetry ? onRetry : undefined}
                    retryLabel={retryLabel}
                    toolCallsBefore={message.toolCallsBefore}
                    toolCallsAfter={message.toolCallsAfter}
                    userAvatarUrl={userAvatarUrl}
                    userInitials={userInitials}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className='shrink-0 border-t bg-background/80 backdrop-blur-lg'>
        <div className='mx-auto max-w-3xl px-4 py-4'>
          <ChatInput
            ref={textareaRef}
            value={input}
            onChange={e => onInputChange(e.target.value)}
            placeholder={inputPlaceholder}
            onSend={onSend}
            canSend={input.trim().length > 0}
            sendDisabled={isLoading}
            sendAriaLabel={sendAriaLabel}
            actions={inputActions}
          />
          <p className='mt-2 text-center text-xs text-muted-foreground'>
            {disclaimer}
          </p>
        </div>
      </div>
    </div>
  )
}
