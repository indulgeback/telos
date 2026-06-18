import { randomUUID } from 'node:crypto'
import WebSocket, { type RawData } from 'ws'
import { config, createModuleLogger } from '../../config/index.js'
import { safeJsonStringify } from '../../utils/json.js'
import { agentRuntimeService } from '../runtime.js'
import { agentSessionService } from '../session.js'
import { prisma } from '../db.js'
import {
  decodeVolcFrame,
  encodeVolcAudioEvent,
  encodeVolcJsonEvent,
  VOLC_EVENTS,
  VOLC_MESSAGE_TYPES,
} from './volc-protocol.js'

const logger = createModuleLogger('volc-realtime')

const DEFAULT_TURN_TIMEOUT_MS = 45000

export type RealtimeWriteEvent = (
  type: string,
  payload?: Record<string, unknown>
) => void

export interface VolcRealtimeTextTurnOptions {
  input: string
  instructions?: string
  sessionId?: string
  connectId?: string
  signal?: AbortSignal
  socketFactory?: (connectId: string) => WebSocketLike
}

export interface WebSocketLike {
  readyState: number
  close: (code?: number, reason?: string) => void
  send: (data: Buffer) => void
  addEventListener?: (
    type: string,
    listener: (event: { data?: unknown; reason?: string; error?: unknown }) => void
  ) => void
  removeEventListener?: (
    type: string,
    listener: (event: { data?: unknown; reason?: string; error?: unknown }) => void
  ) => void
  onopen?: () => void
  onmessage?: (event: { data?: unknown }) => void
  onerror?: (event: { error?: unknown }) => void
  onclose?: (event: { reason?: string }) => void
}

export function isVolcRealtimeConfigured() {
  return Boolean(config.volcRealtimeAppId && config.volcRealtimeAccessKey)
}

export function getVolcRealtimeDiagnostics() {
  const missingEnv: string[] = []
  if (!config.volcRealtimeAppId) missingEnv.push('VOLC_REALTIME_APP_ID')
  if (!config.volcRealtimeAccessKey) {
    missingEnv.push('VOLC_REALTIME_ACCESS_KEY')
  }

  return {
    configured: isVolcRealtimeConfigured() || config.volcRealtimeDemo,
    readyForRealConnection: isVolcRealtimeConfigured(),
    demo: config.volcRealtimeDemo,
    mode: config.volcRealtimeDemo ? 'demo' : 'real',
    missingEnv,
    endpoint: config.volcRealtimeEndpoint,
    model: config.volcRealtimeModel,
    resourceId: config.volcRealtimeResourceId,
    defaultInputMode: 'text',
    defaultAudioFormat: 'input_pcm_s16le_16000_mono_output_pcm_f32le_24000_mono',
  }
}

export function getVolcRealtimePublicConfig() {
  return getVolcRealtimeDiagnostics()
}

function createWebSocket(connectId: string) {
  return new WebSocket(config.volcRealtimeEndpoint, {
    headers: {
      'X-Api-App-ID': config.volcRealtimeAppId,
      'X-Api-Access-Key': config.volcRealtimeAccessKey,
      'X-Api-Resource-Id': config.volcRealtimeResourceId,
      'X-Api-App-Key': config.volcRealtimeAppKey,
      'X-Api-Connect-Id': connectId,
    },
  }) as unknown as WebSocketLike
}

function onceOpen(socket: WebSocketLike, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      socket.removeEventListener?.('open', openHandler)
      socket.removeEventListener?.('error', errorHandler)
      signal?.removeEventListener('abort', abortHandler)
    }
    const openHandler = () => {
      cleanup()
      resolve()
    }
    const errorHandler = (event: { error?: unknown }) => {
      cleanup()
      reject(event.error ?? new Error('Volc realtime WebSocket open failed'))
    }
    const abortHandler = () => {
      cleanup()
      reject(new Error('Volc realtime request aborted'))
    }

    socket.addEventListener?.('open', openHandler)
    socket.addEventListener?.('error', errorHandler)
    signal?.addEventListener('abort', abortHandler, { once: true })
    socket.onopen = openHandler
    socket.onerror = errorHandler
  })
}

async function normalizeSocketData(data: unknown) {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof ArrayBuffer) return Buffer.from(data)
  if (data instanceof Uint8Array) return Buffer.from(data)
  if (
    data &&
    typeof data === 'object' &&
    'arrayBuffer' in data &&
    typeof (data as { arrayBuffer?: unknown }).arrayBuffer === 'function'
  ) {
    const arrayBuffer = await (
      data as { arrayBuffer: () => Promise<ArrayBuffer> }
    ).arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
  if (typeof data === 'string') return Buffer.from(data)
  return Buffer.alloc(0)
}

function extractTextFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''
  const raw = payload as Record<string, unknown>
  const values: string[] = []

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const item = value as Record<string, unknown>
    for (const key of [
      'text',
      'content',
      'answer',
      'delta',
      'sentence',
      'transcript',
    ]) {
      const candidate = item[key]
      if (typeof candidate === 'string' && candidate.trim()) {
        values.push(candidate)
      }
    }
    Object.values(item).forEach(visit)
  }

  visit(raw)
  return values.join('')
}

function extractAsrTranscriptFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''
  const raw = payload as Record<string, unknown>
  const results = raw.results

  if (Array.isArray(results)) {
    for (let index = results.length - 1; index >= 0; index -= 1) {
      const result = results[index]
      if (!result || typeof result !== 'object') continue
      const text = (result as Record<string, unknown>).text
      if (typeof text === 'string' && text.trim()) return text
    }
  }

  const text = raw.text
  if (typeof text === 'string' && text.trim()) return text

  const originText =
    raw.extra && typeof raw.extra === 'object'
      ? (raw.extra as Record<string, unknown>).origin_text
      : undefined
  return typeof originText === 'string' ? originText : ''
}

function createStartSessionPayload(instructions?: string) {
  return {
    dialog: {
      extra: {
        model: config.volcRealtimeModel,
        input_mod: 'text',
      },
      bot_name: 'Telos',
      system_role:
        instructions ||
        '你是 Telos 的实时语音 Agent。回答要自然、简洁，适合语音播报。',
      speaking_style: '自然、清晰、可靠',
    },
    tts: {
      audio_config: {
        format: 'pcm',
        sample_rate: 24000,
        channel: 1,
      },
      speaker: (() => {
        const raw = config.volcRealtimeSpeaker || 'zh_female_vv_jupiter_bigtts'
        const allowed = [
          'zh_female_vv_jupiter_bigtts',
          'zh_female_xiaohe_jupiter_bigtts',
          'zh_male_yunzhou_jupiter_bigtts',
          'zh_male_xiaotian_jupiter_bigtts',
          'en_male_tim_uranus_bigtts',
          'en_female_dacey_uranus_bigtts',
          'en_female_stokie_uranus_bigtts'
        ]
        if (allowed.includes(raw)) return raw
        const normalized = raw.toLowerCase()
        if (normalized.includes('xiaohe') || normalized.includes('taiwan')) {
          return 'zh_female_xiaohe_jupiter_bigtts'
        }
        if (normalized.includes('xiaotian') || normalized.includes('tian')) {
          return 'zh_male_xiaotian_jupiter_bigtts'
        }
        if (
          normalized.includes('yunzhou') ||
          normalized.includes('zhou') ||
          normalized.includes('chef') ||
          normalized.includes('當家') ||
          normalized.includes('当家')
        ) {
          return 'zh_male_yunzhou_jupiter_bigtts'
        }
        if (normalized.includes('tim')) {
          return 'en_male_tim_uranus_bigtts'
        }
        if (normalized.includes('dacey')) {
          return 'en_female_dacey_uranus_bigtts'
        }
        if (normalized.includes('stokie')) {
          return 'en_female_stokie_uranus_bigtts'
        }
        if (
          normalized.includes('male') ||
          normalized.includes('boy') ||
          normalized.includes('man')
        ) {
          return 'zh_male_yunzhou_jupiter_bigtts'
        }
        return 'zh_female_vv_jupiter_bigtts'
      })(),
    },
  }
}

interface VolcRealtimeSessionParams {
  instructions?: string
  voiceConfig?: {
    enabled?: boolean
    speakingStyle?: string
    characterDetails?: string
    webSearchEnabled?: boolean
    singingEnabled?: boolean
    speaker?: string
  }
}

function createAudioStartSessionPayload(params: VolcRealtimeSessionParams) {
  const voice = params.voiceConfig || {}
  const isVoiceEnabled = voice.enabled !== false

  // 1. System Prompt Synthesis
  let systemRole = params.instructions || '你是 Telos 的实时语音 Agent。回答要自然、简洁，适合语音播报。'
  if (isVoiceEnabled && voice.characterDetails) {
    systemRole = `${systemRole}\n\n[语音人设与语气指导]\n${voice.characterDetails}`
  }
  if (isVoiceEnabled && voice.singingEnabled) {
    systemRole = `${systemRole}\n\n[核心能力：唱歌与音乐互动]\n你具备优秀的唱歌能力。如果用户要求你唱歌、哼歌或进行音乐相关的互动，请直接大方地唱出歌词和旋律，用生动的节奏和丰富的情感表达，绝对不要口头推托。`
  }

  // 2. Speaking style
  const speakingStyle = isVoiceEnabled && voice.speakingStyle
    ? voice.speakingStyle
    : '自然、清晰、可靠'

  // 3. Speaker selection
  const rawSpeaker = isVoiceEnabled && voice.speaker
    ? voice.speaker
    : (config.volcRealtimeSpeaker || 'zh_female_vv_jupiter_bigtts')

  // 火山引擎 1.2.1.1 (O2.0) 端到端实时语音对话模型音色白名单过滤与映射：
  // 1. zh_female_vv_jupiter_bigtts (Vivi)
  // 2. zh_female_xiaohe_jupiter_bigtts (小何)
  // 3. zh_male_yunzhou_jupiter_bigtts (云舟)
  // 4. zh_male_xiaotian_jupiter_bigtts (小天)
  // 5. en_male_tim_uranus_bigtts (Tim)
  // 6. en_female_dacey_uranus_bigtts (Dacey)
  // 7. en_female_stokie_uranus_bigtts (Stokie)
  let speaker = 'zh_female_vv_jupiter_bigtts' // 默认兜底音色
  const normalizedRaw = rawSpeaker.toLowerCase()

  const allowedSpeakers = [
    'zh_female_vv_jupiter_bigtts',
    'zh_female_xiaohe_jupiter_bigtts',
    'zh_male_yunzhou_jupiter_bigtts',
    'zh_male_xiaotian_jupiter_bigtts',
    'en_male_tim_uranus_bigtts',
    'en_female_dacey_uranus_bigtts',
    'en_female_stokie_uranus_bigtts'
  ]

  if (allowedSpeakers.includes(rawSpeaker)) {
    speaker = rawSpeaker
  } else if (normalizedRaw.includes('xiaohe') || normalizedRaw.includes('taiwan')) {
    speaker = 'zh_female_xiaohe_jupiter_bigtts'
  } else if (normalizedRaw.includes('xiaotian') || normalizedRaw.includes('tian')) {
    speaker = 'zh_male_xiaotian_jupiter_bigtts'
  } else if (
    normalizedRaw.includes('yunzhou') ||
    normalizedRaw.includes('zhou') ||
    normalizedRaw.includes('chef') ||
    normalizedRaw.includes('當家') ||
    normalizedRaw.includes('当家')
  ) {
    speaker = 'zh_male_yunzhou_jupiter_bigtts'
  } else if (normalizedRaw.includes('tim')) {
    speaker = 'en_male_tim_uranus_bigtts'
  } else if (normalizedRaw.includes('dacey')) {
    speaker = 'en_female_dacey_uranus_bigtts'
  } else if (normalizedRaw.includes('stokie')) {
    speaker = 'en_female_stokie_uranus_bigtts'
  } else if (
    normalizedRaw.includes('male') ||
    normalizedRaw.includes('boy') ||
    normalizedRaw.includes('man')
  ) {
    speaker = 'zh_male_yunzhou_jupiter_bigtts'
  } else {
    speaker = 'zh_female_vv_jupiter_bigtts'
  }

  // 4. Web search tool calling injection
  const tools = isVoiceEnabled && voice.webSearchEnabled
    ? [{ type: 'web_search' }]
    : undefined

  return {
    dialog: {
      extra: {
        model: config.volcRealtimeModel,
        end_smooth_window_ms: 1500,
        input_mod: 'audio',
      },
      bot_name: 'Telos',
      system_role: systemRole,
      speaking_style: speakingStyle,
      tools,
    },
    asr: {
      extra: {
        end_smooth_window_ms: 1500,
      },
      audio_config: {
        format: 'pcm_s16le',
        sample_rate: 16000,
        channel: 1,
      },
    },
    tts: {
      audio_config: {
        format: 'pcm',
        sample_rate: 24000,
        channel: 1,
      },
      speaker,
    },
  }
}

function createTextQueryPayload(input: string) {
  return {
    content: input,
    text: input,
  }
}

function isVolcTerminalEvent(event: number | undefined) {
  return [
    VOLC_EVENTS.CONNECTION_FAILED,
    VOLC_EVENTS.CONNECTION_FINISHED,
    VOLC_EVENTS.SESSION_CANCELED,
    VOLC_EVENTS.SESSION_FINISHED,
    VOLC_EVENTS.SESSION_FAILED,
    VOLC_EVENTS.TTS_ENDED,
    VOLC_EVENTS.ASR_ENDED,
    VOLC_EVENTS.CHAT_ENDED,
  ].includes(event as any)
}

function isVolcAudioTerminalEvent(event: number | undefined) {
  return [
    VOLC_EVENTS.CONNECTION_FAILED,
    VOLC_EVENTS.CONNECTION_FINISHED,
    VOLC_EVENTS.SESSION_CANCELED,
    VOLC_EVENTS.SESSION_FINISHED,
    VOLC_EVENTS.SESSION_FAILED,
    VOLC_EVENTS.TTS_ENDED,
  ].includes(event as any)
}

function isVolcAssistantTextEvent(event: number | undefined) {
  return event === VOLC_EVENTS.CHAT_RESPONSE
}

function isVolcAsrTranscriptEvent(event: number | undefined) {
  return event === VOLC_EVENTS.ASR_RESPONSE
}

function isVolcFailureEvent(event: number | undefined) {
  return [
    VOLC_EVENTS.CONNECTION_FAILED,
    VOLC_EVENTS.SESSION_CANCELED,
    VOLC_EVENTS.SESSION_FAILED,
  ].includes(event as any)
}

async function runDemoTurn(
  options: VolcRealtimeTextTurnOptions,
  write: RealtimeWriteEvent
) {
  const sessionId = options.sessionId || randomUUID()
  write('realtime.session.created', {
    sessionId,
    provider: 'volcengine',
    demo: true,
  })
  write('response.output_text.start', { id: `text-${sessionId}` })

  const text = `实时语音 Demo 已收到：${options.input}`
  for (const chunk of text.match(/.{1,8}/g) ?? []) {
    if (options.signal?.aborted) throw new Error('Volc realtime request aborted')
    write('response.output_text.delta', {
      id: `text-${sessionId}`,
      delta: chunk,
    })
    await new Promise(resolve => setTimeout(resolve, 40))
  }

  write('response.output_text.done', { id: `text-${sessionId}` })
  write('response.completed', { sessionId, demo: true })
}

export async function runVolcRealtimeTextTurn(
  options: VolcRealtimeTextTurnOptions,
  write: RealtimeWriteEvent
) {
  if (config.volcRealtimeDemo) {
    await runDemoTurn(options, write)
    return
  }
  if (!isVolcRealtimeConfigured()) {
    throw new Error(
      'Volc realtime is not configured. Set VOLC_REALTIME_APP_ID and VOLC_REALTIME_ACCESS_KEY.'
    )
  }

  const connectId = options.connectId || randomUUID()
  const sessionId = options.sessionId || randomUUID()
  const socket = options.socketFactory?.(connectId) ?? createWebSocket(connectId)
  let sequence = 1
  let finished = false
  let textStarted = false
  let sessionStartSent = false
  let querySent = false

  const sendEvent = (event: number, payload: Record<string, unknown>) => {
    socket.send(encodeVolcJsonEvent(event, payload, sequence++, sessionId))
  }

  const sendSessionStart = () => {
    if (sessionStartSent) return
    sessionStartSent = true
    sendEvent(
      VOLC_EVENTS.START_SESSION,
      createStartSessionPayload(options.instructions)
    )
  }

  const sendTextQuery = () => {
    if (querySent) return
    querySent = true
    sendEvent(VOLC_EVENTS.SAY_HELLO, createTextQueryPayload(options.input))
  }

  const timeout = setTimeout(() => {
    if (finished) return
    socket.close(1000, 'turn timeout')
  }, DEFAULT_TURN_TIMEOUT_MS)

  const abortHandler = () => {
    socket.close(1000, 'client aborted')
  }
  options.signal?.addEventListener('abort', abortHandler, { once: true })

  try {
    await onceOpen(socket, options.signal)
    write('realtime.session.created', {
      sessionId,
      connectId,
      provider: 'volcengine',
      model: config.volcRealtimeModel,
    })

    sendEvent(VOLC_EVENTS.START_CONNECTION, {})
    sendSessionStart()

    await new Promise<void>((resolve, reject) => {
      socket.onmessage = async event => {
        try {
          const buffer = await normalizeSocketData(event.data)
          if (!buffer.length) return

          const frame = decodeVolcFrame(buffer)
          const payload = frame.json ?? frame.text
          write('realtime.event', {
            sessionId,
            event: frame.event,
            messageType: frame.messageType,
            payload,
          })

          if (isVolcFailureEvent(frame.event)) {
            reject(new Error(`Volc realtime event failed: ${frame.event}`))
            return
          }
          if (frame.event === VOLC_EVENTS.CONNECTION_STARTED) {
            return
          }
          if (frame.event === VOLC_EVENTS.SESSION_STARTED) {
            sendTextQuery()
            return
          }

          const text = isVolcAssistantTextEvent(frame.event)
            ? extractTextFromPayload(payload)
            : ''
          if (text) {
            if (!textStarted) {
              textStarted = true
              write('response.output_text.start', { id: `text-${sessionId}` })
            }
            write('response.output_text.delta', {
              id: `text-${sessionId}`,
              delta: text,
            })
          }

          if (isVolcTerminalEvent(frame.event)) {
            finished = true
            resolve()
          }
        } catch (error) {
          reject(error)
        }
      }
      socket.onerror = event => {
        reject(event.error ?? new Error('Volc realtime WebSocket error'))
      }
      socket.onclose = event => {
        if (finished) {
          resolve()
          return
        }
        reject(new Error(event.reason || 'Volc realtime WebSocket closed'))
      }
    })

    if (textStarted) {
      write('response.output_text.done', { id: `text-${sessionId}` })
    }
    write('response.completed', { sessionId })
  } catch (error) {
    logger.error({
      msg: 'Volc realtime text turn failed',
      err: error,
      sessionId,
      connectId,
    })
    throw error
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortHandler)
    try {
      sendEvent(VOLC_EVENTS.FINISH_SESSION, {})
      sendEvent(VOLC_EVENTS.FINISH_CONNECTION, {})
    } catch {
      // Socket may already be closed.
    }
    try {
      socket.close(1000, 'done')
    } catch {
      // noop
    }
  }
}

export function serializeRealtimeError(error: unknown) {
  return {
    message: error instanceof Error ? error.message : String(error),
    raw: safeJsonStringify(error),
  }
}

function safeSendClientJson(
  client: WebSocket,
  type: string,
  payload: Record<string, unknown> = {}
) {
  if (client.readyState !== WebSocket.OPEN) return
  client.send(safeJsonStringify({ ...payload, type }))
}

function normalizeClientAudioData(data: RawData) {
  if (Buffer.isBuffer(data)) return data
  if (Array.isArray(data)) return Buffer.concat(data)
  return Buffer.from(data)
}

function rawVolcPayloadForClient(framePayload: Buffer) {
  return framePayload.toString('base64')
}

function extractVolcErrorMessage(frame: { text?: string; payload: Buffer }) {
  const rawText = frame.text || frame.payload.toString('utf8')
  const jsonStart = rawText.indexOf('{')
  if (jsonStart >= 0) {
    try {
      const json = JSON.parse(rawText.slice(jsonStart)) as {
        error?: unknown
        message?: unknown
      }
      if (typeof json.error === 'string') return json.error
      if (typeof json.message === 'string') return json.message
    } catch {
      // Fall through to the raw text.
    }
  }
  return rawText.replace(/[^\x20-\x7E\u4e00-\u9fa5，。！？、：；（）]/g, '')
}

async function handleDemoAudioSocket(client: WebSocket, userId: string) {
  const sessionId = randomUUID()
  safeSendClientJson(client, 'realtime.session.created', {
    sessionId,
    provider: 'volcengine',
    userId,
    demo: true,
  })
  safeSendClientJson(client, 'response.output_text.start', {
    id: `text-${sessionId}`,
  })
  client.on('message', (data, isBinary) => {
    if (isBinary) return
    try {
      const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
      const payload = JSON.parse(text) as { type?: string; input?: string }
      if (payload.type === 'client.text' && payload.input) {
        for (const chunk of `实时语音 Demo 已收到：${payload.input}`.match(
          /.{1,8}/g
        ) ?? []) {
          safeSendClientJson(client, 'response.output_text.delta', {
            id: `text-${sessionId}`,
            delta: chunk,
          })
        }
      }
      if (payload.type === 'client.stop') {
        safeSendClientJson(client, 'response.output_text.done', {
          id: `text-${sessionId}`,
        })
        safeSendClientJson(client, 'response.completed', {
          sessionId,
          demo: true,
        })
      }
    } catch {
      // Ignore malformed demo control packets.
    }
  })
}

export async function handleVolcRealtimeAudioSocket(options: {
  client: WebSocket
  userId: string
}) {
  const { client, userId } = options
  if (config.volcRealtimeDemo) {
    await handleDemoAudioSocket(client, userId)
    return
  }
  if (!isVolcRealtimeConfigured()) {
    safeSendClientJson(client, 'response.failed', {
      error: {
        message:
          'Volc realtime is not configured. Set VOLC_REALTIME_APP_ID and VOLC_REALTIME_ACCESS_KEY.',
      },
    })
    client.close(1011, 'volc realtime not configured')
    return
  }

  const connectId = randomUUID()
  const sessionId = randomUUID()
  let upstream = createWebSocket(connectId) as unknown as WebSocket
  let sequence = 1
  let sessionStartSent = false
  let sessionReady = false
  let startRequested = false
  let stopRequested = false
  let pendingInstructions: string | undefined
  let agentInstructions: string | undefined
  let voiceConfig: any = null
  const pendingAudio: Buffer[] = []
  let turnIndex = 0
  let currentTurnId: string | undefined
  let currentTextId: string | undefined
  let lastTranscript = ''
  let textStarted = false
  let currentAgentId: string | null = null
  let currentThreadId: string | null = null
  let currentUserTranscript = ''
  let currentAssistantText = ''
  const persistedTurnIds = new Set<string>()

  const persistRealtimeTurn = (turnId?: string) => {
    const safeTurnId = turnId || currentTurnId
    const threadId = currentThreadId
    const agentId = currentAgentId
    const userTranscript = currentUserTranscript.trim()
    const assistantText = currentAssistantText.trim()

    if (
      !safeTurnId ||
      !threadId ||
      persistedTurnIds.has(safeTurnId) ||
      (!userTranscript && !assistantText)
    ) {
      return
    }

    persistedTurnIds.add(safeTurnId)
    void (async () => {
      try {
        if (userTranscript) {
          await agentSessionService.appendMessage({
            threadId,
            role: 'user',
            content: userTranscript,
            parts: [
              { type: 'text', text: userTranscript },
              { type: 'live-transcript' },
            ],
            metadata: {
              source: 'realtime_audio',
              provider: 'volcengine',
              model: config.volcRealtimeModel,
              turnId: safeTurnId,
            },
          })
        }

        if (assistantText) {
          await agentSessionService.appendMessage({
            threadId,
            role: 'assistant',
            content: assistantText,
            parts: [{ type: 'text', text: assistantText }],
            metadata: {
              source: 'realtime_audio',
              provider: 'volcengine',
              model: config.volcRealtimeModel,
              turnId: safeTurnId,
            },
          })
        }

        if (agentId) {
          agentSessionService.scheduleSummaries(threadId, agentId, userId)
        }
      } catch (error) {
        logger.error({
          msg: 'Failed to persist realtime turn',
          err: error,
          threadId,
          turnId: safeTurnId,
        })
      }
    })()
  }

  const ensurePersistentThread = async (options: {
    agentId?: string
    threadId?: string | null
  }) => {
    const agentId =
      options.agentId?.trim() || (await agentRuntimeService.getDefaultAgentId())
    if (!agentId) {
      throw new Error('Default agent not found')
    }

    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { instructions: true, metadata: true },
      })
      if (agent) {
        agentInstructions = agent.instructions
        const metadata = agent.metadata as Record<string, any>
        if (metadata && metadata.voice) {
          voiceConfig = metadata.voice
        }
      }
    } catch (dbErr) {
      logger.warn({ msg: 'Failed to fetch agent voice config from db', agentId, err: dbErr })
    }

    const thread = await agentSessionService.ensureThread({
      agentId,
      threadId: options.threadId || undefined,
      ownerId: userId,
      firstInput: '语音对话',
      metadata: {
        source: 'realtime_audio',
        provider: 'volcengine',
        model: config.volcRealtimeModel,
      },
    })

    currentAgentId = agentId
    currentThreadId = thread.id
    safeSendClientJson(client, 'agent.run.created', {
      data: {
        agentId,
        threadId: thread.id,
        provider: 'volcengine',
        mode: 'realtime_audio',
      },
    })
  }

  const ensureTurn = () => {
    if (currentTurnId && currentTextId) {
      return { turnId: currentTurnId, textId: currentTextId }
    }
    turnIndex += 1
    currentTurnId = `turn-${sessionId}-${turnIndex}`
    currentTextId = `text-${sessionId}-${turnIndex}`
    lastTranscript = ''
    textStarted = false
    currentUserTranscript = ''
    currentAssistantText = ''
    safeSendClientJson(client, 'response.created', {
      sessionId,
      turnId: currentTurnId,
    })
    return { turnId: currentTurnId, textId: currentTextId }
  }

  const completeTurn = () => {
    if (!currentTurnId) return
    persistRealtimeTurn(currentTurnId)
    safeSendClientJson(client, 'response.completed', {
      sessionId,
      turnId: currentTurnId,
    })
    currentTurnId = undefined
    currentTextId = undefined
    lastTranscript = ''
    textStarted = false
    currentUserTranscript = ''
    currentAssistantText = ''
  }

  const sendUpstreamEvent = (
    event: number,
    payload: Record<string, unknown>
  ) => {
    if (upstream.readyState !== WebSocket.OPEN) return
    upstream.send(encodeVolcJsonEvent(event, payload, sequence++, sessionId))
  }

  const sendUpstreamAudio = (payload: Buffer) => {
    if (upstream.readyState !== WebSocket.OPEN || !sessionReady) {
      if (pendingAudio.length < 120) {
        pendingAudio.push(payload)
      }
      return
    }
    upstream.send(
      encodeVolcAudioEvent(
        VOLC_EVENTS.TASK_REQUEST,
        payload,
        sequence++,
        sessionId
      )
    )
  }

  const startUpstreamSession = () => {
    if (
      sessionStartSent ||
      upstream.readyState !== WebSocket.OPEN
    ) {
      return
    }
    sessionStartSent = true
    sendUpstreamEvent(
      VOLC_EVENTS.START_SESSION,
      createAudioStartSessionPayload({
        instructions: pendingInstructions || agentInstructions,
        voiceConfig,
      })
    )
  }

  const flushPendingAudio = () => {
    while (pendingAudio.length > 0) {
      const audio = pendingAudio.shift()
      if (audio) sendUpstreamAudio(audio)
    }
    if (stopRequested) {
      sendUpstreamEvent(VOLC_EVENTS.END_ASR, {})
    }
  }

  let closeBoth = (code = 1000, reason = 'done') => {
    persistRealtimeTurn(currentTurnId)
    try {
      if (upstream.readyState === WebSocket.OPEN) {
        sendUpstreamEvent(VOLC_EVENTS.FINISH_SESSION, {})
        sendUpstreamEvent(VOLC_EVENTS.FINISH_CONNECTION, {})
      }
      upstream.close(code, reason)
    } catch {
      // noop
    }
    try {
      if (client.readyState === WebSocket.OPEN) client.close(code, reason)
    } catch {
      // noop
    }
  }

  let lastPongTime = Date.now()
  const pingInterval = setInterval(() => {
    if (client.readyState === WebSocket.OPEN) {
      safeSendClientJson(client, 'ping', {})
      if (Date.now() - lastPongTime > 60000) {
        logger.warn({ msg: 'Client heartbeat timeout, closing connection', connectId })
        closeBoth(1002, 'Heartbeat timeout')
      }
    }
  }, 30000)

  const originalCloseBoth = closeBoth
  closeBoth = (code = 1000, reason = 'done') => {
    clearInterval(pingInterval)
    originalCloseBoth(code, reason)
  }

  let reconnectCount = 0
  let isReconnecting = false

  const tryReconnectUpstream = () => {
    if (isReconnecting || reconnectCount >= 3) {
      safeSendClientJson(client, 'session_ended', { reason: 'upstream_disconnected_permanently' })
      closeBoth(1011, 'upstream disconnected permanently')
      return
    }
    isReconnecting = true
    reconnectCount++
    safeSendClientJson(client, 'reconnecting', { attempt: reconnectCount })

    const delay = Math.pow(2, reconnectCount - 1) * 1000
    logger.info({ msg: `Attempting upstream reconnect in ${delay}ms`, attempt: reconnectCount })

    setTimeout(() => {
      try {
        const newUpstream = createWebSocket(connectId) as unknown as WebSocket
        try {
          upstream.removeAllListeners()
          upstream.close()
        } catch {}
        upstream = newUpstream
        bindUpstreamEvents()
      } catch (err) {
        isReconnecting = false
        tryReconnectUpstream()
      }
    }, delay)
  }

  const handleUpstreamMessage = (data: RawData) => {
    try {
      const frame = decodeVolcFrame(normalizeClientAudioData(data))
      const payload = frame.json ?? frame.text
      safeSendClientJson(client, 'realtime.event', {
        sessionId,
        event: frame.event,
        messageType: frame.messageType,
        payload,
      })

      if (isVolcFailureEvent(frame.event)) {
        safeSendClientJson(client, 'response.failed', {
          error: {
            message: `Volc realtime event failed: ${frame.event}`,
            event: frame.event,
          },
        })
        closeBoth(1011, 'upstream event failed')
        return
      }
      if (frame.event === VOLC_EVENTS.CONNECTION_STARTED) {
        if (startRequested) startUpstreamSession()
        return
      }
      if (frame.event === VOLC_EVENTS.SESSION_STARTED) {
        sessionReady = true
        flushPendingAudio()
        return
      }
      if (frame.event === VOLC_EVENTS.ASR_INFO) {
        ensureTurn()
        return
      }
      if (frame.messageType === VOLC_MESSAGE_TYPES.ERROR) {
        const errorText = extractVolcErrorMessage(frame)
        if (stopRequested && errorText.includes('DialogAudioIdleTimeoutError')) {
          const { textId } = ensureTurn()
          if (!textStarted) {
            textStarted = true
            safeSendClientJson(client, 'response.output_text.start', {
              id: textId,
            })
          }
          safeSendClientJson(client, 'response.output_text.delta', {
            id: textId,
            delta: '没有检测到有效语音，请再试一次。',
          })
          safeSendClientJson(client, 'response.output_text.done', {
            id: textId,
          })
          completeTurn()
          closeBoth()
          return
        }
        safeSendClientJson(client, 'response.failed', {
          error: {
            message: errorText || 'Volc realtime server error',
            messageType: frame.messageType,
          },
        })
        closeBoth(1011, 'upstream server error')
        return
      }

      if (isVolcAsrTranscriptEvent(frame.event)) {
        const transcript = extractAsrTranscriptFromPayload(payload)
        if (transcript && transcript !== lastTranscript) {
          const { turnId } = ensureTurn()
          lastTranscript = transcript
          currentUserTranscript = transcript
          safeSendClientJson(client, 'response.input_audio_transcription.delta', {
            sessionId,
            turnId,
            transcript,
          })
        }
      }

      if (frame.event === VOLC_EVENTS.ASR_ENDED && currentTurnId) {
        safeSendClientJson(client, 'response.input_audio_transcription.completed', {
          sessionId,
          turnId: currentTurnId,
          transcript: lastTranscript,
        })
      }

      const text = isVolcAssistantTextEvent(frame.event)
        ? extractTextFromPayload(payload)
        : ''
      if (text) {
        const { textId } = ensureTurn()
        currentAssistantText += text
        if (!textStarted) {
          textStarted = true
          safeSendClientJson(client, 'response.output_text.start', {
            id: textId,
          })
        }
        safeSendClientJson(client, 'response.output_text.delta', {
          id: textId,
          delta: text,
        })
      }

      const hasAudioPayload =
        (frame.messageType === VOLC_MESSAGE_TYPES.AUDIO_ONLY_RESPONSE ||
          frame.event === VOLC_EVENTS.TTS_RESPONSE) &&
        frame.payload.length > 0

      if (hasAudioPayload) {
        safeSendClientJson(client, 'response.audio.delta', {
          id: `audio-${sessionId}`,
          audio: rawVolcPayloadForClient(frame.payload),
          format: 'pcm_f32le',
          sampleRate: 24000,
        })
      }

      if (isVolcAudioTerminalEvent(frame.event)) {
        if (textStarted) {
          safeSendClientJson(client, 'response.output_text.done', {
            id: currentTextId ?? `text-${sessionId}-${turnIndex}`,
          })
        }
        completeTurn()
        if (stopRequested) {
          closeBoth()
        }
      }
    } catch (error) {
      safeSendClientJson(client, 'response.failed', {
        error: serializeRealtimeError(error),
      })
    }
  }

  const bindUpstreamEvents = () => {
    upstream.on('open', () => {
      if (reconnectCount > 0) {
        isReconnecting = false
        reconnectCount = 0
        sessionReady = false
        sessionStartSent = false
        safeSendClientJson(client, 'reconnected', {})
        sendUpstreamEvent(VOLC_EVENTS.START_CONNECTION, {})
        startUpstreamSession()
      } else {
        safeSendClientJson(client, 'realtime.session.created', {
          sessionId,
          connectId,
          provider: 'volcengine',
          model: config.volcRealtimeModel,
          userId,
        })
        sendUpstreamEvent(VOLC_EVENTS.START_CONNECTION, {})
        if (startRequested) startUpstreamSession()
      }
    })

    upstream.on('message', handleUpstreamMessage)

    upstream.on('error', error => {
      logger.error({ msg: 'Volc realtime upstream socket error', err: error })
      if (!isReconnecting) {
        tryReconnectUpstream()
      }
    })

    upstream.on('close', () => {
      if (!isReconnecting && !stopRequested && client.readyState === WebSocket.OPEN) {
        tryReconnectUpstream()
      }
    })
  }

  bindUpstreamEvents()

  client.on('message', (data, isBinary) => {
    if (!isBinary) {
      void (async () => {
        try {
          const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
          const payload = JSON.parse(text) as {
            type?: string
            instructions?: string
            agentId?: string
            threadId?: string | null
          }
          if (payload.type === 'pong') {
            lastPongTime = Date.now()
            return
          }
          if (payload.type === 'client.start' && !sessionReady) {
            pendingInstructions = payload.instructions
            await ensurePersistentThread({
              agentId: payload.agentId,
              threadId: payload.threadId,
            })
            startRequested = true
            startUpstreamSession()
          }
          if (payload.type === 'client.stop') {
            stopRequested = true
            persistRealtimeTurn(currentTurnId)
            closeBoth(1000, 'client stopped')
          }
        } catch (error) {
          safeSendClientJson(client, 'response.failed', {
            error: serializeRealtimeError(error),
          })
        }
      })()
      return
    }

    const audio = normalizeClientAudioData(data)
    if (audio.length > 0) {
      sendUpstreamAudio(audio)
    }
  })

  client.on('close', () => closeBoth(1000, 'client closed'))
  client.on('error', error => {
    logger.error({ msg: 'Realtime client socket error', err: error })
    closeBoth(1011, 'client error')
  })
}
