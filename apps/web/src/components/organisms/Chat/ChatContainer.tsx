'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Button } from '@/components/atoms'
import {
  ChatInput,
  ChatMessage,
  SuggestionPromptButton,
  type SuggestionPrompt,
} from '@/components/atoms'
import { Sparkles, Bot } from 'lucide-react'
import { agentService, type Agent } from '@/service/agent'
import { useTranslations } from 'next-intl'
import { AgentSelector } from './AgentSelector'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatContainer() {
  const t = useTranslations('Chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const suggestionPrompts = useMemo(
    (): SuggestionPrompt[] => [
      {
        icon: '🚀',
        label: t('suggestions.newProject.label'),
        prompt: t('suggestions.newProject.prompt'),
      },
      {
        icon: '🐛',
        label: t('suggestions.debugCode.label'),
        prompt: t('suggestions.debugCode.prompt'),
      },
      {
        icon: '📝',
        label: t('suggestions.writeDocs.label'),
        prompt: t('suggestions.writeDocs.prompt'),
      },
      {
        icon: '💡',
        label: t('suggestions.creativeIdeas.label'),
        prompt: t('suggestions.creativeIdeas.prompt'),
      },
    ],
    [t]
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (messageContent?: string) => {
    // Ignore event objects from button clicks
    const shouldUseMessageContent =
      messageContent && typeof messageContent === 'string'
    const contentToSend = (shouldUseMessageContent ? messageContent : input)
      .toString()
      .trim()
    if (!contentToSend || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: contentToSend,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setLastUserMessage(contentToSend)
    if (!shouldUseMessageContent) setInput('')
    setIsLoading(true)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      await agentService.chatStream(
        contentToSend,
        chunk => {
          if (chunk.done) {
            setIsLoading(false)
            textareaRef.current?.focus()
            return
          }
          if (chunk.content) {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, content: m.content + chunk.content }
                  : m
              )
            )
          }
        },
        error => {
          console.error('Chat error:', error)
          setIsLoading(false)
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id && !m.content
                ? { ...m, content: t('error.message') }
                : m
            )
          )
        },
        selectedAgent?.id
      )
    } catch (error) {
      console.error('Chat error:', error)
      setIsLoading(false)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id && !m.content
            ? { ...m, content: t('error.message') }
            : m
        )
      )
    }
  }

  const handleRetry = () => {
    if (!lastUserMessage || isLoading) return
    handleSend(lastUserMessage)
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className='flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20'>
      {/* Header */}
      <div className='shrink-0 border-b bg-background/80 backdrop-blur-lg'>
        <div className='flex items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10'>
              <Sparkles className='size-5 text-primary' />
            </div>
            <div>
              <h1 className='font-semibold'>{t('title')}</h1>
              <p className='text-sm text-muted-foreground'>{t('subtitle')}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <AgentSelector
              selectedAgentId={selectedAgent?.id || null}
              onAgentChange={setSelectedAgent}
            />
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setMessages([])}
              className='text-muted-foreground'
            >
              {t('clearConversation')}
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
                <div className='mb-4 inline-flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5'>
                  <Bot className='size-10 text-primary' />
                </div>
                <h2 className='mb-2 text-2xl font-bold'>
                  {t('emptyState.title')}
                </h2>
                <p className='text-muted-foreground'>
                  {t('emptyState.description')}
                </p>
              </div>

              <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                {suggestionPrompts.map(suggestion => (
                  <SuggestionPromptButton
                    key={suggestion.label}
                    suggestion={suggestion}
                    onClick={setInput}
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
                    onCopy={handleCopy}
                    copyLabel={t('actions.copy')}
                    copiedLabel={t('actions.copied')}
                    isLoading={isLastAssistantMessage && isLoading}
                    onRetry={showRetry ? handleRetry : undefined}
                    retryLabel={t('actions.retry')}
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
            onChange={e => setInput(e.target.value)}
            placeholder={t('input.placeholder')}
            onSend={handleSend}
            canSend={input.trim().length > 0}
            sendDisabled={isLoading}
            sendAriaLabel={t('input.sendAriaLabel')}
          />
          <p className='mt-2 text-center text-xs text-muted-foreground'>
            {t('disclaimer')}
          </p>
        </div>
      </div>
    </div>
  )
}
