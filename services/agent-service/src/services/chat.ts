import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { DynamicTool } from '@langchain/core/tools'
import { logger, config } from '../config/index.js'
import { prisma } from './db.js'
import { formatCurrentTime } from './current-time.js'
import {
  createModelByProvider,
  type ChatProvider,
  type ReasoningEffort,
} from './chat/providers/index.js'
import {
  CHAT_MODEL_MIGRATIONS,
  DEFAULT_CHAT_MODEL_KEY,
  DEFAULT_CHAT_MODELS,
  normalizeChatModelKey,
} from './chat-model-catalog.js'

export interface ChatModelOption {
  model: string
  label: string
  provider: ChatProvider
  isReasoning: boolean
  supportVision: boolean
  supportReasoningControl: boolean
}

const REASONING_EFFORT_VALUES: ReasoningEffort[] = [
  'minimal',
  'low',
  'medium',
  'high',
]

let modelsInitialized = false

async function ensureChatModelsInitialized() {
  if (modelsInitialized) return

  try {
    const migratedAgentCounts: Record<string, number> = {}

    await prisma.$transaction(async tx => {
      // 1. 同步默认模型到数据库
      for (const item of DEFAULT_CHAT_MODELS) {
        await tx.chatModel.upsert({
          where: { modelKey: item.modelKey },
          update: {
            displayName: item.displayName,
            provider: item.provider,
            isReasoning: item.isReasoning,
            sortOrder: item.sortOrder,
            supportVision: item.supportVision,
            supportReasoningControl: item.supportReasoningControl,
          },
          create: {
            modelKey: item.modelKey,
            displayName: item.displayName,
            provider: item.provider,
            isReasoning: item.isReasoning,
            isEnabled: true,
            sortOrder: item.sortOrder,
            supportVision: item.supportVision,
            supportReasoningControl: item.supportReasoningControl,
          },
        })
      }

      // 2. 先迁移 Agent 绑定，避免目录清理后仍指向过期模型。
      for (const [previousModelKey, nextModelKey] of Object.entries(
        CHAT_MODEL_MIGRATIONS
      )) {
        const result = await tx.agent.updateMany({
          where: { modelKey: previousModelKey },
          data: { modelKey: nextModelKey },
        })
        if (result.count > 0) {
          migratedAgentCounts[`${previousModelKey}->${nextModelKey}`] =
            result.count
        }
      }

      // 3. 清理不在默认列表中的过期模型
      const validModelKeys = DEFAULT_CHAT_MODELS.map(item => item.modelKey)
      await tx.chatModel.deleteMany({
        where: {
          modelKey: {
            notIn: validModelKeys,
          },
        },
      })
    })

    modelsInitialized = true
    logger.info({
      msg: 'Chat model catalog initialized',
      modelCount: DEFAULT_CHAT_MODELS.length,
      migratedAgentCounts,
    })
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
  provider: ChatProvider | string
  isReasoning: boolean
  supportVision: boolean
  supportReasoningControl: boolean
}): ChatModelOption {
  const provider: ChatProvider =
    raw.provider === 'openai' ||
    raw.provider === 'shortapi' ||
    raw.provider === 'seed' ||
    raw.provider === 'gcloud' ||
    raw.provider === 'bailian'
      ? raw.provider
      : 'deepseek'

  return {
    model: raw.modelKey,
    label: raw.displayName,
    provider,
    isReasoning: raw.isReasoning,
    supportVision: raw.supportVision,
    supportReasoningControl: raw.supportReasoningControl,
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

async function resolveSelectedModel(
  selectedModel: string
): Promise<ChatModelOption> {
  const availableModels = await listChatModels()
  const normalizedModel = normalizeChatModelKey(selectedModel)
  const resolved =
    availableModels.find(item => item.model === normalizedModel) ??
    availableModels[0]

  if (!resolved) {
    throw new Error('未配置可用模型，请先在数据库中启用 chat_models')
  }
  return resolved
}

async function createModel(
  selectedModel: string,
  reasoningEffort: ReasoningEffort
) {
  const selected = await resolveSelectedModel(selectedModel)
  return createModelByProvider(selected.provider, {
    model: selected.model,
    reasoningEffort,
  })
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
      '获取指定时区的当前日期和时间。输入可为空，默认使用中国标准时间 Asia/Shanghai；也可传 IANA 时区标识符。',
    func: async input => formatCurrentTime(input),
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


export async function generateAgentInstructions(
  description: string,
  modelKey?: string
): Promise<{ instructions: string; voice?: Record<string, unknown> }> {
  const selectedModel = normalizeChatModelKey(
    modelKey || DEFAULT_CHAT_MODEL_KEY
  )
  const selected = await resolveSelectedModel(selectedModel)
  const modelRuntime = await createModelByProvider(selected.provider, {
    model: selected.model,
    reasoningEffort: 'medium',
  })

  const systemPrompt = `你是一个专家级 AI Agent 系统提示词（System Prompt）与实时语音参数设计大师。
请根据用户提供的 Agent 功能描述，为该 Agent 撰写一份专业、严谨、逻辑清晰的系统提示词（System Prompt），并推荐出最适合该人设的实时语音通话参数。
你必须直接以 JSON 格式输出，不得包含任何包裹用的 Markdown 格式代码块（如 \`\`\`json 或 \`\`\`），也绝对不要包含任何多余的解释性前言/后记。

JSON 的键值结构严格定义如下：
{
  "instructions": "为该 Agent 撰写的系统提示词（文本交互及底层运行逻辑），明确其角色定位、工作流和交互规范。内容要求丰富完整，不要使用占位符。",
  "voice": {
    "speakingStyle": "推荐的实时语音说话风格，例如：'温柔耐心'、'幽默且富有同理心'、'冷酷、严肃、言简意赅'、'傲娇且充满朝气'。长度限制在 10 字以内。",
    "characterDetails": "该 Agent 语音对话时的人设细节、语气建议和情感指导，字数在 100 字以内。",
    "webSearchEnabled": true 或 false。请根据该 Agent 的功能定位进行推理：如果它是一个资讯、搜索、天气、股票或时效性要求强的助手，则设为 true，否则设为 false。,
    "singingEnabled": true 或 false。判断它是否适合拥有唱歌和音乐互动的属性。偏严肃的办公/代码助手设为 false，情感陪伴或娱乐助理设为 true。,
    "speaker": "推荐的音色。为了确保兼容实时语音对话，你必须且只能从以下支持的 4 种音色中选择一个最贴近该人设的音色并填入其标识符：
      - 'zh_female_vv_jupiter_bigtts' (Vivi：旗舰女声，温柔耐心，适合多种场景，为默认首选)
      - 'zh_male_yunzhou_jupiter_bigtts' (云舟：旗舰男声，沉稳专业)
      - 'zh_female_xiaohe_jupiter_bigtts' (小何：旗舰女声，知性亲切)
      - 'zh_male_xiaotian_jupiter_bigtts' (小天：旗舰男声，阳光活力)
      如果不确定或不适用，默认填 'zh_female_vv_jupiter_bigtts'。"
  }
}`

  try {
    const response = await modelRuntime.model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`以下是该 Agent 的功能与角色描述：\n${description}`),
    ])

    const content = typeof response.content === 'string' ? response.content.trim() : ''
    
    let cleanJson = content
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim()
    }
    
    const parsed = JSON.parse(cleanJson) as {
      instructions?: string
      voice?: Record<string, unknown>
    }

    if (parsed.instructions && typeof parsed.instructions === 'string') {
      return {
        instructions: parsed.instructions.trim(),
        voice: parsed.voice && typeof parsed.voice === 'object' ? parsed.voice : undefined
      }
    }
  } catch (error) {
    logger.warn({
      msg: 'Failed to parse AI structured prompt JSON, falling back to raw text prompt',
      err: error instanceof Error ? error.message : String(error)
    })
  }

  // Fallback: request text system prompt
  try {
    const response = await modelRuntime.model.invoke([
      new SystemMessage(
        '你是一个专家级 AI Agent 系统提示词（System Prompt）设计大师。请根据用户提供的 Agent 功能描述，为该 Agent 撰写一份专业、严谨、逻辑清晰且实用的系统提示词（System Prompt）。要求：\n1. 明确角色定位、工作流和交互规范；\n2. 直接输出生成的提示词内容，绝对不要包含任何包裹用的 Markdown 格式代码块或多余解释。'
      ),
      new HumanMessage(`以下是该 Agent 的功能与角色描述：\n${description}`),
    ])
    
    const instructions = typeof response.content === 'string' ? response.content.trim() : description
    return {
      instructions,
      voice: {
        speakingStyle: '自然、清晰、可靠',
        characterDetails: '扮演一个自然、专业的语音助手，回答简洁明了，适合语音播报。',
        webSearchEnabled: false,
        singingEnabled: false,
        speaker: 'zh_female_vv_jupiter_bigtts'
      }
    }
  } catch (fallbackError) {
    logger.error({
      msg: 'Fallback prompt generation failed',
      err: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
    })
    return {
      instructions: description,
      voice: {
        speakingStyle: '自然、清晰、可靠',
        characterDetails: '扮演一个自然、专业的语音助手，回答简洁明了，适合语音播报。',
        webSearchEnabled: false,
        singingEnabled: false,
        speaker: 'zh_female_vv_jupiter_bigtts'
      }
    }
  }
}

export async function generateAgentInstructionsAsync(
  agentId: string,
  description: string,
  modelKey?: string
): Promise<void> {
  try {
    await prisma.agent.update({
      where: { id: agentId },
      data: { instructionStatus: 'generating' },
    })
  } catch (err) {
    logger.error({
      msg: 'Failed to update agent instructionStatus to generating',
      agentId,
      error: err instanceof Error ? err.message : String(err),
    })
    return
  }

  const generatePromise = generateAgentInstructions(description, modelKey)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Prompt generation timeout (30s)')), 30000)
  )

  Promise.race([generatePromise, timeoutPromise])
    .then(async (result) => {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { metadata: true }
      })
      const currentMetadata = (agent?.metadata || {}) as Record<string, any>
      const updatedMetadata = {
        ...currentMetadata,
        voice: {
          enabled: true,
          ...result.voice,
        }
      }

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          instructions: result.instructions,
          instructionStatus: 'completed',
          metadata: updatedMetadata,
        },
      })
      logger.info({ msg: 'Agent instructions and voice config generated successfully', agentId })
    })
    .catch(async (err) => {
      logger.error({
        msg: 'Failed to generate agent instructions asynchronously',
        agentId,
        error: err instanceof Error ? err.message : String(err),
      })
      try {
        await prisma.agent.update({
          where: { id: agentId },
          data: { instructionStatus: 'failed' },
        })
      } catch (dbErr) {
        logger.error({
          msg: 'Failed to mark agent instructionStatus as failed',
          agentId,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        })
      }
    })
}
