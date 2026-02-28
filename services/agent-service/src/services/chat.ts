import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { DynamicTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { toBaseMessages } from '@ai-sdk/langchain'
import { createUIMessageStream, type UIMessageChunk } from 'ai'
import { config, logger } from '../config/index.js'
import { prisma } from './db.js'

interface RuntimeModelConfig {
  apiKey: string
  baseURL: string
  model: string
  provider: 'deepseek' | 'seed'
}

export interface ChatModelOption {
  model: string
  label: string
  provider: 'deepseek' | 'seed'
  isReasoning: boolean
}

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'
const REASONING_EFFORT_VALUES: ReasoningEffort[] = [
  'minimal',
  'low',
  'medium',
  'high',
]

const DEFAULT_CHAT_MODELS = [
  {
    modelKey: 'deepseek-chat',
    displayName: 'DeepSeek Chat',
    provider: 'deepseek',
    isReasoning: false,
    sortOrder: 10,
  },
  {
    modelKey: 'deepseek-reasoner',
    displayName: 'DeepSeek Reasoner',
    provider: 'deepseek',
    isReasoning: true,
    sortOrder: 20,
  },
  {
    modelKey: 'doubao-seed-2-0-lite-260215',
    displayName: 'Doubao Seed 2.0 Lite',
    provider: 'seed',
    isReasoning: true,
    sortOrder: 30,
  },
  {
    modelKey: 'doubao-seed-2-0-pro-260215',
    displayName: 'Doubao Seed 2.0 Pro',
    provider: 'seed',
    isReasoning: true,
    sortOrder: 40,
  },
  {
    modelKey: 'doubao-seed-2-0-mini-260215',
    displayName: 'Doubao Seed 2.0 Mini',
    provider: 'seed',
    isReasoning: true,
    sortOrder: 50,
  },
  {
    modelKey: 'glm-4-7-251222',
    displayName: 'GLM-4.7',
    provider: 'seed',
    isReasoning: true,
    sortOrder: 60,
  },
  {
    modelKey: 'kimi-k2-thinking-251104',
    displayName: 'Kimi K2 Thinking',
    provider: 'seed',
    isReasoning: true,
    sortOrder: 70,
  },
] as const

let modelsInitialized = false

async function ensureChatModelsInitialized() {
  if (modelsInitialized) return

  try {
    await Promise.all(
      DEFAULT_CHAT_MODELS.map(item =>
        prisma.chatModel.upsert({
          where: { modelKey: item.modelKey },
          update: {
            displayName: item.displayName,
            provider: item.provider,
            isReasoning: item.isReasoning,
            sortOrder: item.sortOrder,
          },
          create: {
            modelKey: item.modelKey,
            displayName: item.displayName,
            provider: item.provider,
            isReasoning: item.isReasoning,
            isEnabled: true,
            sortOrder: item.sortOrder,
          },
        })
      )
    )
    modelsInitialized = true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(
      `初始化聊天模型失败，请先执行数据库同步（pnpm --filter ./services/agent-service db:push）：${errorMessage}`
    )
  }
}

function toChatModelOption(raw: {
  modelKey: string
  displayName: string
  provider: string
  isReasoning: boolean
}): ChatModelOption {
  return {
    model: raw.modelKey,
    label: raw.displayName,
    provider: raw.provider === 'seed' ? 'seed' : 'deepseek',
    isReasoning: raw.isReasoning,
  }
}

export async function listChatModels(): Promise<ChatModelOption[]> {
  await ensureChatModelsInitialized()

  const models = await prisma.chatModel.findMany({
    where: { isEnabled: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return models.map(toChatModelOption)
}

async function resolveModelConfig(
  selectedModel: string
): Promise<RuntimeModelConfig> {
  const availableModels = await listChatModels()
  const resolved =
    availableModels.find(item => item.model === selectedModel) ??
    availableModels[0]

  if (!resolved) {
    throw new Error('未配置可用模型，请先在数据库中启用 chat_models')
  }

  if (resolved.provider === 'seed') {
    if (!config.seedApiKey) {
      throw new Error('SEED_API_KEY is required for seed models')
    }

    return {
      apiKey: config.seedApiKey,
      baseURL: config.seedBaseUrl,
      model: resolved.model,
      provider: 'seed',
    }
  }

  if (!config.deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY is required for deepseek models')
  }

  return {
    apiKey: config.deepseekApiKey,
    baseURL: config.deepseekBaseUrl,
    model: resolved.model,
    provider: 'deepseek',
  }
}

async function createModel(
  selectedModel: string,
  reasoningEffort: ReasoningEffort
) {
  const runtimeModel = await resolveModelConfig(selectedModel)
  const baseURL = runtimeModel.baseURL || undefined
  const seedModelKwargs =
    runtimeModel.provider === 'seed'
      ? {
          reasoning_effort: reasoningEffort,
          ...(reasoningEffort === 'minimal'
            ? { thinking: { type: 'disabled' } }
            : {}),
        }
      : undefined

  return {
    provider: runtimeModel.provider,
    model: new ChatOpenAI({
      apiKey: runtimeModel.apiKey,
      model: runtimeModel.model,
      temperature: 0.7,
      modelKwargs: seedModelKwargs,
      // Keep provider raw chunks so we can read DeepSeek/Seed reasoning fields
      __includeRawResponse: true,
      configuration: baseURL ? { baseURL } : undefined,
    }),
  }
}

function extractExpression(input: string): string | null {
  const trimmed = input.trim()
  const prefixed = /^(calc|计算|计算器)[:：\s]+(.+)$/i
  const prefixedMatch = trimmed.match(prefixed)
  if (prefixedMatch?.[2]) return prefixedMatch[2].trim()

  if (/^[\d\s()+\-*/.]+$/.test(trimmed)) return trimmed
  return null
}

function tokenize(expression: string): (number | string)[] {
  const tokens: (number | string)[] = []
  const cleaned = expression.replace(/\s+/g, '')
  let i = 0

  while (i < cleaned.length) {
    const char = cleaned[i]

    if ((char >= '0' && char <= '9') || char === '.') {
      let numberText = char
      i += 1
      while (i < cleaned.length) {
        const next = cleaned[i]
        if ((next >= '0' && next <= '9') || next === '.') {
          numberText += next
          i += 1
        } else {
          break
        }
      }
      const value = Number(numberText)
      if (!Number.isFinite(value)) throw new Error('Invalid number')
      tokens.push(value)
      continue
    }

    if (
      char === '-' &&
      (tokens.length === 0 ||
        (typeof tokens[tokens.length - 1] === 'string' &&
          tokens[tokens.length - 1] !== ')'))
    ) {
      let numberText = '-'
      i += 1
      while (i < cleaned.length) {
        const next = cleaned[i]
        if ((next >= '0' && next <= '9') || next === '.') {
          numberText += next
          i += 1
        } else {
          break
        }
      }
      const value = Number(numberText)
      if (!Number.isFinite(value)) throw new Error('Invalid number')
      tokens.push(value)
      continue
    }

    if ('+-*/()'.includes(char)) {
      tokens.push(char)
      i += 1
      continue
    }

    throw new Error('Invalid character')
  }

  return tokens
}

function toRpn(tokens: (number | string)[]): (number | string)[] {
  const output: (number | string)[] = []
  const operators: string[] = []
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

  for (const token of tokens) {
    if (typeof token === 'number') {
      output.push(token)
      continue
    }

    if (token === '(') {
      operators.push(token)
      continue
    }

    if (token === ')') {
      while (operators.length) {
        const op = operators.pop()!
        if (op === '(') break
        output.push(op)
      }
      continue
    }

    while (operators.length) {
      const op = operators[operators.length - 1]
      if (op === '(') break
      if (precedence[op] >= precedence[token]) {
        output.push(operators.pop()!)
      } else {
        break
      }
    }
    operators.push(token)
  }

  while (operators.length) {
    const op = operators.pop()!
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses')
    output.push(op)
  }

  return output
}

function evalRpn(tokens: (number | string)[]): number {
  const stack: number[] = []

  for (const token of tokens) {
    if (typeof token === 'number') {
      stack.push(token)
      continue
    }

    const b = stack.pop()
    const a = stack.pop()
    if (a === undefined || b === undefined)
      throw new Error('Invalid expression')

    switch (token) {
      case '+':
        stack.push(a + b)
        break
      case '-':
        stack.push(a - b)
        break
      case '*':
        stack.push(a * b)
        break
      case '/':
        if (b === 0) throw new Error('Division by zero')
        stack.push(a / b)
        break
      default:
        throw new Error('Unsupported operator')
    }
  }

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error('Invalid expression')
  }

  return stack[0]
}

function extractTextFromMessage(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (!raw || typeof raw !== 'object') return ''

  const message = raw as {
    content?: unknown
    parts?: Array<{ type?: string; text?: string }>
  }

  if (typeof message.content === 'string') return message.content

  if (Array.isArray(message.parts)) {
    const text = message.parts
      .filter(part => part?.type === 'text' && typeof part.text === 'string')
      .map(part => part.text)
      .join('')
    if (text) return text
  }

  if (Array.isArray(message.content)) {
    const text = message.content
      .filter(
        part =>
          part &&
          typeof part === 'object' &&
          (part as { type?: string }).type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string'
      )
      .map(part => (part as { text: string }).text)
      .join('')
    if (text) return text
  }

  return ''
}

function normalizeToolInput(args: unknown): string {
  if (typeof args === 'string') return args
  if (typeof args === 'number' || typeof args === 'boolean') return String(args)

  if (args && typeof args === 'object') {
    const obj = args as Record<string, unknown>
    for (const key of ['input', 'expression', 'query', 'text', 'value']) {
      if (typeof obj[key] === 'string' && obj[key].trim()) return obj[key]
    }
    return JSON.stringify(obj)
  }

  return ''
}

function createBuiltinTools() {
  const timeTool = new DynamicTool({
    name: 'get_current_time',
    description:
      'Get current date and time in Chinese locale. Input can be empty.',
    func: async () => {
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
      return `当前时间：${formatter.format(new Date())}`
    },
  })

  const calculatorTool = new DynamicTool({
    name: 'calculator',
    description:
      'Calculate arithmetic expressions with + - * / and parentheses. Input should be a plain math expression.',
    func: async input => {
      const expression = extractExpression(input)
      if (!expression) {
        return '计算失败，请提供可计算表达式。'
      }

      try {
        const tokens = tokenize(expression)
        const rpn = toRpn(tokens)
        const result = evalRpn(rpn)
        return `计算结果：${result}`
      } catch (error) {
        logger.warn({
          msg: 'Calculator tool error',
          expression,
          err: error instanceof Error ? error.message : String(error),
        })
        return '计算失败，请检查表达式格式。'
      }
    },
  })

  return [timeTool, calculatorTool]
}

function extractThinkText(content: string): string {
  if (!content.includes('<think>')) return ''
  const matches = content.matchAll(/<think>([\s\S]*?)<\/think>/gi)
  const segments: string[] = []

  for (const match of matches) {
    const text = (match[1] ?? '').trim()
    if (text) segments.push(text)
  }

  return segments.join('\n')
}

function extractReasoningFromRawResponse(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return ''

  const obj = raw as Record<string, unknown>
  const choices = Array.isArray(obj.choices) ? obj.choices : []
  if (!choices.length) return ''

  const first = choices[0]
  if (!first || typeof first !== 'object') return ''

  const choice = first as Record<string, unknown>
  const delta =
    choice.delta && typeof choice.delta === 'object'
      ? (choice.delta as Record<string, unknown>)
      : undefined
  const message =
    choice.message && typeof choice.message === 'object'
      ? (choice.message as Record<string, unknown>)
      : undefined

  const values: string[] = []
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      values.push(value)
    }
  }

  push(delta?.reasoning_content)
  push(delta?.reasoning)
  push(delta?.thinking)
  push(message?.reasoning_content)
  push(message?.reasoning)
  push(message?.thinking)

  return values.join('')
}

export interface ParsedChatInput {
  inputMessages: BaseMessage[]
  lastMessageText: string
  selectedModel: string
  reasoningEffort: ReasoningEffort
}

export async function parseChatInput(
  body: unknown
): Promise<ParsedChatInput | null> {
  const payload = (body ?? {}) as {
    messages?: unknown[]
    message?: unknown
    model?: unknown
    reasoningEffort?: unknown
    reasoning_effort?: unknown
  }
  const hasUiMessages =
    Array.isArray(payload.messages) && payload.messages.length > 0

  const fallbackMessage = hasUiMessages
    ? ([...payload.messages!]
        .reverse()
        .find(
          raw =>
            raw &&
            typeof raw === 'object' &&
            (raw as { role?: string }).role === 'user'
        ) ?? payload.messages![payload.messages!.length - 1])
    : undefined

  const candidate = payload.message ?? fallbackMessage
  const lastMessageText = extractTextFromMessage(candidate).trim()

  if (!candidate || !lastMessageText) return null

  const inputMessages = hasUiMessages
    ? await toBaseMessages(payload.messages as any)
    : [new HumanMessage(lastMessageText)]

  const selectedModel =
    typeof payload.model === 'string' ? payload.model.trim() : ''
  const reasoningEffortRaw =
    payload.reasoningEffort ?? payload.reasoning_effort
  const reasoningEffort =
    typeof reasoningEffortRaw === 'string' &&
    REASONING_EFFORT_VALUES.includes(reasoningEffortRaw as ReasoningEffort)
      ? (reasoningEffortRaw as ReasoningEffort)
      : 'medium'

  return {
    inputMessages: inputMessages as BaseMessage[],
    lastMessageText,
    selectedModel,
    reasoningEffort,
  }
}

export async function runChatWithBuiltInTools(
  inputMessages: BaseMessage[],
  selectedModel: string,
  reasoningEffort: ReasoningEffort
): Promise<ReadableStream<UIMessageChunk>> {
  const tools = createBuiltinTools()
  const modelRuntime = await createModel(selectedModel, reasoningEffort)
  const model = modelRuntime.model.bindTools(tools)
  const toolMap = new Map(tools.map(tool => [tool.name, tool]))
  const createPartId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const extractTextFromChunk = (chunk: AIMessageChunk) => {
    if (typeof chunk.content === 'string') return chunk.content
    if (!Array.isArray(chunk.content)) return ''

    return chunk.content
      .filter(
        part =>
          part &&
          typeof part === 'object' &&
          'type' in part &&
          part.type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string'
      )
      .map(part => (part as { text: string }).text)
      .join('')
  }

  const extractReasoningFromChunk = (chunk: AIMessageChunk) => {
    const values: string[] = []

    const tryPush = (value: unknown) => {
      if (typeof value === 'string' && value.trim()) {
        if (!values.includes(value)) {
          values.push(value)
        }
      }
    }

    if (typeof chunk.content === 'string') {
      const thinkText = extractThinkText(chunk.content)
      tryPush(thinkText)
    }

    if (Array.isArray(chunk.content)) {
      chunk.content.forEach(part => {
        if (!part || typeof part !== 'object') return
        const typedPart = part as {
          type?: string
          text?: unknown
          reasoning?: unknown
        }
        if (
          (typedPart.type === 'reasoning' || typedPart.type === 'thinking') &&
          typeof typedPart.text === 'string'
        ) {
          values.push(typedPart.text)
        }
        tryPush(typedPart.reasoning)
      })
    }

    const contentBlocks = (chunk as { contentBlocks?: unknown }).contentBlocks
    if (Array.isArray(contentBlocks)) {
      contentBlocks.forEach(block => {
        if (!block || typeof block !== 'object') return
        const typedBlock = block as {
          type?: string
          text?: unknown
          reasoning?: unknown
        }

        if (
          (typedBlock.type === 'reasoning' || typedBlock.type === 'thinking') &&
          typeof typedBlock.text === 'string'
        ) {
          tryPush(typedBlock.text)
        }

        tryPush(typedBlock.reasoning)
      })
    }

    const additional = chunk.additional_kwargs as Record<string, unknown>
    const metadata = chunk.response_metadata as Record<string, unknown>

    tryPush(additional.reasoning_content)
    tryPush(additional.reasoning)
    tryPush(additional.thinking)
    tryPush(extractReasoningFromRawResponse(additional.__raw_response))
    tryPush(metadata.reasoning_content)
    tryPush(metadata.reasoning)
    tryPush(metadata.thinking)

    return values.join('')
  }

  const getIncrementalDelta = (raw: string, snapshot: string) => {
    if (!raw) return { delta: '', nextSnapshot: snapshot }
    if (raw.startsWith(snapshot)) {
      return {
        delta: raw.slice(snapshot.length),
        nextSnapshot: raw,
      }
    }
    return {
      delta: raw,
      nextSnapshot: `${snapshot}${raw}`,
    }
  }

  return createUIMessageStream({
    execute: async ({ writer }) => {
      const conversation: BaseMessage[] = [...inputMessages]
      const maxSteps = 6

      for (let step = 0; step < maxSteps; step += 1) {
        writer.write({ type: 'start-step' })

        let finalChunk: AIMessageChunk | null = null
        const stepStream = await model.stream(conversation)
        const textPartId = createPartId(`text-${step}`)
        const reasoningPartId = createPartId(`reasoning-${step}`)
        let textStarted = false
        let reasoningStarted = false
        let reasoningSnapshot = ''

        for await (const chunk of stepStream) {
          finalChunk = finalChunk ? finalChunk.concat(chunk) : chunk
          const text = extractTextFromChunk(chunk)
          const reasoningRaw = extractReasoningFromChunk(chunk)
          const reasoningDeltaResult = getIncrementalDelta(
            reasoningRaw,
            reasoningSnapshot
          )
          reasoningSnapshot = reasoningDeltaResult.nextSnapshot

          if (reasoningDeltaResult.delta) {
            if (!reasoningStarted) {
              writer.write({ type: 'reasoning-start', id: reasoningPartId })
              reasoningStarted = true
            }
            writer.write({
              type: 'reasoning-delta',
              id: reasoningPartId,
              delta: reasoningDeltaResult.delta,
            })
          }

          if (!text) continue

          if (!textStarted) {
            writer.write({ type: 'text-start', id: textPartId })
            textStarted = true
          }
          writer.write({
            type: 'text-delta',
            id: textPartId,
            delta: text,
          })
        }

        if (textStarted) {
          writer.write({ type: 'text-end', id: textPartId })
        }
        if (reasoningStarted) {
          writer.write({ type: 'reasoning-end', id: reasoningPartId })
        }

        if (!finalChunk) {
          writer.write({ type: 'finish-step' })
          return
        }

        const toolCalls = Array.isArray(finalChunk.tool_calls)
          ? finalChunk.tool_calls
          : []

        if (!toolCalls.length) {
          writer.write({ type: 'finish-step' })
          return
        }

        conversation.push(
          new AIMessage({
            content: finalChunk.content,
            tool_calls: toolCalls,
          })
        )

        for (let index = 0; index < toolCalls.length; index += 1) {
          const call = toolCalls[index]!
          const toolCallId = call.id ?? `${call.name}-${step}-${index}`
          const normalizedInput = normalizeToolInput(call.args)

          writer.write({
            type: 'tool-input-start',
            toolCallId,
            toolName: call.name,
            dynamic: true,
          })

          if (normalizedInput) {
            writer.write({
              type: 'tool-input-delta',
              toolCallId,
              inputTextDelta: normalizedInput,
            })
          }

          writer.write({
            type: 'tool-input-available',
            toolCallId,
            toolName: call.name,
            input: call.args ?? normalizedInput,
            dynamic: true,
          })

          const tool = toolMap.get(call.name)
          if (!tool) {
            const errorText = `工具 ${call.name} 不存在。`
            writer.write({
              type: 'tool-output-error',
              toolCallId,
              errorText,
              dynamic: true,
            })

            conversation.push(
              new ToolMessage({
                tool_call_id: toolCallId,
                content: errorText,
              })
            )
            continue
          }

          logger.info({
            msg: 'Tool called',
            toolName: call.name,
            step,
            input: normalizedInput,
          })

          try {
            const toolResult = await tool.invoke(normalizedInput)
            const toolContent =
              typeof toolResult === 'string'
                ? toolResult
                : JSON.stringify(toolResult)

            writer.write({
              type: 'tool-output-available',
              toolCallId,
              output: toolResult,
              dynamic: true,
            })

            conversation.push(
              new ToolMessage({
                tool_call_id: toolCallId,
                content: toolContent,
              })
            )
          } catch (error) {
            const errorText =
              error instanceof Error ? error.message : '工具执行失败'

            writer.write({
              type: 'tool-output-error',
              toolCallId,
              errorText,
              dynamic: true,
            })

            conversation.push(
              new ToolMessage({
                tool_call_id: toolCallId,
                content: errorText,
              })
            )
          }
        }

        writer.write({ type: 'finish-step' })
      }

      const fallbackTextId = createPartId('fallback')
      writer.write({ type: 'start-step' })
      writer.write({ type: 'text-start', id: fallbackTextId })
      writer.write({
        type: 'text-delta',
        id: fallbackTextId,
        delta:
          '我尝试调用工具处理你的请求，但步骤超出上限。请换个问法再试一次。',
      })
      writer.write({ type: 'text-end', id: fallbackTextId })
      writer.write({ type: 'finish-step' })
    },
    onError: error => {
      logger.error({
        msg: 'UI stream error',
        err: error instanceof Error ? error.message : String(error),
      })
      return '聊天服务错误'
    },
  })
}
