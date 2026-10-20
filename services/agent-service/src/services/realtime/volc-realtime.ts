import { randomUUID } from 'node:crypto'
import { RunContext, type FunctionTool, type Tool } from '@openai/agents'
import WebSocket, { type RawData } from 'ws'
import { config, createModuleLogger } from '../../config/index.js'
import { safeJsonStringify } from '../../utils/json.js'
import { agentRuntimeService } from '../runtime.js'
import { agentSessionService } from '../session.js'
import { prisma } from '../db.js'
import { buildBuiltinTool, isBuiltinToolAllowed } from '../builtin-tools.js'
import { AgentRunPersistence } from '../persistence.js'
import { buildEndpointTool, type LoadedTool } from '../runtime.js'
import { isToolUserAssignable } from '../tool-access.js'
import { toolRequiresApproval } from '../tool-approval-policy.js'

const logger = createModuleLogger('volc-realtime')

// 豆包端到端实时语音（全双工版 / Seeduplex 3.0）JSON 事件协议。
// 文档: docs.volcengine.com/docs/DoubaoVoice/endtoend-realtime-voice-full-duplex-version
// 鉴权只有 X-Api-Key 一个头；上下行为 JSON 文本帧（音频 Base64 内嵌）。

export interface VolcRealtimeVoiceConfig {
  enabled?: boolean
  speakingStyle?: string
  characterDetails?: string
  webSearchEnabled?: boolean
  singingEnabled?: boolean
  speaker?: string
}

export function isVolcRealtimeConfigured() {
  return Boolean(config.volcRealtimeApiKey)
}

export function getVolcRealtimeDiagnostics() {
  const missingEnv: string[] = []
  if (!config.volcRealtimeApiKey) missingEnv.push('VOLC_REALTIME_API_KEY')

  return {
    configured: isVolcRealtimeConfigured() || config.volcRealtimeDemo,
    readyForRealConnection: isVolcRealtimeConfigured(),
    demo: config.volcRealtimeDemo,
    mode: config.volcRealtimeDemo ? 'demo' : 'real',
    missingEnv,
    endpoint: config.volcRealtimeEndpoint,
    model: config.volcRealtimeModel,
    defaultInputMode: 'audio',
    defaultAudioFormat: 'input_pcm_s16le_16000_mono_output_pcm_f32le_24000_mono',
  }
}

export function getVolcRealtimePublicConfig() {
  return getVolcRealtimeDiagnostics()
}

/**
 * ws 对非 101 握手响应抛出的错误形如 "Unexpected server response: 403"。
 * 401/403/404 意味着 API Key 无效或资源未授权，重试只会原样失败。
 */
export function upstreamHandshakeStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null
  const match = /Unexpected server response: (\d{3})/.exec(error.message)
  return match ? Number(match[1]) : null
}

function createWebSocket() {
  return new WebSocket(config.volcRealtimeEndpoint, {
    headers: {
      'X-Api-Key': config.volcRealtimeApiKey,
    },
  })
}

// 火山端到端语音模型音色白名单与模糊映射（沿用旧版 O2.0 音色列表）
const ALLOWED_VOICES = [
  'zh_female_vv_jupiter_bigtts',
  'zh_female_xiaohe_jupiter_bigtts',
  'zh_male_yunzhou_jupiter_bigtts',
  'zh_male_xiaotian_jupiter_bigtts',
  'en_male_tim_uranus_bigtts',
  'en_female_dacey_uranus_bigtts',
  'en_female_stokie_uranus_bigtts',
]

function resolveVoice(rawSpeaker: string): string {
  if (ALLOWED_VOICES.includes(rawSpeaker)) return rawSpeaker
  const normalized = rawSpeaker.toLowerCase()
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
  if (normalized.includes('tim')) return 'en_male_tim_uranus_bigtts'
  if (normalized.includes('dacey')) return 'en_female_dacey_uranus_bigtts'
  if (normalized.includes('stokie')) return 'en_female_stokie_uranus_bigtts'
  if (
    normalized.includes('male') ||
    normalized.includes('boy') ||
    normalized.includes('man')
  ) {
    return 'zh_male_yunzhou_jupiter_bigtts'
  }
  return 'zh_female_vv_jupiter_bigtts'
}

// 与火山的 function 声明格式一致：标准 JSON schema 直传
export interface VoiceToolDeclaration {
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}

const VOICE_TOOL_LIMIT = 16
const VOICE_TOOL_CALL_LIMIT = 20
const VOICE_TOOL_TIMEOUT_MS = 60_000
const VOICE_TOOL_OUTPUT_MAX_CHARS = 8000

/**
 * 语音会话可用工具的白名单过滤：
 * 沙箱不可用的内置工具、非用户可分配工具、需审批工具（语音无法审批）一律排除，
 * MCP/子 agent 不在此列（v1 不接入语音）。数量上限 VOICE_TOOL_LIMIT。
 */
export function filterVoiceToolRaws(rows: LoadedTool[]): LoadedTool[] {
  return rows
    .filter(raw => Boolean(raw))
    .filter(
      raw =>
        isBuiltinToolAllowed(raw) &&
        isToolUserAssignable(raw) &&
        !toolRequiresApproval(raw)
    )
    .slice(0, VOICE_TOOL_LIMIT)
}

/** 兼容扁平与嵌套 item 两种下发包法，提取 FC 调用的三元组 */
export function parseVoiceFunctionCallEvent(event: Record<string, unknown>): {
  callId: string
  name: string
  argsRaw: string
} {
  const source = (event.item && typeof event.item === 'object'
    ? event.item
    : event) as Record<string, unknown>
  const callId =
    (typeof source.call_id === 'string' && source.call_id) ||
    (typeof source.callId === 'string' && source.callId) ||
    randomUUID()
  const name = typeof source.name === 'string' ? source.name : ''
  const argsRaw = typeof source.arguments === 'string' ? source.arguments : ''
  return { callId, name, argsRaw }
}


function buildVoiceSession(params: {
  instructions?: string
  voiceConfig?: VolcRealtimeVoiceConfig
  resumeSessionId?: string | null
  tools?: VoiceToolDeclaration[]
  webSearchEnabled?: boolean
}) {
  const voice = params.voiceConfig || {}
  const isVoiceEnabled = voice.enabled !== false

  let systemRole =
    params.instructions ||
    '你是 Telos 的实时语音 Agent。回答要自然、简洁，适合语音播报。'
  if (isVoiceEnabled && voice.characterDetails) {
    systemRole = `${systemRole}\n\n[语音人设与语气指导]\n${voice.characterDetails}`
  }
  if (isVoiceEnabled && voice.singingEnabled) {
    systemRole = `${systemRole}\n\n[核心能力：唱歌与音乐互动]\n你具备优秀的唱歌能力。如果用户要求你唱歌、哼歌或进行音乐相关的互动，请直接大方地唱出歌词和旋律，用生动的节奏和丰富的情感表达，绝对不要口头推托。`
  }

  const speaker = resolveVoice(
    (isVoiceEnabled && voice.speaker) ||
      config.volcRealtimeSpeaker ||
      'zh_female_vv_jupiter_bigtts'
  )

  const session: Record<string, unknown> = {
    model: config.volcRealtimeModel,
    instructions: systemRole,
    audio: {
      input: { format: { type: 'pcm', rate: 16000 } },
      output: {
        format: { type: 'pcm', rate: 24000 },
        voice: speaker,
      },
    },
  }
  if (params.tools && params.tools.length > 0) {
    session.tools = params.tools
  }
  if (params.webSearchEnabled) {
    session.extension = {
      dialog: { extra: { enable_volc_websearch: true } },
    }
  }
  // 官方约定 session.id 传原 dialog id 即可接续上下文（重连恢复用）
  if (params.resumeSessionId) {
    session.id = params.resumeSessionId
  }
  return { type: 'session.create', session }
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

function pickTranscript(value: Record<string, unknown>): string {
  for (const key of ['delta', 'transcript', 'text']) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return ''
}

function pickErrorMessage(value: Record<string, unknown>): string {
  const error = value.error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string') return message
  }
  if (typeof value.message === 'string') return value.message
  return safeJsonStringify(value)
}

// 全双工协议要求音频按实时节奏发送，建议 20ms（16k/s16 下 640 字节）一片。
// 客户端（浏览器 ScriptProcessor）发来的是 ~256ms 大块，这里切成 20ms 小片
// 依序立即发出，节奏仍与真实拾音同步。
const UPSTREAM_AUDIO_CHUNK_BYTES = 640

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
          'Volc realtime is not configured. Set VOLC_REALTIME_API_KEY.',
      },
    })
    client.close(1011, 'volc realtime not configured')
    return
  }

  const sessionId = randomUUID()
  let upstream = createWebSocket()
  let lastVolcDialogId: string | null = null
  let sessionReady = false
  let startRequested = false
  let stopRequested = false
  let pendingInstructions: string | undefined
  let agentInstructions: string | undefined
  let voiceConfig: VolcRealtimeVoiceConfig | null = null
  let initiallyMuted = false

  // ---- 语音工具调用（Function Calling）状态 ----
  // 语音会话无法走审批交互，需审批的工具在解析阶段整类排除；
  // MCP 与子 agent 涉及审批策略绑定，v1 同样不接入。
  interface VoiceToolBinding {
    raw: LoadedTool
    functionTool: FunctionTool<any, any, any>
  }
  interface VoiceToolRuntime {
    persistence: AgentRunPersistence
    bindings: Map<string, VoiceToolBinding>
    declarations: VoiceToolDeclaration[]
  }
  let voiceToolsetLoaded = false
  let voiceToolRaws: LoadedTool[] = []
  let voiceToolRuntime: VoiceToolRuntime | null = null
  let voiceToolChain: Promise<void> = Promise.resolve()
  let voiceToolCalls = 0
  const pendingAudio: Buffer[] = []
  let turnIndex = 0
  let currentTurnId: string | undefined
  let currentTextId: string | undefined
  let lastTranscript = ''
  let textStarted = false
  let currentAssistantText = ''
  let currentUserTranscript = ''
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

  let currentAgentId: string | null = null
  let currentThreadId: string | null = null

  const ensurePersistentThread = async (opts: {
    agentId?: string
    threadId?: string | null
  }) => {
    const agentId =
      opts.agentId?.trim() || (await agentRuntimeService.getDefaultAgentId())
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
      threadId: opts.threadId || undefined,
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

  // ---- 语音工具集：解析 → 构建 SDK 执行器 → FC 事件执行 ----

  const loadVoiceToolset = async (agentId: string) => {
    if (voiceToolsetLoaded) return
    voiceToolsetLoaded = true
    try {
      const rows = await prisma.agentTool.findMany({
        where: { agentId, enabled: true },
        include: { tool: true },
        orderBy: { sortOrder: 'asc' },
      })
      voiceToolRaws = filterVoiceToolRaws(
        rows.map(row => row.tool)
      )
      if (voiceToolRaws.length > 0) {
        logger.info({
          msg: 'Voice toolset resolved',
          agentId,
          tools: voiceToolRaws.map(raw => raw.name || raw.id),
        })
      }
    } catch (error) {
      logger.error({ msg: 'Failed to load voice toolset', err: error, agentId })
    }
  }

  let voiceToolRuntimeReady = false
  const ensureVoiceToolRuntime = async (): Promise<VoiceToolRuntime | null> => {
    if (voiceToolRuntimeReady) return voiceToolRuntime
    voiceToolRuntimeReady = true
    if (voiceToolRaws.length === 0 || !currentAgentId || !currentThreadId) {
      return null
    }
    try {
      // 一条轻量 run 承载整个语音会话的工具执行：工作区/图片按线程落盘、事件留痕
      const run = await prisma.agentRun.create({
        data: {
          agentId: currentAgentId,
          threadId: currentThreadId,
          status: 'completed',
          input: { source: 'realtime_voice_function_call' },
          finalOutput: '语音会话工具执行容器',
          metadata: {
            source: 'realtime_voice_fc',
            model: config.volcRealtimeModel,
          },
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })
      const persistence = new AgentRunPersistence(run.id)
      const bindings = new Map<string, VoiceToolBinding>()
      const declarations: VoiceToolDeclaration[] = []
      for (const raw of voiceToolRaws) {
        const built = buildEndpointTool(raw, persistence)
        if (!built || built.type !== 'function') continue
        const functionTool = built as FunctionTool<any, any, any>
        const declaration: VoiceToolDeclaration = {
          type: 'function',
          name: functionTool.name,
          description:
            raw.description || raw.displayName || raw.name || functionTool.name,
          parameters:
            (raw.parameters as Record<string, unknown> | null) ?? {},
        }
        bindings.set(declaration.name, { raw, functionTool })
        declarations.push(declaration)
      }
      if (declarations.length === 0) return null
      voiceToolRuntime = { persistence, bindings, declarations }
      return voiceToolRuntime
    } catch (error) {
      logger.error({ msg: 'Failed to prepare voice tool runtime', err: error })
      return null
    }
  }

  const sendVoiceToolOutputToVolc = (callId: string, text: string) => {
    sendUpstreamJson({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        role: 'tool',
        content: [{ type: 'input_text', text }],
      },
    })
  }

  const executeVoiceFunctionCall = async (event: Record<string, unknown>) => {
    voiceToolCalls += 1
    const { callId, name, argsRaw } = parseVoiceFunctionCallEvent(event)

    const fail = (message: string) => {
      safeSendClientJson(client, 'tool-output-available', {
        toolCallId: callId,
        toolName: name || 'tool',
        output: message,
      })
      sendVoiceToolOutputToVolc(callId, message)
    }

    if (voiceToolCalls > VOICE_TOOL_CALL_LIMIT) {
      fail(`本会话工具调用次数已达上限（${VOICE_TOOL_CALL_LIMIT} 次）。`)
      return
    }
    const runtime = voiceToolRuntime
    if (!runtime) {
      fail('当前语音会话没有可用的工具。')
      return
    }
    const binding = runtime.bindings.get(name)
    if (!binding) {
      fail(`未知的工具：${name || '(未提供名称)'}。`)
      return
    }
    let args: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(argsRaw || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('arguments must be a JSON object')
      }
      args = parsed as Record<string, unknown>
    } catch (error) {
      fail(
        `工具参数解析失败：${error instanceof Error ? error.message : String(error)}`
      )
      return
    }

    safeSendClientJson(client, 'tool-input-available', {
      toolCallId: callId,
      toolName: name,
      input: args,
    })
    await runtime.persistence
      .event('voice_tool_call_start', { callId, toolName: name, arguments: args })
      .catch(() => undefined)

    try {
      const invocation = binding.functionTool.invoke(
        new RunContext(),
        safeJsonStringify(args),
        {
          toolCall: {
            type: 'function_call',
            callId,
            name,
            arguments: safeJsonStringify(args),
          },
        }
      )
      const result = await new Promise<string | unknown>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(new Error(`工具执行超时（${VOICE_TOOL_TIMEOUT_MS / 1000}s）`)),
          VOICE_TOOL_TIMEOUT_MS
        )
        timer.unref?.()
        invocation.then(
          value => {
            clearTimeout(timer)
            resolve(value)
          },
          error => {
            clearTimeout(timer)
            reject(error)
          }
        )
      })
      const rawOutput =
        typeof result === 'string' ? result : safeJsonStringify(result ?? {})
      const outputText =
        rawOutput.length > VOICE_TOOL_OUTPUT_MAX_CHARS
          ? `${rawOutput.slice(0, VOICE_TOOL_OUTPUT_MAX_CHARS)}…[已截断]`
          : rawOutput || '（工具无输出）'
      await runtime.persistence
        .event('voice_tool_call_end', { callId, toolName: name, ok: true })
        .catch(() => undefined)
      safeSendClientJson(client, 'tool-output-available', {
        toolCallId: callId,
        toolName: name,
        output: outputText,
      })
      sendVoiceToolOutputToVolc(callId, outputText)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn({ msg: 'Voice tool call failed', toolName: name, err: error })
      await runtime.persistence
        .event('voice_tool_call_end', {
          callId,
          toolName: name,
          ok: false,
          error: message,
        })
        .catch(() => undefined)
      const text = `工具执行失败：${message}`
      safeSendClientJson(client, 'tool-output-available', {
        toolCallId: callId,
        toolName: name,
        output: text,
      })
      sendVoiceToolOutputToVolc(callId, text)
    }
  }

  // 工具调用逐个串行执行，避免并发写同一线程工作区
  const queueVoiceFunctionCall = (event: Record<string, unknown>) => {
    voiceToolChain = voiceToolChain
      .catch(() => undefined)
      .then(() => executeVoiceFunctionCall(event))
  }

  const sendUpstreamJson = (payload: Record<string, unknown>) => {
    if (upstream.readyState !== WebSocket.OPEN) return
    upstream.send(safeJsonStringify(payload))
  }

  const createVolcSession = (resume: boolean) => {
    sendUpstreamJson(
      buildVoiceSession({
        instructions: pendingInstructions || agentInstructions,
        voiceConfig: voiceConfig ?? undefined,
        resumeSessionId: resume ? lastVolcDialogId : null,
        tools: voiceToolRuntime?.declarations,
        webSearchEnabled:
          voiceConfig?.enabled !== false && voiceConfig?.webSearchEnabled === true,
      })
    )
  }

  const sendUpstreamAudio = (payload: Buffer) => {
    if (upstream.readyState !== WebSocket.OPEN || !sessionReady) {
      if (pendingAudio.length < 500) {
        pendingAudio.push(payload)
      }
      return
    }
    for (
      let offset = 0;
      offset < payload.length;
      offset += UPSTREAM_AUDIO_CHUNK_BYTES
    ) {
      const slice = payload.subarray(
        offset,
        Math.min(offset + UPSTREAM_AUDIO_CHUNK_BYTES, payload.length)
      )
      sendUpstreamJson({
        type: 'input_audio_buffer.append',
        audio: slice.toString('base64'),
      })
    }
  }

  const flushPendingAudio = () => {
    while (pendingAudio.length > 0) {
      const audio = pendingAudio.shift()
      if (audio) sendUpstreamAudio(audio)
    }
  }

  const closeBoth = (code = 1000, reason = 'done') => {
    persistRealtimeTurn(currentTurnId)
    clearInterval(pingInterval)
    try {
      if (upstream.readyState === WebSocket.OPEN) {
        sendUpstreamJson({ type: 'session.close' })
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
        logger.warn({ msg: 'Client heartbeat timeout, closing connection' })
        closeBoth(1002, 'Heartbeat timeout')
      }
    }
  }, 30000)

  let reconnectCount = 0
  let isReconnecting = false

  const tryReconnectUpstream = () => {
    if (isReconnecting || reconnectCount >= 3 || stopRequested) {
      safeSendClientJson(client, 'session_ended', {
        reason: 'upstream_disconnected_permanently',
      })
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
        const newUpstream = createWebSocket()
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
    let event: Record<string, unknown>
    try {
      const raw = normalizeClientAudioData(data).toString('utf8')
      event = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return
    }
    const type = typeof event.type === 'string' ? event.type : ''

    switch (type) {
      case 'session.created': {
        sessionReady = true
        isReconnecting = false
        reconnectCount = 0
        const session = event.session as Record<string, unknown> | undefined
        if (session && typeof session.id === 'string') {
          lastVolcDialogId = session.id
        }
        if (reconnectCount > 0) {
          safeSendClientJson(client, 'reconnected', {})
        }
        // 静音状态下没有音频帧，必须补发静音事件保活，否则会话超时无响应
        if (initiallyMuted) {
          sendUpstreamJson({ type: 'input_audio_mute.commit' })
        }
        flushPendingAudio()
        return
      }
      case 'error': {
        const message = pickErrorMessage(event)
        logger.error({ msg: 'Volc realtime upstream error event', error: message })
        if (!sessionReady) {
          // 会话都没建立起来，重连也无法恢复，直接终结
          safeSendClientJson(client, 'session_ended', {
            reason: 'upstream_session_rejected',
            errorText: message,
          })
          closeBoth(1011, 'upstream rejected session')
          return
        }
        safeSendClientJson(client, 'response.failed', {
          error: { message },
        })
        return
      }
      case 'input_audio_buffer.committed':
      case 'conversation.item.input_audio_transcription.started':
        ensureTurn()
        return
      case 'conversation.item.input_audio_transcription.delta': {
        const transcript = pickTranscript(event)
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
        return
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript =
          pickTranscript(event) || lastTranscript
        lastTranscript = transcript
        if (currentTurnId) {
          safeSendClientJson(
            client,
            'response.input_audio_transcription.completed',
            { sessionId, turnId: currentTurnId, transcript }
          )
        }
        return
      }
      case 'conversation.item.input_audio_transcription.failed':
        logger.warn({ msg: 'Volc realtime ASR failed', detail: event })
        return
      case 'response.output_text.delta': {
        const text = typeof event.delta === 'string' ? event.delta : ''
        if (!text) return
        const { textId } = ensureTurn()
        currentAssistantText += text
        textStarted = true
        safeSendClientJson(client, 'response.output_text.delta', {
          id: textId,
          delta: text,
        })
        return
      }
      case 'response.output_text.done': {
        if (currentTextId) {
          safeSendClientJson(client, 'response.output_text.done', {
            id: currentTextId,
          })
        }
        return
      }
      case 'response.output_audio.delta': {
        const audio = typeof event.audio === 'string' ? event.audio : ''
        if (!audio) return
        ensureTurn()
        safeSendClientJson(client, 'response.output_audio.delta', {
          audio,
          format: 'pcm_f32le',
          sampleRate: 24000,
        })
        return
      }
      case 'response.output_audio.started':
      case 'response.output_audio.done':
      case 'session.updated':
      case 'conversation.item.added':
      case 'conversation.item.retrieved':
      case 'conversation.item.deleted':
      case 'input_audio_buffer.cleared':
        return
      case 'response.function_call_arguments.done':
        // 火山模型已决定调用工具且参数齐备；排队串行执行后回传结果
        queueVoiceFunctionCall(event)
        return
      case 'response.done':
      case 'response.canceled':
        completeTurn()
        return
      case 'session.closed':
        safeSendClientJson(client, 'session_ended', {
          reason: 'upstream_closed',
        })
        closeBoth(1000, 'volc session closed')
        return
      default:
        logger.debug({ msg: 'Volc realtime unhandled event', type })
    }
  }

  const bindUpstreamEvents = () => {
    upstream.on('open', () => {
      safeSendClientJson(client, 'realtime.session.created', {
        sessionId,
        provider: 'volcengine',
        model: config.volcRealtimeModel,
        userId,
      })
      if (startRequested) {
        createVolcSession(reconnectCount > 0)
      }
    })

    upstream.on('message', handleUpstreamMessage)

    upstream.on('error', error => {
      logger.error({ msg: 'Volc realtime upstream socket error', err: error })
      const handshakeStatus = upstreamHandshakeStatus(error)
      if (
        handshakeStatus === 401 ||
        handshakeStatus === 403 ||
        handshakeStatus === 404
      ) {
        // 授权类失败重试无意义，立即终结并让前端展示可理解的原因
        safeSendClientJson(client, 'session_ended', {
          reason: 'upstream_unauthorized',
          status: handshakeStatus,
        })
        closeBoth(1011, 'upstream rejected the handshake')
        return
      }
      if (!isReconnecting) {
        tryReconnectUpstream()
      }
    })

    upstream.on('close', () => {
      if (stopRequested) return
      if (!isReconnecting && client.readyState === WebSocket.OPEN) {
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
            muted?: boolean
          }
          if (payload.type === 'pong') {
            lastPongTime = Date.now()
            return
          }
          if (payload.type === 'client.start' && !startRequested) {
            pendingInstructions = payload.instructions
            initiallyMuted = payload.muted === true
            await ensurePersistentThread({
              agentId: payload.agentId,
              threadId: payload.threadId,
            })
            startRequested = true
            if (currentAgentId) {
              await loadVoiceToolset(currentAgentId)
              await ensureVoiceToolRuntime()
            }
            createVolcSession(false)
            return
          }
          if (payload.type === 'client.stop') {
            stopRequested = true
            persistRealtimeTurn(currentTurnId)
            sendUpstreamJson({ type: 'session.close' })
            closeBoth(1000, 'client stopped')
            return
          }
          // 浏览器静音后不再有音频帧，必须发静音事件给上游保活，否则会话超时
          if (payload.type === 'client.mute') {
            sendUpstreamJson({ type: 'input_audio_mute.commit' })
            return
          }
          if (payload.type === 'client.unmute') {
            sendUpstreamJson({ type: 'input_audio_unmute.commit' })
            return
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

  client.on('close', () => {
    stopRequested = true
    closeBoth(1000, 'client closed')
  })
  client.on('error', error => {
    logger.error({ msg: 'Realtime client socket error', err: error })
    closeBoth(1011, 'client error')
  })
}
