'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { ChatContainer, type Message } from '@/components/organisms'
import type { SuggestionPrompt } from '@/components/atoms'
import { authClient } from '@/lib/auth-client'
import { API_BASE_URL } from '@/service/request'

const isTextPart = (part: unknown): part is { type: 'text'; text: string } => {
  return (
    !!part &&
    typeof part === 'object' &&
    (part as { type?: string }).type === 'text' &&
    typeof (part as { text?: unknown }).text === 'string'
  )
}

const isRenderableMessage = <T extends { role: string }>(
  message: T
): message is T & { role: 'user' | 'assistant' } => {
  return message.role === 'user' || message.role === 'assistant'
}

export function ChatView() {
  const t = useTranslations('Chat')
  const { data: session } = authClient.useSession()

  // 计算用户头像和首字母
  const userAvatarUrl = session?.user?.image || null
  const userInitials = useMemo(() => {
    if (!session?.user?.name) return null
    return session?.user?.name
      .trim()
      .split(/\s+/) // 按一个或多个空白字符分割
      .filter(Boolean) // 移除空字符串
      .map(n => n[0]!) // 取首字母
      .slice(0, 2) // 最多取两个首字母
      .join('')
      .toUpperCase()
  }, [session?.user?.name])

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const { messages, status, setMessages, sendMessage, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE_URL}/api/agent`,
      credentials: 'include',
    }),
  })

  const suggestionPrompts = useMemo(
    (): SuggestionPrompt[] => [
      {
        icon: '🍽️',
        label: t('suggestions.whatToEat.label'),
        prompt: t('suggestions.whatToEat.prompt'),
      },
      {
        icon: '🧳',
        label: t('suggestions.tripList.label'),
        prompt: t('suggestions.tripList.prompt'),
      },
      {
        icon: '💬',
        label: t('suggestions.quickReply.label'),
        prompt: t('suggestions.quickReply.prompt'),
      },
      {
        icon: '🧾',
        label: t('suggestions.quickSummary.label'),
        prompt: t('suggestions.quickSummary.prompt'),
      },
      {
        icon: '🧠',
        label: t('suggestions.makeDecision.label'),
        prompt: t('suggestions.makeDecision.prompt'),
      },
      {
        icon: '🧘',
        label: t('suggestions.focusPlan.label'),
        prompt: t('suggestions.focusPlan.prompt'),
      },
      {
        icon: '🛒',
        label: t('suggestions.groceryList.label'),
        prompt: t('suggestions.groceryList.prompt'),
      },
      {
        icon: '🏃',
        label: t('suggestions.workoutPlan.label'),
        prompt: t('suggestions.workoutPlan.prompt'),
      },
      {
        icon: '💤',
        label: t('suggestions.sleepTip.label'),
        prompt: t('suggestions.sleepTip.prompt'),
      },
      {
        icon: '📖',
        label: t('suggestions.learnQuick.label'),
        prompt: t('suggestions.learnQuick.prompt'),
      },
      {
        icon: '💰',
        label: t('suggestions.saveMoney.label'),
        prompt: t('suggestions.saveMoney.prompt'),
      },
      {
        icon: '🧽',
        label: t('suggestions.homeChores.label'),
        prompt: t('suggestions.homeChores.prompt'),
      },
    ],
    [t]
  )

  const isLoading = status === 'submitted' || status === 'streaming'

  const uiMessages = useMemo((): Message[] => {
    return messages.filter(isRenderableMessage).map(message => {
      const textParts = Array.isArray(message.parts)
        ? message.parts.filter(isTextPart).map(part => part.text)
        : []
      return {
        id: message.id,
        role: message.role,
        content: textParts.join(''),
      }
    })
  }, [messages])

  const displayMessages = useMemo(() => {
    if (!isLoading) return uiMessages
    const last = uiMessages[uiMessages.length - 1]
    if (last && last.role === 'assistant') return uiMessages
    return [
      ...uiMessages,
      {
        id: 'pending-assistant',
        role: 'assistant' as const,
        content: '',
      },
    ]
  }, [uiMessages, isLoading])

  const lastUserMessage = useMemo(() => {
    for (let i = displayMessages.length - 1; i >= 0; i -= 1) {
      if (displayMessages[i]?.role === 'user') {
        return displayMessages[i]?.content || ''
      }
    }
    return ''
  }, [displayMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayMessages])

  const handleSend = async (messageContent?: string) => {
    const shouldUseMessageContent =
      messageContent && typeof messageContent === 'string'
    const contentToSend = (shouldUseMessageContent ? messageContent : input)
      .toString()
      .trim()
    if (!contentToSend || isLoading) return

    setInput('')

    await sendMessage({
      text: contentToSend,
    })
    textareaRef.current?.focus()
  }

  const handleRetry = () => {
    if (!lastUserMessage || isLoading) return
    regenerate()
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
      messages={displayMessages}
      input={input}
      isLoading={isLoading}
      copiedId={copiedId}
      suggestionPrompts={suggestionPrompts}
      lastUserMessage={lastUserMessage}
      scrollRef={scrollRef}
      textareaRef={textareaRef}
      onInputChange={setInput}
      onSend={handleSend}
      onRetry={handleRetry}
      onCopy={handleCopy}
      onClear={handleClear}
      clearConversationLabel={t('clearConversation')}
      refreshSuggestionsLabel={t('actions.refresh')}
      inputPlaceholder={t('input.placeholder')}
      sendAriaLabel={t('input.sendAriaLabel')}
      disclaimer={t('disclaimer')}
      emptyStateTitle={t('emptyState.title')}
      emptyStateDescription={t('emptyState.description')}
      copyLabel={t('actions.copy')}
      copiedLabel={t('actions.copied')}
      retryLabel={t('actions.retry')}
      userAvatarUrl={userAvatarUrl}
      userInitials={userInitials}
    />
  )
}
