'use client'
import {
  useCallback,
  useState,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from 'react'
import { useTranslations } from 'next-intl'
import { VoiceSessionScope } from './voice-session-scope'
import { API_BASE_URL } from '@/service/request'
import type { Agent } from '@/service/agent'
import type {
  AgentStreamChunk,
  ChatUiMessage,
  ChatStatus,
  RealtimeConfig,
  RealtimeMicState,
} from './chat-types'
import { createTextPart, createLiveTranscriptMarker } from './chat-types'
import { parseUiMessageStreamChunk } from './chat-plan-utils'
import {
  base64ToArrayBuffer,
  downsampleToPcm16,
  getRealtimeWebSocketUrl,
  createClientMessageId,
} from './chat-audio-utils'

interface RealtimeVoiceOptions {
  isLoading: boolean
  selectedAgent: Agent | null
  currentThreadIdRef: RefObject<string | null>
  pendingReplyModelLabelRef: RefObject<string>
  shouldAutoScrollRef: RefObject<boolean>
  setShowScrollToBottom: Dispatch<SetStateAction<boolean>>
  setMessages: Dispatch<SetStateAction<ChatUiMessage[]>>
  setActiveAssistantId: Dispatch<SetStateAction<string | null>>
  setStatus: Dispatch<SetStateAction<ChatStatus>>
  abortControllerRef: RefObject<AbortController | null>
  pendingClarifyRef: RefObject<unknown>
  applyAgentStreamChunk: (
    assistantId: string,
    chunk: AgentStreamChunk,
    options?: { suppressTextOnFailure?: boolean }
  ) => void
  updateAssistantParts: (
    assistantId: string,
    updater: (parts: Array<Record<string, unknown>>) => void
  ) => void
}

export function useRealtimeVoice({
  isLoading,
  selectedAgent,
  currentThreadIdRef,
  pendingReplyModelLabelRef,
  shouldAutoScrollRef,
  setShowScrollToBottom,
  setMessages,
  setActiveAssistantId,
  setStatus,
  abortControllerRef,
  pendingClarifyRef,
  applyAgentStreamChunk,
  updateAssistantParts,
}: RealtimeVoiceOptions) {
  const t = useTranslations('Chat')
  const scopeRef = useRef(new VoiceSessionScope())
  const startingRef = useRef(false)
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

  const [realtimeVolumeAmplitude, setRealtimeVolumeAmplitude] = useState(0)

  const [realtimeMuted, setRealtimeMuted] = useState(false)

  const realtimeMutedRef = useRef(false)

  realtimeMutedRef.current = realtimeMuted

  const realtimeSocketRef = useRef<WebSocket | null>(null)

  const realtimeStreamRef = useRef<MediaStream | null>(null)

  const realtimeAudioContextRef = useRef<AudioContext | null>(null)

  const realtimeSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const realtimeProcessorRef = useRef<ScriptProcessorNode | null>(null)

  const realtimeUserIdRef = useRef<string | null>(null)

  const realtimeAssistantIdRef = useRef<string | null>(null)

  const realtimePlaybackTimeRef = useRef(0)

  const realtimeAvailable = Boolean(realtimeConfig?.configured)

  const isRealtimeMicActive =
    realtimeMicState === 'connecting' ||
    realtimeMicState === 'reconnecting' ||
    realtimeMicState === 'listening' ||
    realtimeMicState === 'speaking'

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
    setActiveAssistantId(assistantId)
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
  }, [
    t,
    pendingReplyModelLabelRef,
    setActiveAssistantId,
    setMessages,
    setShowScrollToBottom,
    shouldAutoScrollRef,
  ])

  const updateUserTranscript = useCallback(
    (userId: string, text: string) => {
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
    },
    [setMessages]
  )

  const resetRealtimeTurnMessages = useCallback(() => {
    const userId = realtimeUserIdRef.current
    const assistantId = realtimeAssistantIdRef.current

    if (userId || assistantId) {
      setMessages(prev =>
        prev.filter(message => {
          if (message.id === userId && !message.content?.trim()) {
            return false
          }
          if (message.id === assistantId && !message.content?.trim()) {
            return false
          }
          return true
        })
      )
    }

    realtimeUserIdRef.current = null
    realtimeAssistantIdRef.current = null
  }, [setMessages])

  const streamRealtimeTextMessage = useCallback(
    async (input: string, assistantId: string) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setStatus('submitted')
      setActiveAssistantId(assistantId)

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

        if (
          controller.signal.aborted ||
          abortControllerRef.current !== controller
        )
          return
        setStatus('streaming')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (
            controller.signal.aborted ||
            abortControllerRef.current !== controller
          )
            return
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split(/\n\n/)
          buffer = frames.pop() ?? ''

          frames.forEach(frame => {
            frame.split(/\n/).forEach(line => {
              if (!line.startsWith('data:')) return
              const chunk = parseUiMessageStreamChunk(line.slice(5))
              if (chunk) {
                applyAgentStreamChunk(assistantId, chunk)
              }
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
        if (abortControllerRef.current !== controller) return
        if (error instanceof Error && error.name === 'AbortError') return
        const message = error instanceof Error ? error.message : String(error)
        updateAssistantParts(assistantId, parts => {
          parts.push(createTextPart(t('voiceError', { error: message })))
        })
      } finally {
        if (abortControllerRef.current !== controller) return
        abortControllerRef.current = null
        setActiveAssistantId(null)
        // plan 模式且计划正在等待审批时，保持 submitted（loading）状态，
        // 不让复制/重试按钮过早出现；clarify 同理（等待用户选择）
        if (pendingClarifyRef.current) {
          setStatus('submitted')
        } else {
          setStatus('ready')
        }
      }
    },
    [
      applyAgentStreamChunk,
      t,
      updateAssistantParts,
      abortControllerRef,
      pendingClarifyRef,
      setActiveAssistantId,
      setStatus,
    ]
  )

  const stopRealtimeAudioResources = useCallback(() => {
    realtimeProcessorRef.current?.disconnect()
    realtimeSourceRef.current?.disconnect()
    realtimeStreamRef.current?.getTracks().forEach(track => track.stop())
    realtimeProcessorRef.current = null
    realtimeSourceRef.current = null
    realtimeStreamRef.current = null
    const audioContext = realtimeAudioContextRef.current
    realtimeAudioContextRef.current = null
    void audioContext?.close().catch(() => undefined)
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

      // 计算输出音频数据帧的音量振幅 (RMS)
      let sum = 0
      for (let i = 0; i < floatData.length; i++) {
        sum += floatData[i] * floatData[i]
      }
      const rms = Math.sqrt(sum / floatData.length)
      const normalizedAmp = Math.min(Math.max(rms * 3.5, 0), 1)
      setRealtimeVolumeAmplitude(normalizedAmp)

      // 注册播放结束回调
      source.onended = () => {
        const currentCtx = realtimeAudioContextRef.current
        if (
          currentCtx &&
          currentCtx.currentTime >= realtimePlaybackTimeRef.current - 0.05
        ) {
          setRealtimeVolumeAmplitude(0)
        }
      }

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
    scopeRef.current.close()
    startingRef.current = false
    if (realtimeSocketRef.current) {
      realtimeSocketRef.current.onclose = null
      realtimeSocketRef.current.onerror = null
      try {
        realtimeSocketRef.current.send(JSON.stringify({ type: 'client.stop' }))
        realtimeSocketRef.current.close(1000, 'client stopped')
      } catch {}
      realtimeSocketRef.current = null
    }
    stopRealtimeAudioResources()
    resetRealtimeTurnMessages()
    setRealtimeStartedAt(null)
    setRealtimeErrorText(null)
    setRealtimeMicState('idle')
    setStatus('ready')
    setActiveAssistantId(null)
    setRealtimeVolumeAmplitude(0)
    setRealtimeMuted(false)
  }, [
    resetRealtimeTurnMessages,
    stopRealtimeAudioResources,
    setActiveAssistantId,
    setStatus,
  ])

  const startRealtimeMic = useCallback(async () => {
    if (isLoading || startingRef.current || realtimeMicState !== 'idle') return
    if (!realtimeAvailable) {
      setRealtimeMicState('error')
      return
    }

    const scope = scopeRef.current
    const generation = scope.begin()
    startingRef.current = true
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
      scope.retain(generation, () =>
        stream.getTracks().forEach(track => track.stop())
      )
      if (!scope.isCurrent(generation)) return
      const AudioContextClass = window.AudioContext
      const audioContext = new AudioContextClass()
      scope.retain(generation, () => {
        void audioContext.close().catch(() => undefined)
      })
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      realtimeStreamRef.current = stream
      realtimeAudioContextRef.current = audioContext
      realtimeSourceRef.current = source
      realtimeProcessorRef.current = processor
      realtimePlaybackTimeRef.current = 0

      let reconnectCount = 0
      let isReconnecting = false

      const connectSocket = () => {
        const socket = new WebSocket(getRealtimeWebSocketUrl())
        socket.binaryType = 'arraybuffer'
        realtimeSocketRef.current = socket
        scope.retain(generation, () => {
          socket.onclose = null
          socket.onerror = null
          socket.onmessage = null
          socket.onopen = null
          socket.close(1000, 'session ended')
        })

        socket.onopen = () => {
          if (realtimeSocketRef.current !== socket) return
          reconnectCount = 0
          isReconnecting = false
          socket.send(
            JSON.stringify({
              type: 'client.start',
              agentId: selectedAgent?.id,
              threadId: currentThreadIdRef.current,
            })
          )
          setRealtimeStartedAt(Date.now())
          setRealtimeMicState('listening')
          setStatus('streaming')
        }

        socket.onmessage = event => {
          if (realtimeSocketRef.current !== socket) return
          if (typeof event.data !== 'string') return
          const chunk = parseUiMessageStreamChunk(event.data)
          if (!chunk) return

          if (chunk.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }))
            return
          }

          if (chunk.type === 'reconnecting') {
            setRealtimeMicState('reconnecting')
            return
          }

          if (chunk.type === 'reconnected') {
            setRealtimeMicState('listening')
            return
          }

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
            if (
              typeof chunk.transcript === 'string' &&
              chunk.transcript.trim()
            ) {
              const { userId } = ensureRealtimeTurnMessages()
              updateUserTranscript(userId, chunk.transcript)
            }
            return
          }

          if (chunk.type === 'response.created') return

          if (chunk.type === 'response.completed') {
            resetRealtimeTurnMessages()
            setActiveAssistantId(null)
            if (realtimeSocketRef.current === socket) {
              setRealtimeMicState('listening')
              setStatus('streaming')
            }
            return
          }

          if (chunk.type === 'response.failed') {
            setRealtimeErrorText(
              typeof chunk.errorText === 'string'
                ? chunk.errorText
                : typeof chunk.error === 'string'
                  ? chunk.error
                  : chunk.error && typeof chunk.error === 'object'
                    ? JSON.stringify(chunk.error)
                    : 'Service failed'
            )
            return
          }
          const { assistantId } = ensureRealtimeTurnMessages()
          applyAgentStreamChunk(assistantId, chunk)
        }

        socket.onerror = () => {
          if (realtimeSocketRef.current !== socket) return
          if (!isReconnecting) {
            setRealtimeMicState('error')
            setRealtimeErrorText(t('voice.socketError'))
          }
        }

        socket.onclose = () => {
          if (
            !realtimeSocketRef.current ||
            realtimeSocketRef.current !== socket
          ) {
            return
          }

          if (reconnectCount < 5) {
            isReconnecting = true
            reconnectCount++
            setRealtimeMicState('reconnecting')
            const delay = Math.pow(2, reconnectCount - 1) * 1000
            const timer = setTimeout(() => {
              if (
                scope.isCurrent(generation) &&
                realtimeSocketRef.current === socket
              ) {
                connectSocket()
              }
            }, delay)
            scope.retain(generation, () => clearTimeout(timer))
          } else {
            realtimeSocketRef.current = null
            stopRealtimeAudioResources()
            setStatus('ready')
            setActiveAssistantId(null)
            setRealtimeStartedAt(null)
            setRealtimeMicState('error')
          }
        }
      }

      connectSocket()

      processor.onaudioprocess = event => {
        const currentSocket = realtimeSocketRef.current
        if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)
          return
        const inputBuffer = event.inputBuffer.getChannelData(0)

        // 实时采样录音端分贝振幅 (RMS)，用于呼吸球能量动态
        let sum = 0
        for (let i = 0; i < inputBuffer.length; i++) {
          sum += inputBuffer[i] * inputBuffer[i]
        }
        const rms = Math.sqrt(sum / inputBuffer.length)
        const normalizedAmp = realtimeMutedRef.current
          ? 0
          : Math.min(Math.max(rms * 4.5, 0), 1)
        setRealtimeVolumeAmplitude(normalizedAmp)

        // 如果静音，则拦截发送
        if (realtimeMutedRef.current) {
          return
        }

        const pcm = downsampleToPcm16(inputBuffer, audioContext.sampleRate)
        currentSocket.send(pcm)
      }
      source.connect(processor)
      processor.connect(audioContext.destination)
    } catch (error) {
      if (!scope.isCurrent(generation)) return
      scope.close()
      console.error('Failed to start realtime mic', error)
      stopRealtimeAudioResources()
      setRealtimeMicState('error')
      setRealtimeStartedAt(null)
      setRealtimeErrorText(t('voice.microphoneError'))
      setStatus('ready')
      setActiveAssistantId(null)
    } finally {
      if (scope.isCurrent(generation)) startingRef.current = false
    }
  }, [
    currentThreadIdRef,
    pendingReplyModelLabelRef,
    setActiveAssistantId,
    setShowScrollToBottom,
    setStatus,
    shouldAutoScrollRef,
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
    const scope = scopeRef.current
    return () => {
      scope.close()
      startingRef.current = false
      realtimeSocketRef.current = null
      stopRealtimeAudioResources()
      void realtimeAudioContextRef.current?.close()
    }
  }, [stopRealtimeAudioResources])

  useEffect(() => {
    if (realtimeEnabled) {
      void startRealtimeMic()
    } else if (realtimeMicState !== 'idle') {
      stopRealtimeMic()
    }
  }, [realtimeEnabled, startRealtimeMic, stopRealtimeMic, realtimeMicState])
  return {
    realtimeEnabled,
    setRealtimeEnabled,
    realtimeConfig,
    realtimeConfigLoading,
    realtimeMicState,
    realtimeElapsedSeconds,
    realtimeErrorText,
    realtimeVolumeAmplitude,
    realtimeMuted,
    setRealtimeMuted,
    realtimeAvailable,
    isRealtimeMicActive,
    streamRealtimeTextMessage,
  }
}
