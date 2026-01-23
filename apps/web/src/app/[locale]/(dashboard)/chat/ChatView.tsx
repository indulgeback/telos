'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { agentService, type Agent, type ToolCall } from '@/service/agent'
import { useTranslations } from 'next-intl'
import { ChatContainer, type Message } from '@/components/organisms'
import type { SuggestionPrompt } from '@/components/atoms'
import { type StreamChunk } from '@/service/agent'

export function ChatView() {
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

  // 处理工具调用事件
  const handleToolCallEvent = (
    assistantMessage: Message,
    chunk: StreamChunk,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    if (!chunk.toolCall) return

    setMessages(prev => {
      return prev.map(m => {
        if (m.id !== assistantMessage.id) return m

        // 获取或初始化工具调用列表
        const currentToolCalls = m.toolCalls || []
        const existingToolCallIndex = currentToolCalls.findIndex(
          tc => tc.id === chunk.toolCall!.id
        )

        let updatedToolCalls: ToolCall[]

        if (existingToolCallIndex >= 0) {
          // 更新现有工具调用
          updatedToolCalls = [...currentToolCalls]
          updatedToolCalls[existingToolCallIndex] = {
            ...updatedToolCalls[existingToolCallIndex],
            ...chunk.toolCall,
          }
        } else {
          // 添加新工具调用
          updatedToolCalls = [...currentToolCalls, chunk.toolCall!]
        }

        return { ...m, toolCalls: updatedToolCalls }
      })
    })
  }

  const handleSend = async (messageContent?: string) => {
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
      toolCalls: [],
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      await agentService.chatStream(
        contentToSend,
        chunk => {
          // 处理工具调用事件
          if (chunk.type?.startsWith('tool_call')) {
            handleToolCallEvent(assistantMessage, chunk, setMessages)
          }

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

  const handleClear = () => {
    setMessages([])
  }

  return (
    <ChatContainer
      messages={messages}
      input={input}
      isLoading={isLoading}
      copiedId={copiedId}
      selectedAgentId={selectedAgent?.id || null}
      suggestionPrompts={suggestionPrompts}
      scrollRef={scrollRef}
      textareaRef={textareaRef}
      onInputChange={setInput}
      onSend={handleSend}
      onRetry={handleRetry}
      onCopy={handleCopy}
      onClear={handleClear}
      onAgentChange={setSelectedAgent}
      title={t('title')}
      subtitle={t('subtitle')}
      clearConversationLabel={t('clearConversation')}
      inputPlaceholder={t('input.placeholder')}
      sendAriaLabel={t('input.sendAriaLabel')}
      disclaimer={t('disclaimer')}
      emptyStateTitle={t('emptyState.title')}
      emptyStateDescription={t('emptyState.description')}
      copyLabel={t('actions.copy')}
      copiedLabel={t('actions.copied')}
      retryLabel={t('actions.retry')}
      errorMessage={t('error.message')}
      lastUserMessage={lastUserMessage}
    />
  )
}
