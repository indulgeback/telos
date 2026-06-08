'use client'

import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  AgentSelector,
  ChatContainer,
  type ChatModelOption,
  type Message,
} from '@/components/organisms'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  type SuggestionPrompt,
} from '@/components/atoms'
import { authClient } from '@/lib/auth-client'
import { uploadImageToCos } from '@/lib/cos-upload'
import { API_BASE_URL } from '@/service/request'
import {
  agentService,
  type Agent,
  type AgentMessage,
  type AgentThread,
} from '@/service/agent'
import {
  MessageSquare,
  Mic2,
  MicOff,
  PhoneOff,
  Pencil,
  Plus,
  Search,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react'

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
type AgentRunDataPart = {
  type: 'data-agent-run'
  data?: {
    threadId?: string
    runId?: string
    agentId?: string
  }
}
type ChatUiMessage = {
  id: string
  role: 'user' | 'assistant'
  parts?: unknown[]
  content?: string
  isVoiceTranscript?: boolean
}
type ChatStatus = 'ready' | 'submitted' | 'streaming'
type RealtimeMicState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error'
type AgentStreamChunk = {
  type?: string
  id?: string
  turnId?: string
  data?: AgentRunDataPart['data']
  delta?: string
  transcript?: string
  toolCallId?: string
  toolName?: string
  input?: unknown
  inputTextDelta?: string
  output?: unknown
  errorText?: string
  error?: unknown
}

type RealtimeConfig = {
  configured: boolean
  readyForRealConnection?: boolean
  demo: boolean
  mode?: 'demo' | 'real'
  missingEnv?: string[]
  endpoint: string
  model: string
  resourceId: string
  defaultInputMode: string
  defaultAudioFormat: string
}

const THINK_TAG_REGEX = /<think>([\s\S]*?)<\/think>/gi
const normalizeModelProvider = (
  provider: unknown
): ChatModelOption['provider'] => {
  if (provider === 'seed') return 'seed'
  if (provider === 'bailian') return 'bailian'
  if (provider === 'gcloud') return 'gcloud'
  if (provider === 'openai') return 'openai'
  if (provider === 'shortapi') return 'shortapi'
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

const messageToUiMessage = (message: AgentMessage) => {
  const persistedParts = Array.isArray(message.parts) ? message.parts : []

  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
    isVoiceTranscript: hasLiveTranscriptMarker(persistedParts),
    parts:
      persistedParts.length > 0
        ? persistedParts
        : [{ type: 'text', text: message.content }],
  }
}

const createTextPart = (text: string) => ({ type: 'text', text })

const createReasoningPart = (
  text = '',
  state: 'streaming' | 'done' = 'streaming'
) => ({
  type: 'reasoning',
  text,
  state,
})

const createToolPart = (
  toolCallId: string,
  toolName: string,
  state: string,
  input?: unknown,
  output?: unknown,
  errorText?: string
) => ({
  type: 'tool',
  toolCallId,
  toolName,
  state,
  input,
  output,
  errorText,
})

const createLiveTranscriptMarker = () => ({
  type: 'live-transcript',
})

const hasLiveTranscriptMarker = (parts: unknown[] | undefined) => {
  if (!Array.isArray(parts)) return false
  return parts.some(
    part =>
      !!part &&
      typeof part === 'object' &&
      (part as { type?: unknown }).type === 'live-transcript'
  )
}

const getTextFromParts = (parts: unknown[] | undefined) => {
  if (!Array.isArray(parts)) return ''
  return parts
    .filter(isTextPart)
    .map(part => part.text)
    .join('')
}

const formatElapsedSeconds = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

const getDisplayThreadTitle = (title?: string | null) => {
  const safeTitle = title?.trim()
  if (!safeTitle || isVoicePlaceholder(safeTitle)) {
    return '语音对话'
  }
  return safeTitle
}

const isVoicePlaceholder = (value?: string | null) => {
  const safeValue = value?.trim()
  return safeValue === '(Voice input)' || safeValue === '（语音输入）'
}

const getDisplayMessageContent = (content: string) => {
  if (isVoicePlaceholder(content)) return '语音输入'
  return content
}

const hasTextContent = (parts: unknown[] | undefined) => {
  return getTextFromParts(parts).trim().length > 0
}

const parseUiMessageStreamChunk = (raw: string): AgentStreamChunk | null => {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '[DONE]') return null
  try {
    return JSON.parse(trimmed) as AgentStreamChunk
  } catch {
    return null
  }
}

const createClientMessageId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const getRealtimeWebSocketUrl = () => {
  const url = new URL(API_BASE_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/api/agent/realtime/audio'
  url.search = ''
  return url.toString()
}

const downsampleToPcm16 = (
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000
) => {
  if (inputSampleRate === outputSampleRate) {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    input.forEach((sample, index) => {
      const clamped = Math.max(-1, Math.min(1, sample))
      view.setInt16(
        index * 2,
        clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
        true
      )
    })
    return buffer
  }

  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.floor(input.length / ratio)
  const buffer = new ArrayBuffer(outputLength * 2)
  const view = new DataView(buffer)

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j += 1) {
      sum += input[j] ?? 0
    }
    const sample = sum / Math.max(1, end - start)
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(
      i * 2,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    )
  }

  return buffer
}

const base64ToArrayBuffer = (value: string) => {
  const binary = window.atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return buffer
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
    typeof raw.toolCallId === 'string'
      ? raw.toolCallId
      : typeof raw.tool_call_id === 'string'
        ? raw.tool_call_id
        : undefined
  if (!toolCallId) return null

  const type = typeof raw.type === 'string' ? raw.type : ''
  const fallbackToolName = type.startsWith('tool-') ? type.slice(5) : 'tool'
  const toolName =
    typeof raw.toolName === 'string' && raw.toolName.trim()
      ? raw.toolName
      : typeof raw.tool_name === 'string' && raw.tool_name.trim()
        ? raw.tool_name
        : fallbackToolName

  return {
    toolCallId,
    toolName,
    state: mapToolState(raw.state),
    inputText: stringifyPartValue(raw.input),
    outputText: stringifyPartValue(raw.output),
    errorText:
      typeof raw.errorText === 'string'
        ? raw.errorText
        : typeof raw.error_text === 'string'
          ? raw.error_text
          : undefined,
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
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [threads, setThreads] = useState<AgentThread[]>([])
  const [threadSearch, setThreadSearch] = useState('')
  const [threadToRename, setThreadToRename] = useState<AgentThread | null>(null)
  const [renameThreadTitle, setRenameThreadTitle] = useState('')
  const [isRenamingThread, setIsRenamingThread] = useState(false)
  const [threadToDelete, setThreadToDelete] = useState<AgentThread | null>(null)
  const [isDeletingThread, setIsDeletingThread] = useState(false)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const currentThreadIdRef = useRef<string | null>(null)
  const threadsLoadRequestRef = useRef(0)
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [modelOptions, setModelOptions] = useState<ChatModelOption[]>([])
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>('medium')
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)
  const [realtimeConfig, setRealtimeConfig] = useState<RealtimeConfig | null>(
    null
  )
  const [realtimeConfigLoading, setRealtimeConfigLoading] = useState(false)
  const [realtimeMicState, setRealtimeMicState] =
    useState<RealtimeMicState>('idle')
  const [realtimeStartedAt, setRealtimeStartedAt] = useState<number | null>(
    null
  )
  const [realtimeElapsedSeconds, setRealtimeElapsedSeconds] = useState(0)
  const [realtimeErrorText, setRealtimeErrorText] = useState<string | null>(
    null
  )
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
  const [messages, setMessages] = useState<ChatUiMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const abortControllerRef = useRef<AbortController | null>(null)
  const realtimeSocketRef = useRef<WebSocket | null>(null)
  const realtimeStreamRef = useRef<MediaStream | null>(null)
  const realtimeAudioContextRef = useRef<AudioContext | null>(null)
  const realtimeSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const realtimeProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const realtimeUserIdRef = useRef<string | null>(null)
  const realtimeAssistantIdRef = useRef<string | null>(null)
  const realtimePlaybackTimeRef = useRef(0)
  const isLoading = status === 'submitted' || status === 'streaming'
  const realtimeAvailable = Boolean(realtimeConfig?.configured)
  const isRealtimeMicActive =
    realtimeMicState === 'connecting' ||
    realtimeMicState === 'listening' ||
    realtimeMicState === 'speaking'

  useEffect(() => {
    currentThreadIdRef.current = currentThreadId
  }, [currentThreadId])

  useEffect(() => {
    if (!isRealtimeMicActive || !realtimeStartedAt) {
      setRealtimeElapsedSeconds(0)
      return
    }

    const updateElapsed = () => {
      setRealtimeElapsedSeconds((Date.now() - realtimeStartedAt) / 1000)
    }

    updateElapsed()
    const interval = window.setInterval(updateElapsed, 1000)
    return () => window.clearInterval(interval)
  }, [isRealtimeMicActive, realtimeStartedAt])

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

  useEffect(() => {
    let disposed = false

    const loadRealtimeConfig = async () => {
      try {
        setRealtimeConfigLoading(true)
        const response = await fetch(
          `${API_BASE_URL}/api/agent/realtime/config`,
          {
            credentials: 'include',
          }
        )
        if (!response.ok) {
          throw new Error(`Load realtime config failed: ${response.status}`)
        }
        const payload = (await response.json()) as {
          data?: RealtimeConfig
        }
        if (!disposed) {
          setRealtimeConfig(payload.data ?? null)
        }
      } catch (error) {
        console.error('Failed to load realtime config', error)
        if (!disposed) {
          setRealtimeConfig(null)
        }
      } finally {
        if (!disposed) {
          setRealtimeConfigLoading(false)
        }
      }
    }

    void loadRealtimeConfig()

    return () => {
      disposed = true
    }
  }, [])

  const loadThreadMessages = useCallback(
    async (threadId: string, options?: { requestId?: number }) => {
      const storedMessages = await agentService.listThreadMessages(threadId)
      if (
        options?.requestId !== undefined &&
        options.requestId !== threadsLoadRequestRef.current
      ) {
        return
      }
      setMessages(
        storedMessages
          .filter(
            message => message.role === 'user' || message.role === 'assistant'
          )
          .map(messageToUiMessage) as any
      )
      setCurrentThreadId(threadId)
      pendingImageBatchesRef.current = []
      setImagesByMessageId({})
      setAssistantModelById({})
    },
    [setMessages]
  )

  const loadThreads = useCallback(
    async (options?: { selectLatest?: boolean }) => {
      const requestId = threadsLoadRequestRef.current + 1
      threadsLoadRequestRef.current = requestId
      const agentId = selectedAgent?.id

      if (!agentId) {
        setThreads([])
        setCurrentThreadId(null)
        setMessages([])
        setThreadsLoading(false)
        return
      }

      setThreadsLoading(true)
      try {
        const data = await agentService.listThreads({
          agentId,
        })
        if (requestId !== threadsLoadRequestRef.current) return
        setThreads(data)
        if (options?.selectLatest) {
          const latest = data[0]
          if (latest) {
            await loadThreadMessages(latest.id, { requestId })
          } else {
            setCurrentThreadId(null)
            setMessages([])
          }
        }
      } catch (error) {
        console.error('Failed to load agent threads', error)
      } finally {
        if (requestId === threadsLoadRequestRef.current) {
          setThreadsLoading(false)
        }
      }
    },
    [loadThreadMessages, selectedAgent?.id, setMessages]
  )

  useEffect(() => {
    void loadThreads({ selectLatest: true })
  }, [loadThreads])

  const updateAssistantParts = useCallback(
    (
      assistantId: string,
      updater: (parts: Array<Record<string, unknown>>) => void
    ) => {
      setMessages(prev =>
        prev.map(message => {
          if (message.id !== assistantId || message.role !== 'assistant') {
            return message
          }

          const parts = Array.isArray(message.parts)
            ? (message.parts.map(part =>
                part && typeof part === 'object'
                  ? { ...(part as Record<string, unknown>) }
                  : part
              ) as Array<Record<string, unknown>>)
            : []
          updater(parts)

          return {
            ...message,
            parts,
            content: getTextFromParts(parts),
          }
        })
      )
    },
    []
  )

  const ensureRealtimeTurnMessages = useCallback(() => {
    if (realtimeUserIdRef.current && realtimeAssistantIdRef.current) {
      return {
        userId: realtimeUserIdRef.current,
        assistantId: realtimeAssistantIdRef.current,
      }
    }

    const userId = createClientMessageId('user')
    const assistantId = createClientMessageId('assistant')
    realtimeUserIdRef.current = userId
    realtimeAssistantIdRef.current = assistantId
    pendingReplyModelLabelRef.current = t('voice.modelLabel')
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    setMessages(prev => [
      ...prev,
      {
        id: userId,
        role: 'user',
        content: '',
        parts: [],
      },
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        parts: [],
      },
    ])

    return { userId, assistantId }
  }, [t])

  const updateUserTranscript = useCallback((userId: string, text: string) => {
    setMessages(prev =>
      prev.map(message => {
        if (message.id !== userId || message.role !== 'user') return message
        return {
          ...message,
          content: text,
          parts: text
            ? [{ type: 'text', text }, createLiveTranscriptMarker()]
            : [],
          isVoiceTranscript: true,
        }
      })
    )
  }, [])

  const resetRealtimeTurnMessages = useCallback(() => {
    realtimeUserIdRef.current = null
    realtimeAssistantIdRef.current = null
  }, [])

  const applyAgentStreamChunk = useCallback(
    (
      assistantId: string,
      chunk: AgentStreamChunk,
      options: { suppressTextOnFailure?: boolean } = {}
    ) => {
      if (chunk.type === 'data-agent-run' && chunk.data?.threadId) {
        const shouldRefreshThreads =
          currentThreadIdRef.current !== chunk.data.threadId
        currentThreadIdRef.current = chunk.data.threadId
        setCurrentThreadId(chunk.data.threadId)
        if (shouldRefreshThreads) {
          void loadThreads()
        }
        return
      }

      if (chunk.type === 'agent.run.created' && chunk.data?.threadId) {
        const shouldRefreshThreads =
          currentThreadIdRef.current !== chunk.data.threadId
        currentThreadIdRef.current = chunk.data.threadId
        setCurrentThreadId(chunk.data.threadId)
        if (shouldRefreshThreads) {
          void loadThreads()
        }
        return
      }

      if (chunk.type === 'response.failed') {
        const errorText =
          typeof chunk.errorText === 'string'
            ? chunk.errorText
            : typeof chunk.error === 'string'
              ? chunk.error
              : chunk.error && typeof chunk.error === 'object'
                ? JSON.stringify(chunk.error)
                : 'Realtime service failed'
        if (options.suppressTextOnFailure) {
          setRealtimeErrorText(errorText)
          return
        }
        updateAssistantParts(assistantId, parts => {
          parts.push(createTextPart(`实时语音服务错误：${errorText}`))
        })
        return
      }

      if (chunk.type === 'reasoning-start') {
        updateAssistantParts(assistantId, parts => {
          const streamId = `${chunk.id || 'reasoning'}-${parts.length}`
          parts.push({ ...createReasoningPart(), streamId })
        })
        return
      }

      if (
        (chunk.type === 'reasoning-delta' ||
          chunk.type === 'response.reasoning.delta') &&
        chunk.delta
      ) {
        updateAssistantParts(assistantId, parts => {
          let part = parts[parts.length - 1]
          if (!part || part.type !== 'reasoning') {
            part = { ...createReasoningPart(), streamId: chunk.id }
            parts.push(part)
          }
          part.text = `${typeof part.text === 'string' ? part.text : ''}${
            chunk.delta
          }`
          part.state = 'streaming'
        })
        return
      }

      if (
        chunk.type === 'reasoning-end' ||
        chunk.type === 'response.reasoning.done'
      ) {
        updateAssistantParts(assistantId, parts => {
          parts.forEach(part => {
            if (part.type === 'reasoning') {
              part.state = 'done'
            }
          })
        })
        return
      }

      if (
        chunk.type === 'text-start' ||
        chunk.type === 'response.output_text.start'
      ) {
        updateAssistantParts(assistantId, parts => {
          const streamId = `${chunk.id || 'text'}-${parts.length}`
          parts.push({ ...createTextPart(''), streamId })
        })
        return
      }

      if (
        (chunk.type === 'text-delta' ||
          chunk.type === 'response.output_text.delta') &&
        chunk.delta
      ) {
        updateAssistantParts(assistantId, parts => {
          let part = parts[parts.length - 1]
          if (!part || part.type !== 'text') {
            part = { ...createTextPart(''), streamId: chunk.id }
            parts.push(part)
          }
          part.text = `${typeof part.text === 'string' ? part.text : ''}${
            chunk.delta
          }`
        })
        return
      }

      if (
        (chunk.type === 'tool-input-start' ||
          chunk.type === 'response.output_item.added') &&
        chunk.toolCallId
      ) {
        updateAssistantParts(assistantId, parts => {
          if (parts.some(part => part.toolCallId === chunk.toolCallId)) return
          parts.push(
            createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'input-streaming'
            )
          )
        })
        return
      }

      if (
        (chunk.type === 'tool-input-delta' ||
          chunk.type === 'response.function_call_arguments.delta') &&
        chunk.toolCallId
      ) {
        updateAssistantParts(assistantId, parts => {
          let part = parts.find(item => item.toolCallId === chunk.toolCallId)
          if (!part) {
            part = createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'input-streaming'
            )
            parts.push(part)
          }
          const prevInput =
            typeof part.input === 'string' && part.input.trim()
              ? part.input
              : ''
          part.input = `${prevInput}${chunk.inputTextDelta || ''}`
        })
        return
      }

      if (
        (chunk.type === 'tool-input-available' ||
          chunk.type === 'response.function_call_arguments.done') &&
        chunk.toolCallId
      ) {
        updateAssistantParts(assistantId, parts => {
          let part = parts.find(item => item.toolCallId === chunk.toolCallId)
          if (!part) {
            part = createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'input-available'
            )
            parts.push(part)
          }
          part.type = 'tool'
          part.toolName = chunk.toolName || part.toolName || 'tool'
          part.state = 'input-available'
          part.input = chunk.input
        })
        return
      }

      if (
        (chunk.type === 'tool-output-available' ||
          chunk.type === 'agent.tool_call.output') &&
        chunk.toolCallId
      ) {
        updateAssistantParts(assistantId, parts => {
          let part = parts.find(item => item.toolCallId === chunk.toolCallId)
          if (!part) {
            part = createToolPart(
              chunk.toolCallId!,
              chunk.toolName || 'tool',
              'output-available'
            )
            parts.push(part)
          }
          part.type = 'tool'
          part.toolName = chunk.toolName || part.toolName || 'tool'
          part.state = 'output-available'
          part.output = chunk.output
        })
      }
    },
    [loadThreads, updateAssistantParts]
  )

  const streamAgentMessage = useCallback(
    async (body: Record<string, unknown>, assistantId: string) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setStatus('submitted')

      try {
        const response = await fetch(`${API_BASE_URL}/api/agent`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Chat stream failed: ${response.status}`)
        }
        if (!response.body) {
          throw new Error('Chat stream response is empty')
        }

        setStatus('streaming')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split(/\n\n/)
          buffer = frames.pop() ?? ''

          frames.forEach(frame => {
            frame.split(/\n/).forEach(line => {
              if (!line.startsWith('data:')) return
              const chunk = parseUiMessageStreamChunk(line.slice(5))
              if (chunk) applyAgentStreamChunk(assistantId, chunk)
            })
          })
        }

        if (buffer.trim()) {
          buffer.split(/\n/).forEach(line => {
            if (!line.startsWith('data:')) return
            const chunk = parseUiMessageStreamChunk(line.slice(5))
            if (chunk) applyAgentStreamChunk(assistantId, chunk)
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        const message = error instanceof Error ? error.message : String(error)
        updateAssistantParts(assistantId, parts => {
          parts.push(createTextPart(`聊天服务错误：${message}`))
        })
      } finally {
        abortControllerRef.current = null
        setStatus('ready')
      }
    },
    [applyAgentStreamChunk, updateAssistantParts]
  )

  const streamRealtimeTextMessage = useCallback(
    async (input: string, assistantId: string) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setStatus('submitted')

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/agent/realtime/text`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input }),
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(`Realtime stream failed: ${response.status}`)
        }
        if (!response.body) {
          throw new Error('Realtime stream response is empty')
        }

        setStatus('streaming')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split(/\n\n/)
          buffer = frames.pop() ?? ''

          frames.forEach(frame => {
            frame.split(/\n/).forEach(line => {
              if (!line.startsWith('data:')) return
              const chunk = parseUiMessageStreamChunk(line.slice(5))
              if (chunk) applyAgentStreamChunk(assistantId, chunk)
            })
          })
        }

        if (buffer.trim()) {
          buffer.split(/\n/).forEach(line => {
            if (!line.startsWith('data:')) return
            const chunk = parseUiMessageStreamChunk(line.slice(5))
            if (chunk) applyAgentStreamChunk(assistantId, chunk)
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        const message = error instanceof Error ? error.message : String(error)
        updateAssistantParts(assistantId, parts => {
          parts.push(createTextPart(`实时语音服务错误：${message}`))
        })
      } finally {
        abortControllerRef.current = null
        setStatus('ready')
      }
    },
    [applyAgentStreamChunk, updateAssistantParts]
  )

  const stopRealtimeAudioResources = useCallback(() => {
    realtimeProcessorRef.current?.disconnect()
    realtimeSourceRef.current?.disconnect()
    realtimeStreamRef.current?.getTracks().forEach(track => track.stop())
    realtimeProcessorRef.current = null
    realtimeSourceRef.current = null
    realtimeStreamRef.current = null
  }, [])

  const playRealtimePcmAudio = useCallback(
    async (base64Audio: string, format = 'pcm_f32le', sampleRate = 24000) => {
      const AudioContextClass = window.AudioContext
      const audioContext =
        realtimeAudioContextRef.current || new AudioContextClass()
      realtimeAudioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const raw = base64ToArrayBuffer(base64Audio)
      const floatData =
        format === 'pcm_s16le'
          ? (() => {
              const pcm = new Int16Array(raw)
              const samples = new Float32Array(pcm.length)
              for (let i = 0; i < pcm.length; i += 1) {
                samples[i] = (pcm[i] ?? 0) / 0x8000
              }
              return samples
            })()
          : new Float32Array(raw)

      const buffer = audioContext.createBuffer(1, floatData.length, sampleRate)
      buffer.copyToChannel(floatData, 0)

      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)

      const startAt = Math.max(
        audioContext.currentTime,
        realtimePlaybackTimeRef.current
      )
      source.start(startAt)
      realtimePlaybackTimeRef.current = startAt + buffer.duration
    },
    []
  )

  const stopRealtimeMic = useCallback(() => {
    realtimeSocketRef.current?.send(JSON.stringify({ type: 'client.stop' }))
    realtimeSocketRef.current?.close(1000, 'client stopped')
    realtimeSocketRef.current = null
    stopRealtimeAudioResources()
    resetRealtimeTurnMessages()
    setRealtimeStartedAt(null)
    setRealtimeErrorText(null)
    setRealtimeMicState('idle')
    setStatus('ready')
  }, [resetRealtimeTurnMessages, stopRealtimeAudioResources])

  const startRealtimeMic = useCallback(async () => {
    if (isLoading || realtimeMicState === 'connecting') return
    if (!realtimeAvailable) {
      setRealtimeMicState('error')
      return
    }

    pendingReplyModelLabelRef.current = t('voice.modelLabel')
    resetRealtimeTurnMessages()
    setRealtimeErrorText(null)
    setRealtimeStartedAt(null)
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)

    setRealtimeMicState('connecting')
    setStatus('streaming')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      const AudioContextClass = window.AudioContext
      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      const socket = new WebSocket(getRealtimeWebSocketUrl())
      socket.binaryType = 'arraybuffer'

      realtimeStreamRef.current = stream
      realtimeAudioContextRef.current = audioContext
      realtimeSourceRef.current = source
      realtimeProcessorRef.current = processor
      realtimeSocketRef.current = socket
      realtimePlaybackTimeRef.current = 0

      socket.onopen = () => {
        if (realtimeSocketRef.current !== socket) return
        socket.send(
          JSON.stringify({
            type: 'client.start',
            agentId: selectedAgent?.id,
            threadId: currentThreadIdRef.current,
          })
        )
        setRealtimeStartedAt(Date.now())
        setRealtimeMicState('listening')
      }
      socket.onmessage = event => {
        if (realtimeSocketRef.current !== socket) return
        if (typeof event.data !== 'string') return
        const chunk = parseUiMessageStreamChunk(event.data)
        if (!chunk) return
        if (chunk.type === 'response.audio.delta') {
          const audioChunk = chunk as unknown as {
            audio?: unknown
            format?: unknown
            sampleRate?: unknown
          }
          const audio = audioChunk.audio
          if (typeof audio === 'string') {
            setRealtimeMicState('speaking')
            void playRealtimePcmAudio(
              audio,
              typeof audioChunk.format === 'string'
                ? audioChunk.format
                : undefined,
              typeof audioChunk.sampleRate === 'number'
                ? audioChunk.sampleRate
                : undefined
            )
          }
          return
        }

        if (
          chunk.type === 'response.input_audio_transcription.delta' ||
          chunk.type === 'response.input_audio_transcription.completed'
        ) {
          if (typeof chunk.transcript === 'string' && chunk.transcript.trim()) {
            const { userId } = ensureRealtimeTurnMessages()
            updateUserTranscript(userId, chunk.transcript)
          }
          return
        }

        if (chunk.type === 'response.created') return

        if (chunk.type === 'response.completed') {
          resetRealtimeTurnMessages()
          if (realtimeSocketRef.current === socket) {
            setRealtimeMicState('listening')
            setStatus('streaming')
          }
          return
        }

        const { assistantId } = ensureRealtimeTurnMessages()
        applyAgentStreamChunk(assistantId, chunk, {
          suppressTextOnFailure: true,
        })
      }
      socket.onerror = () => {
        if (realtimeSocketRef.current !== socket) return
        setRealtimeMicState('error')
        setRealtimeErrorText(t('voice.socketError'))
      }
      socket.onclose = () => {
        if (realtimeSocketRef.current && realtimeSocketRef.current !== socket) {
          return
        }
        realtimeSocketRef.current = null
        stopRealtimeAudioResources()
        setStatus('ready')
        setRealtimeStartedAt(null)
        setRealtimeMicState(prev => (prev === 'error' ? 'error' : 'idle'))
      }

      processor.onaudioprocess = event => {
        if (socket.readyState !== WebSocket.OPEN) return
        const inputBuffer = event.inputBuffer.getChannelData(0)
        const pcm = downsampleToPcm16(inputBuffer, audioContext.sampleRate)
        socket.send(pcm)
      }
      source.connect(processor)
      processor.connect(audioContext.destination)
    } catch (error) {
      console.error('Failed to start realtime mic', error)
      stopRealtimeAudioResources()
      setRealtimeMicState('error')
      setRealtimeStartedAt(null)
      setRealtimeErrorText(t('voice.microphoneError'))
      setStatus('ready')
    }
  }, [
    applyAgentStreamChunk,
    ensureRealtimeTurnMessages,
    isLoading,
    playRealtimePcmAudio,
    realtimeAvailable,
    realtimeMicState,
    resetRealtimeTurnMessages,
    selectedAgent?.id,
    stopRealtimeAudioResources,
    t,
    updateUserTranscript,
  ])

  useEffect(() => {
    return () => {
      realtimeSocketRef.current?.close(1000, 'unmount')
      stopRealtimeAudioResources()
      void realtimeAudioContextRef.current?.close()
    }
  }, [stopRealtimeAudioResources])

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

  const handleAgentChange = useCallback((agent: Agent) => {
    threadsLoadRequestRef.current += 1
    setSelectedAgent(agent)
    setCurrentThreadId(null)
    currentThreadIdRef.current = null
    setMessages([])
    setImagesByMessageId({})
    setAssistantModelById({})
    pendingImageBatchesRef.current = []
    setUploadedImageUrls([])
    setImagePreviews([])
    setThreadSearch('')
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
  }, [])

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
    images?: string[],
    threadId?: string | null
  ): {
    agentId?: string
    threadId?: string
    model?: string
    reasoningEffort?: string
    images?: string[]
  } => {
    const body: {
      agentId?: string
      threadId?: string
      model?: string
      reasoningEffort?: string
      images?: string[]
    } = {}
    if (selectedAgent?.id) {
      body.agentId = selectedAgent.id
    }
    if (threadId) {
      body.threadId = threadId
    }
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
      const rawTextContent = textFromParts || fallbackText
      const textContent = getDisplayMessageContent(rawTextContent)

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
        isVoiceTranscript:
          message.role === 'user'
            ? Boolean(message.isVoiceTranscript) ||
              hasLiveTranscriptMarker(message.parts) ||
              isVoicePlaceholder(rawTextContent)
            : false,
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
      setImagePreviews([])
      setUploadedImageUrls([])
    }
    shouldAutoScrollRef.current = true
    setShowScrollToBottom(false)
    pendingReplyModelLabelRef.current = selectedModelDisplayLabel

    if (realtimeEnabled) {
      pendingReplyModelLabelRef.current = t('voice.modelLabel')
      const userMessageId = createClientMessageId('user')
      const assistantMessageId = createClientMessageId('assistant')
      setMessages(prev => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          content: contentToSend,
          parts: [{ type: 'text', text: contentToSend }],
        },
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          parts: [],
        },
      ])
      await streamRealtimeTextMessage(contentToSend, assistantMessageId)
      textareaRef.current?.focus()
      return
    }

    let threadIdForRequest = currentThreadId
    if (!threadIdForRequest && selectedAgent?.id) {
      const thread = await agentService.createThread({
        agentId: selectedAgent.id,
        title: contentToSend,
      })
      threadIdForRequest = thread.id
      setCurrentThreadId(thread.id)
      setThreads(prev => [thread, ...prev])
    }

    const userMessageId = createClientMessageId('user')
    const assistantMessageId = createClientMessageId('assistant')
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: contentToSend,
        parts: [{ type: 'text', text: contentToSend }],
      },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        parts: [],
      },
    ])
    if (previewBatch.length > 0) {
      setImagesByMessageId(prev => ({
        ...prev,
        [userMessageId]: previewBatch,
      }))
    }

    await streamAgentMessage(
      {
        messages: [
          {
            role: 'user',
            parts: [{ type: 'text', text: contentToSend }],
          },
        ],
        ...buildRequestBody(imagesForRequest, threadIdForRequest),
      },
      assistantMessageId
    )
    await loadThreads()
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
    const assistantMessageId = createClientMessageId('assistant')
    setMessages(prev => {
      const lastAssistantIndex = [...prev]
        .reverse()
        .findIndex(message => message.role === 'assistant')
      if (lastAssistantIndex === -1) {
        return [
          ...prev,
          { id: assistantMessageId, role: 'assistant', content: '', parts: [] },
        ]
      }
      const removeIndex = prev.length - 1 - lastAssistantIndex
      return [
        ...prev.slice(0, removeIndex),
        { id: assistantMessageId, role: 'assistant', content: '', parts: [] },
      ]
    })
    void streamAgentMessage(
      {
        messages: [
          {
            role: 'user',
            parts: [{ type: 'text', text: lastUserMessage }],
          },
        ],
        ...buildRequestBody(undefined, currentThreadId),
      },
      assistantMessageId
    )
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
    setCurrentThreadId(null)
    setMessages([])
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setStatus('ready')
    shouldAutoScrollRef.current = false
  }

  const handleNewThread = () => {
    setCurrentThreadId(null)
    setMessages([])
    setImagesByMessageId({})
    setAssistantModelById({})
    pendingImageBatchesRef.current = []
    shouldAutoScrollRef.current = true
  }

  const handleSelectThread = async (threadId: string) => {
    if (isLoading || threadId === currentThreadId) return
    await loadThreadMessages(threadId)
  }

  const handleRenameThread = async (thread: AgentThread) => {
    setThreadToRename(thread)
    setRenameThreadTitle(getDisplayThreadTitle(thread.title))
  }

  const handleConfirmRenameThread = async () => {
    if (!threadToRename) return
    const nextTitle = renameThreadTitle.trim()
    if (!nextTitle) return

    setIsRenamingThread(true)
    try {
      await agentService.updateThread(threadToRename.id, { title: nextTitle })
      await loadThreads()
      setThreadToRename(null)
      setRenameThreadTitle('')
    } finally {
      setIsRenamingThread(false)
    }
  }

  const handleDeleteThread = async (thread: AgentThread) => {
    setThreadToDelete(thread)
  }

  const handleConfirmDeleteThread = async () => {
    if (!threadToDelete) return

    setIsDeletingThread(true)
    try {
      await agentService.deleteThread(threadToDelete.id)
      if (threadToDelete.id === currentThreadId) {
        setCurrentThreadId(null)
        setMessages([])
      }
      await loadThreads({ selectLatest: threadToDelete.id === currentThreadId })
      setThreadToDelete(null)
    } finally {
      setIsDeletingThread(false)
    }
  }

  const realtimeStatusLabel = realtimeConfigLoading
    ? t('voice.loading')
    : realtimeAvailable
      ? realtimeConfig?.demo
        ? t('voice.demo')
        : t('voice.ready')
      : t('voice.unconfigured')
  const realtimeMissingEnv = realtimeConfig?.missingEnv ?? []
  const realtimeMicLabel =
    realtimeMicState === 'connecting'
      ? t('voice.connecting')
      : realtimeMicState === 'listening'
        ? t('voice.listening')
        : realtimeMicState === 'speaking'
          ? t('voice.speaking')
          : realtimeMicState === 'error'
            ? t('voice.error')
            : t('voice.idle')
  const realtimeElapsedLabel = formatElapsedSeconds(realtimeElapsedSeconds)
  const realtimeWaveHeights = [10, 18, 26, 15, 32, 22, 14, 28, 18, 24, 12, 20]
  const realtimeToolbarControl = (
    <button
      type='button'
      onClick={() => setRealtimeEnabled(prev => !prev)}
      disabled={isLoading || realtimeConfigLoading}
      className={`inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
        realtimeEnabled
          ? 'border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-border/70 bg-background text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      } ${isLoading || realtimeConfigLoading ? 'opacity-60' : ''}`}
      aria-pressed={realtimeEnabled}
      aria-label={t('voice.toggle')}
      title={t('voice.toggle')}
    >
      <Mic2 className='size-3.5 shrink-0' />
      <span className='truncate'>{t('voice.shortLabel')}</span>
    </button>
  )
  const realtimeStatusPanel = realtimeEnabled ? (
    <div className='overflow-hidden rounded-xl border border-border/70 bg-background/95 p-3 text-xs shadow-sm backdrop-blur-xl'>
      <div className='flex min-w-0 items-center gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span
            className={`inline-flex size-2 shrink-0 rounded-full ${
              isRealtimeMicActive
                ? 'animate-pulse bg-emerald-500'
                : realtimeAvailable
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
            }`}
          />
          <span className='font-medium text-foreground'>
            {isRealtimeMicActive ? 'Live connected' : t('voice.title')}
          </span>
          <span className='rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground'>
            {isRealtimeMicActive ? realtimeElapsedLabel : realtimeStatusLabel}
          </span>
        </div>

        <div className='flex h-8 min-w-[150px] flex-1 items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/20 px-3'>
          {realtimeWaveHeights.map((height, index) => (
            <span
              key={index}
              className={`w-1 rounded-full bg-emerald-500/70 ${
                isRealtimeMicActive ? 'animate-pulse' : 'opacity-35'
              }`}
              style={{ height }}
            />
          ))}
        </div>

        <span className='hidden min-w-20 text-muted-foreground sm:inline'>
          {isRealtimeMicActive ? realtimeMicLabel : t('voice.audioChannel')}
        </span>

        {realtimeMissingEnv.length > 0 && (
          <span
            className='max-w-[180px] truncate rounded-md border border-amber-300/70 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
            title={realtimeMissingEnv.join(', ')}
          >
            {t('voice.missingConfig', {
              count: realtimeMissingEnv.length,
            })}
          </span>
        )}
        {realtimeErrorText && (
          <span
            className='max-w-[220px] truncate rounded-md border border-amber-300/70 bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
            title={realtimeErrorText}
          >
            {realtimeErrorText}
          </span>
        )}
        <button
          type='button'
          className='inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          aria-label='Mute'
          title='Mute'
        >
          <MicOff className='size-3.5' />
        </button>
        <button
          type='button'
          onClick={handleStop}
          disabled={!isLoading}
          className='inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-45'
        >
          <Square className='size-3' />
          Interrupt
        </button>
        <button
          type='button'
          onClick={() =>
            isRealtimeMicActive ? stopRealtimeMic() : void startRealtimeMic()
          }
          disabled={!realtimeAvailable || realtimeConfigLoading}
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            isRealtimeMicActive
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-foreground text-background hover:bg-foreground/90'
          } ${!realtimeAvailable || realtimeConfigLoading ? 'opacity-50' : ''}`}
          aria-label={isRealtimeMicActive ? t('voice.stop') : t('voice.start')}
          title={isRealtimeMicActive ? t('voice.stop') : t('voice.start')}
        >
          {isRealtimeMicActive ? (
            <PhoneOff className='size-4' />
          ) : (
            <Volume2 className='size-4' />
          )}
        </button>
      </div>
    </div>
  ) : null

  const filteredThreads = threads.filter(thread => {
    const title = getDisplayThreadTitle(thread.title)
    if (!threadSearch.trim()) return true
    return title.toLowerCase().includes(threadSearch.trim().toLowerCase())
  })

  return (
    <>
      <div className='flex h-full min-h-0 w-full bg-background'>
        <aside className='hidden w-[292px] shrink-0 border-r border-border/60 bg-muted/25 md:flex md:flex-col'>
          <div className='p-3'>
            <div className='flex items-center justify-between gap-2'>
              <div>
                <p className='text-sm font-medium text-foreground'>
                  {t('threads.title')}
                </p>
              </div>
              <button
                type='button'
                onClick={handleNewThread}
                className='inline-flex size-8 items-center justify-center rounded-md bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/60 transition-colors hover:bg-background hover:text-foreground'
                aria-label={t('threads.new')}
              >
                <Plus className='size-4' />
              </button>
            </div>
            <div className='mt-3'>
              <AgentSelector
                selectedAgentId={selectedAgent?.id ?? null}
                onAgentChange={handleAgentChange}
              />
            </div>
            <label className='mt-3 flex h-8 items-center gap-2 rounded-md bg-background/70 px-2 text-xs text-muted-foreground shadow-sm ring-1 ring-border/50'>
              <Search className='size-3.5 shrink-0' />
              <input
                value={threadSearch}
                onChange={event => setThreadSearch(event.target.value)}
                placeholder={t('threads.search')}
                className='min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70'
              />
            </label>
          </div>
          <div className='min-h-0 flex-1 overflow-y-auto p-2'>
            {threadsLoading ? (
              <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
                {t('threads.loading')}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
                {threads.length === 0
                  ? t('threads.empty')
                  : t('threads.noResults')}
              </div>
            ) : (
              <div className='space-y-1'>
                {filteredThreads.map(thread => (
                  <div
                    key={thread.id}
                    className={`group flex h-10 items-center gap-2 rounded-md px-2 text-sm transition-colors ${
                      thread.id === currentThreadId
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                        : 'bg-muted/45 text-muted-foreground hover:bg-muted/75 hover:text-foreground'
                    }`}
                  >
                    <button
                      type='button'
                      className='flex h-full min-w-0 flex-1 items-center gap-2 text-left'
                      onClick={() => void handleSelectThread(thread.id)}
                    >
                      <MessageSquare className='size-4 shrink-0' />
                      <span className='truncate'>
                        {getDisplayThreadTitle(thread.title)}
                      </span>
                    </button>
                    <div className='flex w-14 shrink-0 justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
                      <button
                        type='button'
                        className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/90 hover:text-foreground'
                        onClick={() => void handleRenameThread(thread)}
                        aria-label={t('threads.rename')}
                      >
                        <Pencil className='size-3.5' />
                      </button>
                      <button
                        type='button'
                        className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/90 hover:text-destructive'
                        onClick={() => void handleDeleteThread(thread)}
                        aria-label={t('threads.delete')}
                      >
                        <Trash2 className='size-3.5' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        <div className='min-w-0 flex-1'>
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
            modelGroupGcloudLabel={t('model.group.gcloud')}
            modelGroupOpenAILabel={t('model.group.openai')}
            modelGroupShortApiLabel={t('model.group.shortapi')}
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
            toolbarLeading={realtimeToolbarControl}
            realtimeStatusPanel={realtimeStatusPanel}
            userAvatarUrl={userAvatarUrl}
            userInitials={userInitials}
          />
        </div>
      </div>

      <Dialog
        open={Boolean(threadToRename)}
        onOpenChange={open => {
          if (!open && !isRenamingThread) {
            setThreadToRename(null)
            setRenameThreadTitle('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('threads.renameTitle')}</DialogTitle>
            <DialogDescription>
              {t('threads.renameDescription')}
            </DialogDescription>
          </DialogHeader>
          <form
            className='space-y-4'
            onSubmit={event => {
              event.preventDefault()
              void handleConfirmRenameThread()
            }}
          >
            <Input
              value={renameThreadTitle}
              onChange={event => setRenameThreadTitle(event.target.value)}
              placeholder={t('threads.renamePlaceholder')}
              disabled={isRenamingThread}
              autoFocus
            />
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                disabled={isRenamingThread}
                onClick={() => {
                  setThreadToRename(null)
                  setRenameThreadTitle('')
                }}
              >
                {t('threads.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={isRenamingThread || !renameThreadTitle.trim()}
              >
                {isRenamingThread ? t('threads.saving') : t('threads.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(threadToDelete)}
        onOpenChange={open => {
          if (!open && !isDeletingThread) setThreadToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('threads.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('threads.deleteConfirm', {
                title: getDisplayThreadTitle(threadToDelete?.title),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingThread}>
              {t('threads.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingThread}
              onClick={event => {
                event.preventDefault()
                void handleConfirmDeleteThread()
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {isDeletingThread ? t('threads.deleting') : t('threads.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
