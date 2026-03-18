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
import { uploadImageToCos } from '@/lib/cos-upload'
import { API_BASE_URL } from '@/service/request'

const AUTO_SCROLL_THRESHOLD_PX = 120
const IMAGE_PLACEHOLDER_PROMPT = '请描述这张图片'
const MAX_IMAGE_ATTACHMENTS = 3

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
  if (provider === 'seed') return 'seed'
  if (provider === 'bailian') return 'bailian'
  return 'deepseek'
}

const supportsReasoningEffortControl = (
  modelOption: ChatModelOption | undefined
) => {
  if (!modelOption) return false
  return (
    modelOption.provider === 'seed' &&
    modelOption.isReasoning &&
    modelOption.model.startsWith('doubao-')
  )
}

const supportsSeedVision = (modelOption: ChatModelOption | undefined) => {
  if (!modelOption) return false
  return (
    modelOption.provider === 'seed' &&
    modelOption.model.startsWith('doubao-seed-')
  )
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Failed to read image file'))
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })

const tryGetImageUrl = (part: unknown): string | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>

  if (typeof raw.url === 'string' && raw.url.trim()) return raw.url
  if (typeof raw.image === 'string' && raw.image.trim()) return raw.image

  const imageUrl = raw.image_url
  if (imageUrl && typeof imageUrl === 'object') {
    const url = (imageUrl as { url?: unknown }).url
    if (typeof url === 'string' && url.trim()) return url
  }

  const file = raw.file
  if (file && typeof file === 'object') {
    const fileUrl = (file as { url?: unknown }).url
    if (typeof fileUrl === 'string' && fileUrl.trim()) return fileUrl
  }

  return null
}

const extractImageUrlsFromMessageParts = (parts: unknown): string[] => {
  if (!Array.isArray(parts)) return []
  const urls: string[] = []

  parts.forEach(part => {
    if (!part || typeof part !== 'object') return
    const type = (part as { type?: unknown }).type
    if (
      type !== 'image' &&
      type !== 'image_url' &&
      type !== 'file' &&
      type !== 'input_image'
    ) {
      return
    }
    const url = tryGetImageUrl(part)
    if (url && !urls.includes(url)) {
      urls.push(url)
    }
  })

  return urls
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
  const lastScrollTopRef = useRef(0)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [modelOptions, setModelOptions] = useState<ChatModelOption[]>([])
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>('medium')
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [assistantModelById, setAssistantModelById] = useState<
    Record<string, string>
  >({})
  const pendingReplyModelLabelRef = useRef('')
  const pendingImageBatchesRef = useRef<string[][]>([])
  const [imagesByMessageId, setImagesByMessageId] = useState<
    Record<string, string[]>
  >({})

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE_URL}/api/agent`,
        credentials: 'include',
      }),
    []
  )

  const { messages, status, setMessages, sendMessage, regenerate, stop } =
    useChat({
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
  const selectedModelDisplayLabel = useMemo(() => {
    return selectedModelOption?.label || selectedModel || ''
  }, [selectedModelOption, selectedModel])
  const supportsReasoningEffort =
    supportsReasoningEffortControl(selectedModelOption)
  const supportsImageUpload = supportsSeedVision(selectedModelOption)

  useEffect(() => {
    if (!supportsImageUpload && imagePreviews.length > 0) {
      setImagePreviews([])
      setUploadedImageUrls([])
    }
  }, [supportsImageUpload, imagePreviews.length])

  useEffect(() => {
    const userMessages = messages.filter(
      message => isRenderableMessage(message) && message.role === 'user'
    )
    if (!userMessages.length) return

    const nextPairs: Array<[string, string[]]> = []

    userMessages.forEach(message => {
      if (imagesByMessageId[message.id]) return

      const fromMessage = extractImageUrlsFromMessageParts(message.parts)
      if (fromMessage.length > 0) {
        nextPairs.push([message.id, fromMessage])
        return
      }

      const pending = pendingImageBatchesRef.current[0]
      if (pending && pending.length > 0) {
        pendingImageBatchesRef.current.shift()
        nextPairs.push([message.id, pending])
      }
    })

    if (!nextPairs.length) return

    setImagesByMessageId(prev => {
      const next = { ...prev }
      nextPairs.forEach(([id, urls]) => {
        next[id] = urls
      })
      return next
    })
  }, [messages, imagesByMessageId])

  const buildRequestBody = (
    images?: string[]
  ): { model?: string; reasoningEffort?: string; images?: string[] } => {
    const body: {
      model?: string
      reasoningEffort?: string
      images?: string[]
    } = {}
    if (selectedModel) {
      body.model = selectedModel
    }
    if (supportsReasoningEffort) {
      body.reasoningEffort = reasoningEffort
    }
    if (supportsImageUpload && images && images.length > 0) {
      body.images = images
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
        images:
          message.role === 'user' ? (imagesByMessageId[message.id] ?? []) : [],
        contentParts:
          message.role === 'assistant' ? assistantContentParts : undefined,
        toolCalls: message.role === 'assistant' ? toolCalls : undefined,
        modelLabel:
          message.role === 'assistant'
            ? assistantModelById[message.id]
            : undefined,
      }
    })
  }, [messages, imagesByMessageId, assistantModelById])

  useEffect(() => {
    const fallbackLabel =
      pendingReplyModelLabelRef.current || selectedModelDisplayLabel
    if (!fallbackLabel) return

    const assistantMessages = messages.filter(
      message => message.role === 'assistant'
    )
    if (!assistantMessages.length) return

    setAssistantModelById(prev => {
      let changed = false
      const next = { ...prev }

      assistantMessages.forEach(message => {
        if (!next[message.id]) {
          next[message.id] = fallbackLabel
          changed = true
        }
      })

      return changed ? next : prev
    })
  }, [messages, selectedModelDisplayLabel])

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

    lastScrollTopRef.current = container.scrollTop

    const updateAutoScrollState = () => {
      const currentScrollTop = container.scrollTop
      const isScrollingUp = currentScrollTop < lastScrollTopRef.current - 1
      lastScrollTopRef.current = currentScrollTop

      if (isStreamingRef.current && isScrollingUp) {
        shouldAutoScrollRef.current = false
        setShowScrollToBottom(true)
        return
      }

      const distanceToBottom =
        container.scrollHeight - currentScrollTop - container.clientHeight
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
    const hasImages = supportsImageUpload && uploadedImageUrls.length > 0
    const shouldUseMessageContent =
      messageContent && typeof messageContent === 'string'
    const textInput = (shouldUseMessageContent ? messageContent : input)
      .toString()
      .trim()
    const contentToSend =
      textInput || (hasImages ? IMAGE_PLACEHOLDER_PROMPT : '')
    if (!contentToSend || isLoading) return

    setInput('')
    const previewBatch = supportsImageUpload ? [...imagePreviews] : []
    const imagesForRequest = hasImages ? [...uploadedImageUrls] : []
    if (previewBatch.length > 0) {
      pendingImageBatchesRef.current.push(previewBatch)
      setImagePreviews([])
      setUploadedImageUrls([])
    }
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    pendingReplyModelLabelRef.current = selectedModelDisplayLabel

    await sendMessage(
      {
        text: contentToSend,
      },
      {
        body: buildRequestBody(imagesForRequest),
      }
    )
    textareaRef.current?.focus()
  }

  const handlePickImages = async (files: FileList | null) => {
    if (!supportsImageUpload || !files || files.length === 0) return
    const remaining = Math.max(
      0,
      MAX_IMAGE_ATTACHMENTS - uploadedImageUrls.length
    )
    if (remaining <= 0) return

    const picked = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, remaining)

    if (!picked.length) return

    try {
      setIsUploadingImages(true)
      const uploadedPairs = await Promise.all(
        picked.map(async file => {
          try {
            const [previewUrl, remoteUrl] = await Promise.all([
              fileToDataUrl(file),
              uploadImageToCos(file),
            ])
            return { previewUrl, remoteUrl }
          } catch (error) {
            console.error('COS upload failed', error)
            return null
          }
        })
      )

      const successPairs = uploadedPairs.filter(
        (item): item is { previewUrl: string; remoteUrl: string } =>
          item !== null
      )

      if (!successPairs.length) return

      setImagePreviews(prev =>
        [...prev, ...successPairs.map(item => item.previewUrl)].slice(
          0,
          MAX_IMAGE_ATTACHMENTS
        )
      )
      setUploadedImageUrls(prev =>
        [...prev, ...successPairs.map(item => item.remoteUrl)].slice(
          0,
          MAX_IMAGE_ATTACHMENTS
        )
      )
    } catch (error) {
      console.error('Failed to parse selected images', error)
    } finally {
      setIsUploadingImages(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleRetry = () => {
    if (!lastUserMessage || isLoading) return
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    pendingReplyModelLabelRef.current = selectedModelDisplayLabel
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
    pendingImageBatchesRef.current = []
    setImagesByMessageId({})
    setUploadedImageUrls([])
    setImagePreviews([])
    setAssistantModelById({})
    setMessages([])
  }

  const handleStop = () => {
    stop()
    shouldAutoScrollRef.current = false
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
      onStop={handleStop}
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
      modelGroupDeepseekLabel={t('model.group.deepseek')}
      modelGroupSeedLabel={t('model.group.seed')}
      modelGroupBailianLabel={t('model.group.bailian')}
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
      stopAriaLabel={t('actions.stop')}
      disclaimer={t('disclaimer')}
      emptyStateTitle={t('emptyState.title')}
      emptyStateDescription={t('emptyState.description')}
      copyLabel={t('actions.copy')}
      copiedLabel={t('actions.copied')}
      retryLabel={t('actions.retry')}
      usedModelLabel={t('actions.usedModel')}
      reasoningTitle={t('reasoning.title')}
      reasoningThinkingLabel={t('reasoning.thinking')}
      reasoningDoneLabel={t('reasoning.done')}
      showScrollToBottom={showScrollToBottom}
      showReasoningEffort={supportsReasoningEffort}
      showImageUpload={supportsImageUpload}
      imagePreviews={imagePreviews}
      onPickImages={handlePickImages}
      onRemoveImage={handleRemoveImage}
      imageUploadLabel='上传图片'
      imageRemoveLabel='移除图片'
      imagePreviewLabel={t('actions.previewImage')}
      imagePrevLabel={t('actions.prevImage')}
      imageNextLabel={t('actions.nextImage')}
      disableModelSelect={isLoading || modelOptions.length === 0}
      disableReasoningEffort={isLoading || isUploadingImages}
      isUploadingImages={isUploadingImages}
      userAvatarUrl={userAvatarUrl}
      userInitials={userInitials}
    />
  )
}
