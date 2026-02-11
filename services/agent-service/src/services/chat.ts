import {
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  ToolMessage,
} from '@langchain/core/messages'
import { DynamicTool } from '@langchain/core/tools'
import { ChatOpenAI } from '@langchain/openai'
import { toBaseMessages } from '@ai-sdk/langchain'
import { config, logger } from '../config/index.js'

function createModel() {
  const baseURL = config.aiBaseUrl || undefined
  return new ChatOpenAI({
    apiKey: config.aiApiKey,
    model: config.aiModel,
    temperature: 0.7,
    configuration: baseURL ? { baseURL } : undefined,
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

function createSingleChunkStream(content: unknown): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(
        new AIMessageChunk({
          content: typeof content === 'string' ? content : '',
        })
      )
      controller.close()
    },
  })
}

export interface ParsedChatInput {
  inputMessages: BaseMessage[]
  lastMessageText: string
}

export async function parseChatInput(
  body: unknown
): Promise<ParsedChatInput | null> {
  const payload = (body ?? {}) as {
    messages?: unknown[]
    message?: unknown
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

  return {
    inputMessages: inputMessages as BaseMessage[],
    lastMessageText,
  }
}

export async function runChatWithBuiltInTools(
  inputMessages: BaseMessage[]
): Promise<ReadableStream | AsyncIterable<AIMessageChunk>> {
  const tools = createBuiltinTools()
  const baseModel = createModel()
  const modelWithTools = baseModel.bindTools(tools)
  const toolMap = new Map(tools.map(tool => [tool.name, tool]))
  const conversation: BaseMessage[] = [...inputMessages]
  const maxSteps = 6

  for (let step = 0; step < maxSteps; step += 1) {
    const aiMessage = await modelWithTools.invoke(conversation)
    const toolCalls = Array.isArray(aiMessage.tool_calls)
      ? aiMessage.tool_calls
      : []

    if (!toolCalls.length) {
      if (step > 0) {
        return await baseModel.stream(conversation)
      }
      return createSingleChunkStream(aiMessage.content)
    }

    conversation.push(aiMessage)

    for (const call of toolCalls) {
      const tool = toolMap.get(call.name)
      if (!tool) {
        conversation.push(
          new ToolMessage({
            tool_call_id: call.id ?? `missing-tool-${step}`,
            content: `工具 ${call.name} 不存在。`,
          })
        )
        continue
      }

      const normalizedInput = normalizeToolInput(call.args)
      logger.info({
        msg: 'Tool called',
        toolName: call.name,
        step,
        input: normalizedInput,
      })

      const toolResult = await tool.invoke(normalizedInput)
      const toolContent =
        typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)

      conversation.push(
        new ToolMessage({
          tool_call_id: call.id ?? `${call.name}-${step}`,
          content: toolContent,
        })
      )
    }
  }

  return createSingleChunkStream(
    '我尝试调用工具处理你的请求，但步骤超出上限。请换个问法再试一次。'
  )
}
