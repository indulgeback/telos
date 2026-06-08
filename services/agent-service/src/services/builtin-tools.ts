import { tool, type Tool } from '@openai/agents'
import { logger } from '../config/index.js'
import { asRecord } from '../utils/json.js'
import { prisma } from './db.js'
import type { AgentRunPersistence } from './persistence.js'

type BuiltinToolKey = 'get_current_time' | 'calculator'

interface BuiltinToolDefinition {
  id: string
  name: BuiltinToolKey
  displayName: string
  description: string
  category: string
  endpoint: Record<string, unknown>
  parameters: Record<string, unknown>
  tags: string[]
}

export const BUILTIN_TOOL_DEFINITIONS: BuiltinToolDefinition[] = [
  {
    id: 'builtin_get_current_time',
    name: 'get_current_time',
    displayName: '当前时间',
    description:
      'Get current date and time in Chinese locale. Input can be empty.',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'get_current_time' },
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    tags: ['builtin', 'time'],
  },
  {
    id: 'builtin_calculator',
    name: 'calculator',
    displayName: '计算器',
    description:
      'Calculate arithmetic expressions with + - * / and parentheses. Input should be a plain math expression.',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'calculator' },
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description:
            'A plain arithmetic expression using +, -, *, / and parentheses.',
        },
      },
      required: ['expression'],
      additionalProperties: false,
    },
    tags: ['builtin', 'math'],
  },
]

const BUILTIN_TOOL_IDS = BUILTIN_TOOL_DEFINITIONS.map(tool => tool.id)

function builtinKeyFromRaw(raw: {
  endpoint?: unknown
  id?: string
  name?: string
}): BuiltinToolKey | null {
  const endpoint = asRecord(raw.endpoint)
  const configured =
    typeof endpoint.builtin === 'string'
      ? endpoint.builtin
      : typeof endpoint.tool === 'string'
        ? endpoint.tool
        : ''

  const candidate = configured || raw.name || raw.id || ''
  if (candidate === 'get_current_time') return 'get_current_time'
  if (candidate === 'calculator') return 'calculator'
  if (candidate === 'builtin_get_current_time') return 'get_current_time'
  if (candidate === 'builtin_calculator') return 'calculator'
  return null
}

function normalizeToolInput(args: unknown): string {
  if (typeof args === 'string') return args
  if (typeof args === 'number' || typeof args === 'boolean') return String(args)

  if (args && typeof args === 'object') {
    const obj = args as Record<string, unknown>
    for (const key of ['expression', 'input', 'query', 'text', 'value']) {
      if (typeof obj[key] === 'string' && obj[key].trim()) return obj[key]
    }
    return JSON.stringify(obj)
  }

  return ''
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
    if (a === undefined || b === undefined) {
      throw new Error('Invalid expression')
    }

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

function calculate(input: unknown) {
  const expression = extractExpression(normalizeToolInput(input))
  if (!expression) return '计算失败，请提供可计算表达式。'

  try {
    const tokens = tokenize(expression)
    const rpn = toRpn(tokens)
    const result = evalRpn(rpn)
    return `计算结果：${result}`
  } catch (error) {
    logger.warn({
      msg: 'Calculator builtin tool error',
      expression,
      err: error instanceof Error ? error.message : String(error),
    })
    return '计算失败，请检查表达式格式。'
  }
}

export function buildBuiltinTool(
  raw: {
    id?: string
    name?: string
    displayName?: string
    description?: string
    endpoint?: unknown
    parameters?: unknown
  },
  persistence?: AgentRunPersistence
): Tool | null {
  const builtin = builtinKeyFromRaw(raw)
  if (!builtin) return null

  const definition = BUILTIN_TOOL_DEFINITIONS.find(item => item.name === builtin)
  const parameters = asRecord(raw.parameters)

  return tool({
    name: definition?.name || builtin,
    description: raw.description || definition?.description || builtin,
    parameters: Object.keys(parameters).length
      ? (parameters as any)
      : ((definition?.parameters ?? {}) as any),
    strict: false,
    async execute(input) {
      await persistence?.event('tool_builtin_start', {
        toolId: raw.id,
        toolName: raw.name || builtin,
      })

      const output =
        builtin === 'get_current_time'
          ? `当前时间：${new Intl.DateTimeFormat('zh-CN', {
              dateStyle: 'full',
              timeStyle: 'medium',
            }).format(new Date())}`
          : calculate(input)

      await persistence?.event('tool_builtin_end', {
        toolId: raw.id,
        toolName: raw.name || builtin,
      })

      return output
    },
  })
}

export async function ensureBuiltinTools(options?: {
  attachToExistingAgents?: boolean
}) {
  for (const definition of BUILTIN_TOOL_DEFINITIONS) {
    await prisma.tool.upsert({
      where: { id: definition.id },
      create: {
        id: definition.id,
        name: definition.name,
        displayName: definition.displayName,
        description: definition.description,
        type: 'invokable',
        category: definition.category,
        endpoint: definition.endpoint as any,
        parameters: definition.parameters as any,
        responseTransform: {},
        enabled: true,
        version: '1.0.0',
        tags: definition.tags as any,
      },
      update: {
        name: definition.name,
        displayName: definition.displayName,
        description: definition.description,
        type: 'invokable',
        category: definition.category,
        endpoint: definition.endpoint as any,
        parameters: definition.parameters as any,
        responseTransform: {},
        enabled: true,
        version: '1.0.0',
        tags: definition.tags as any,
      },
    })
  }

  if (options?.attachToExistingAgents) {
    const agents = await prisma.agent.findMany({
      where: { status: { not: 'archived' } },
      select: { id: true },
    })

    for (const agent of agents) {
      await attachBuiltinToolsToAgent(agent.id)
    }
  }
}

export async function attachBuiltinToolsToAgent(agentId: string) {
  await prisma.agentTool.createMany({
    data: BUILTIN_TOOL_IDS.map((toolId, index) => ({
      agentId,
      toolId,
      enabled: true,
      sortOrder: index,
    })),
    skipDuplicates: true,
  })
}
