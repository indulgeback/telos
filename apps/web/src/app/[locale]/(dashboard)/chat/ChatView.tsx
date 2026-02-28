'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import {
  ChatContainer,
  type ChatModelOption,
  type Message,
} from '@/components/organisms'
import type { SuggestionPrompt } from '@/components/atoms'
import { authClient } from '@/lib/auth-client'
import { API_BASE_URL } from '@/service/request'

const AUTO_SCROLL_THRESHOLD_PX = 120

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

type ToolCallItem = NonNullable<Message['toolCalls']>[number]
type ContentPartItem = NonNullable<Message['contentParts']>[number]
type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

const THINK_TAG_REGEX = /<think>([\s\S]*?)<\/think>/gi
const normalizeModelProvider = (
  provider: unknown
): ChatModelOption['provider'] => {
  return provider === 'seed' ? 'seed' : 'deepseek'
}

const stringifyPartValue = (value: unknown) => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

const mapToolState = (state: unknown): ToolCallItem['state'] => {
  if (state === 'output-available') return 'success'
  if (state === 'output-error' || state === 'output-denied') return 'error'
  return 'running'
}

const parseToolCallPart = (part: unknown): ToolCallItem | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>
  const toolCallId =
    typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined
  if (!toolCallId) return null

  const type = typeof raw.type === 'string' ? raw.type : ''
  const fallbackToolName = type.startsWith('tool-') ? type.slice(5) : 'tool'
  const toolName =
    typeof raw.toolName === 'string' && raw.toolName.trim()
      ? raw.toolName
      : fallbackToolName

  return {
    toolCallId,
    toolName,
    state: mapToolState(raw.state),
    inputText: stringifyPartValue(raw.input),
    outputText: stringifyPartValue(raw.output),
    errorText: typeof raw.errorText === 'string' ? raw.errorText : undefined,
  }
}

const parseReasoningPart = (
  part: unknown
): {
  text: string
  state?: 'streaming' | 'done'
} | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>
  if (raw.type !== 'reasoning') return null

  const text =
    typeof raw.text === 'string'
      ? raw.text
      : typeof raw.reasoning === 'string'
        ? raw.reasoning
        : ''
  if (!text) return null

  const state =
    raw.state === 'streaming' || raw.state === 'done'
      ? (raw.state as 'streaming' | 'done')
      : undefined

  return {
    text,
    state,
  }
}

const pushTaggedTextParts = (text: string, target: ContentPartItem[]) => {
  if (!text) return

  const regex = new RegExp(THINK_TAG_REGEX.source, THINK_TAG_REGEX.flags)
  let lastIndex = 0
  let match: RegExpExecArray | null = regex.exec(text)

  while (match) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length
    const before = text.slice(lastIndex, matchStart)
    if (before.trim()) {
      target.push({ type: 'text', text: before })
    }

    const reasoningText = (match[1] ?? '').trim()
    if (reasoningText) {
      target.push({
        type: 'reasoning',
        reasoning: {
          text: reasoningText,
          state: 'done',
        },
      })
    }

    lastIndex = matchEnd
    match = regex.exec(text)
  }

  const after = text.slice(lastIndex)
  if (after.trim()) {
    target.push({ type: 'text', text: after })
  }
}

const extractLegacyContent = (message: unknown): string => {
  if (!message || typeof message !== 'object') return ''
  if (!('content' in message)) return ''

  const value = (message as Record<string, unknown>).content
  return typeof value === 'string' ? value : ''
}

const extractAssistantContentParts = (parts: unknown[]): ContentPartItem[] => {
  const result: ContentPartItem[] = []
  const toolIndexById = new Map<string, number>()
  let textBuffer = ''

  const flushText = () => {
    if (!textBuffer.trim()) {
      textBuffer = ''
      return
    }
    pushTaggedTextParts(textBuffer, result)
    textBuffer = ''
  }

  parts.forEach(part => {
    if (isTextPart(part)) {
      textBuffer += part.text
      return
    }

    const reasoning = parseReasoningPart(part)
    if (reasoning) {
      flushText()
      result.push({
        type: 'reasoning',
        reasoning,
      })
      return
    }

    const tool = parseToolCallPart(part)
    if (!tool) return

    flushText()
    const existingIndex = toolIndexById.get(tool.toolCallId)
    const toolPart: ContentPartItem = { type: 'tool', tool }

    if (existingIndex !== undefined) {
      result[existingIndex] = toolPart
    } else {
      toolIndexById.set(tool.toolCallId, result.length)
      result.push(toolPart)
    }
  })

  flushText()
  return result
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
  const shouldAutoScrollRef = useRef(true)
  const isStreamingRef = useRef(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [modelOptions, setModelOptions] = useState<ChatModelOption[]>([])
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>('medium')

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE_URL}/api/agent`,
        credentials: 'include',
      }),
    []
  )

  const { messages, status, setMessages, sendMessage, regenerate } = useChat({
    transport: chatTransport,
    experimental_throttle: 60,
  })

  useEffect(() => {
    let disposed = false

    const loadModels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/agent/models`, {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(`Load models failed: ${response.status}`)
        }

        const payload = (await response.json()) as {
          data?: Array<{
            model?: unknown
            label?: unknown
            provider?: unknown
            isReasoning?: unknown
          }>
        }

        const models: ChatModelOption[] = Array.isArray(payload.data)
          ? payload.data
              .filter(
                item =>
                  item &&
                  typeof item.model === 'string' &&
                  item.model.trim() &&
                  typeof item.label === 'string' &&
                  item.label.trim()
              )
              .map(item => ({
                model: item.model as string,
                label: item.label as string,
                provider: normalizeModelProvider(item.provider),
                isReasoning: Boolean(item.isReasoning),
              }))
          : []

        if (disposed) return
        setModelOptions(models)
        setSelectedModel(prev => {
          if (prev && models.some(item => item.model === prev)) {
            return prev
          }
          return models[0]?.model ?? ''
        })
      } catch (error) {
        console.error('Failed to load chat models', error)
        if (!disposed) {
          setModelOptions([])
          setSelectedModel('')
        }
      }
    }

    loadModels()

    return () => {
      disposed = true
    }
  }, [])

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

  useEffect(() => {
    isStreamingRef.current = isLoading
  }, [isLoading])

  const selectedModelOption = useMemo(
    () => modelOptions.find(item => item.model === selectedModel),
    [modelOptions, selectedModel]
  )
  const supportsReasoningEffort = selectedModelOption?.provider === 'seed'

  const buildRequestBody = (): { model?: string; reasoningEffort?: string } => {
    const body: { model?: string; reasoningEffort?: string } = {}
    if (selectedModel) {
      body.model = selectedModel
    }
    if (supportsReasoningEffort) {
      body.reasoningEffort = reasoningEffort
    }
    return body
  }

  const uiMessages = useMemo((): Message[] => {
    return messages.filter(isRenderableMessage).map(message => {
      const textFromParts = Array.isArray(message.parts)
        ? message.parts
            .filter(isTextPart)
            .map(part => part.text)
            .join('')
        : ''
      const fallbackText = extractLegacyContent(message)
      const textContent = textFromParts || fallbackText

      const assistantContentParts =
        message.role === 'assistant' && Array.isArray(message.parts)
          ? extractAssistantContentParts(message.parts)
          : message.role === 'assistant' && fallbackText
            ? (() => {
                const fallbackParts: ContentPartItem[] = []
                pushTaggedTextParts(fallbackText, fallbackParts)
                return fallbackParts
              })()
            : []
      const toolCalls = assistantContentParts
        .filter(part => part.type === 'tool')
        .map(part => part.tool)

      return {
        id: message.id,
        role: message.role,
        content: textContent,
        contentParts:
          message.role === 'assistant' ? assistantContentParts : undefined,
        toolCalls: message.role === 'assistant' ? toolCalls : undefined,
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
    const container = scrollRef.current
    if (!container) return

    const updateAutoScrollState = () => {
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      const isNearBottom = distanceToBottom <= AUTO_SCROLL_THRESHOLD_PX

      if (isNearBottom) {
        shouldAutoScrollRef.current = true
        setShowScrollToBottom(false)
        return
      }

      // 仅在流式生成期间用户上滑时，暂停自动跟随到底部
      if (isStreamingRef.current && shouldAutoScrollRef.current) {
        shouldAutoScrollRef.current = false
      }

      // 无论是否在生成，只要离开底部就展示“回到底部”按钮
      setShowScrollToBottom(true)
    }

    updateAutoScrollState()
    container.addEventListener('scroll', updateAutoScrollState, {
      passive: true,
    })

    return () => {
      container.removeEventListener('scroll', updateAutoScrollState)
    }
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container || !shouldAutoScrollRef.current) return

    window.requestAnimationFrame(() => {
      if (!scrollRef.current || !shouldAutoScrollRef.current) return
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    })
  }, [displayMessages])

  const handleScrollToBottom = () => {
    const container = scrollRef.current
    if (!container) return

    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    })
  }

  const handleSend = async (messageContent?: string) => {
    const shouldUseMessageContent =
      messageContent && typeof messageContent === 'string'
    const contentToSend = (shouldUseMessageContent ? messageContent : input)
      .toString()
      .trim()
    if (!contentToSend || isLoading) return

    setInput('')
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)

    await sendMessage(
      {
        text: contentToSend,
      },
      {
        body: buildRequestBody(),
      }
    )
    textareaRef.current?.focus()
  }

  const handleRetry = () => {
    if (!lastUserMessage || isLoading) return
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    regenerate({ body: buildRequestBody() })
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClear = () => {
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    setMessages([])
  }

  return (
    <ChatContainer
      selectedModel={selectedModel}
      modelOptions={modelOptions}
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
      onScrollToBottom={handleScrollToBottom}
      onModelChange={setSelectedModel}
      reasoningEffort={reasoningEffort}
      onReasoningEffortChange={setReasoningEffort}
      modelLabel={t('model.label')}
      modelEmptyLabel={t('model.empty')}
      modelReasoningLabel={t('model.reasoning')}
      reasoningEffortLabel={t('toolbar.reasoning')}
      reasoningEffortMinimal={t('reasoningEffort.minimal')}
      reasoningEffortLow={t('reasoningEffort.low')}
      reasoningEffortMedium={t('reasoningEffort.medium')}
      reasoningEffortHigh={t('reasoningEffort.high')}
      clearConversationLabel={t('clearConversation')}
      refreshSuggestionsLabel={t('actions.refresh')}
      scrollToBottomLabel={t('actions.scrollToBottom')}
      inputPlaceholder={t('input.placeholder')}
      sendAriaLabel={t('input.sendAriaLabel')}
      disclaimer={t('disclaimer')}
      emptyStateTitle={t('emptyState.title')}
      emptyStateDescription={t('emptyState.description')}
      copyLabel={t('actions.copy')}
      copiedLabel={t('actions.copied')}
      retryLabel={t('actions.retry')}
      reasoningTitle={t('reasoning.title')}
      reasoningThinkingLabel={t('reasoning.thinking')}
      reasoningDoneLabel={t('reasoning.done')}
      showScrollToBottom={showScrollToBottom}
      showReasoningEffort={supportsReasoningEffort}
      disableModelSelect={isLoading || modelOptions.length === 0}
      disableReasoningEffort={isLoading}
      userAvatarUrl={userAvatarUrl}
      userInitials={userInitials}
    />
  )
}
