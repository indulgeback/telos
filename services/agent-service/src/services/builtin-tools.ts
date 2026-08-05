import { tool, type Tool } from '@openai/agents'
import { logger } from '../config/index.js'
import { asRecord } from '../utils/json.js'
import { prisma } from './db.js'
import type { AgentRunPersistence } from './persistence.js'
import { executeCode, executeWorkspaceCommand } from './sandbox.js'
import { retrieveMemories } from './memory.js'
import { WorkspaceManager, virtualReaddir } from './workspace.js'
import path from 'path'
import fs from 'fs'
import { executeGenerateImage } from './image-generator.js'
import { exec } from 'child_process'

type BuiltinToolKey =
  | 'get_current_time'
  | 'calculator'
  | 'code_interpreter'
  | 'search_memory'
  | 'list_directory'
  | 'view_file'
  | 'write_file'
  | 'patch_file'
  | 'grep_search'
  | 'file_search'
  | 'run_command'
  | 'web_search'
  | 'generate_image'

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
  {
    id: 'builtin_code_interpreter',
    name: 'code_interpreter',
    displayName: '代码执行沙箱',
    description:
      '安全执行 JavaScript 或 Python 代码，并返回标准输出、标准错误和退出状态。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'code_interpreter' },
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要执行的完整源代码（JavaScript 或 Python）。',
        },
        language: {
          type: 'string',
          description: '代码的编程语言（javascript 或 python）。',
        },
      },
      required: ['code', 'language'],
      additionalProperties: false,
    },
    tags: ['builtin', 'sandbox', 'code'],
  },
  {
    id: 'builtin_search_memory',
    name: 'search_memory',
    displayName: '长期记忆检索',
    description:
      '当需要获取用户的长期偏好、习惯、特定指示、特殊要求或过往对话历史和背景时调用此工具。输入 query 应当是明确的语义检索词（例如“用户喜欢吃什么”）。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'search_memory' },
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '用于检索历史长期记忆的语义查询词',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    tags: ['builtin', 'memory'],
  },
  {
    id: 'builtin_list_directory',
    name: 'list_directory',
    displayName: '列出目录',
    description: '列出指定目录下的子文件和子目录列表。如果不传路径，默认列出工作区根目录。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'list_directory' },
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要列出的目录路径（建议传入工作区内的相对路径，默认为 \'.\'）',
        },
      },
      additionalProperties: false,
    },
    tags: ['builtin', 'fs'],
  },
  {
    id: 'builtin_view_file',
    name: 'view_file',
    displayName: '查看文件',
    description: '只读查看指定文件的全部或部分行内容（行号从 1 开始）。查看前会自动确保本地存在该文件的缓存。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'view_file' },
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径（建议传入工作区内的相对路径）',
        },
        start_line: {
          type: 'number',
          description: '开始行号（可选，从 1 开始）',
        },
        end_line: {
          type: 'number',
          description: '结束行号（可选）',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    tags: ['builtin', 'fs'],
  },
  {
    id: 'builtin_write_file',
    name: 'write_file',
    displayName: '新建文件',
    description: '在指定路径新建文件并写入内容。若文件已存在则会覆盖。写入后会自动实时同步到云存储。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'write_file' },
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '新建文件的路径（建议传入工作区内的相对路径）',
        },
        content: {
          type: 'string',
          description: '要写入的完整文本内容',
        },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
    tags: ['builtin', 'fs'],
  },
  {
    id: 'builtin_patch_file',
    name: 'patch_file',
    displayName: '修改文件',
    description: '通过精确字符串匹配和替换来局部修改现有文件。如果 old_content 在文件中不存在或者不唯一，将会报错。修改完成后会自动实时同步到云存储。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'patch_file' },
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '要修改的文件路径（建议传入工作区内的相对路径）',
        },
        old_content: {
          type: 'string',
          description: '要替换的旧文本内容，必须是文件中精确且唯一的字串',
        },
        new_content: {
          type: 'string',
          description: '替换后的新文本内容',
        },
      },
      required: ['path', 'old_content', 'new_content'],
      additionalProperties: false,
    },
    tags: ['builtin', 'fs'],
  },
  {
    id: 'builtin_grep_search',
    name: 'grep_search',
    displayName: '文本检索',
    description: '在工作区的所有代码文本文件中递归搜索匹配的文本或正则表达式。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'grep_search' },
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '要搜索的正则表达式模式或字符串（如 “function getUser”）',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    tags: ['builtin', 'search'],
  },
  {
    id: 'builtin_file_search',
    name: 'file_search',
    displayName: '文件搜索',
    description: '在工作区内查找匹配文件名模式（如 glob 模式：*.tsx，*repo* 等）的文件相对路径。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'file_search' },
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: '搜索的文件名模式（如 *.json、auth、main.go 等）',
        },
      },
      required: ['pattern'],
      additionalProperties: false,
    },
    tags: ['builtin', 'search'],
  },
  {
    id: 'builtin_run_command',
    name: 'run_command',
    displayName: '运行命令',
    description: '在宿主机工作区根目录下执行指定的 shell 终端命令，并返回其标准输出与错误。最多允许执行 30 秒。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'run_command' },
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的完整 shell 命令（如 pnpm test，go test ./... 等）',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
    tags: ['builtin', 'terminal'],
  },
  {
    id: 'builtin_web_search',
    name: 'web_search',
    displayName: '网络搜索',
    description: '使用 Tavily API 查询实时互联网的最新信息、第三方文档、API 说明等。输入 query 应为详细清晰的语义搜索词。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'web_search' },
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '在互联网上搜索的查询语句（建议用详细句式提问）',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    tags: ['builtin', 'search'],
  },
  {
    id: 'builtin_generate_image',
    name: 'generate_image',
    displayName: '生成图像',
    description:
      '根据文本描述生成或编辑图像。支持两种模式：\n' +
      '1. **文生图（Text-to-Image）**：仅提供 prompt，从文字描述生成全新图像。\n' +
      '2. **图生图（Image-to-Image）**：提供 input_image_url + prompt，对已有图像进行风格迁移、局部编辑、换装、换背景等变换。\n' +
      '生图成功后，你必须在最终回复中以 `![图片描述](图片直链URL)` 的 Markdown 格式将其直接渲染在聊天中，以便用户可以直接看到预览图，不要仅提供普通的超链接。',
    category: 'builtin',
    endpoint: { kind: 'builtin', builtin: 'generate_image' },
    parameters: {
      type: 'object',
      required: ['prompt'],
      properties: {
        prompt: {
          type: 'string',
          description: '图像英文文本描述。文生图模式下详细说明服装、材质、风格、氛围、光线；图生图模式下描述希望对输入图像进行的变换或编辑指令。',
        },
        input_image_url: {
          type: 'string',
          description: '可选参数。提供一张输入图像的 URL 进入图生图模式。模型将基于此图像 + prompt 生成变换后的新图像。适用于风格迁移、换装、局部编辑、背景替换等场景。',
        },
        style_preset: {
          type: 'string',
          enum: ['photo_realistic', 'illustration', 'vibe_card', 'moodboard', 'sketch'],
          description: '视觉风格预设。默认为 photo_realistic。',
          default: 'photo_realistic',
        },
        aspect_ratio: {
          type: 'string',
          enum: ['1:1', '9:16', '16:9', '4:3', '3:4'],
          description: '图像比例。9:16 适合故事/氛围卡片，1:1 适合 feed 流展示。',
          default: '9:16',
        },
        reference_image_urls: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 4,
          description: '可选参数。用于引导风格、颜色或构图的参考图 URL 数组（与 input_image_url 不同，参考图仅作风格参考而非编辑对象）。',
        },
        negative_prompt: {
          type: 'string',
          description: '要在输出中避免的视觉元素。',
        },
        model: {
          type: 'string',
          enum: ['gemini', 'gpt-image-2'],
          description: '指定使用的图像生成模型。默认为 gemini。如果在需要生成带有精确文本、电商海报、促销文字的画面时，强烈建议使用 gpt-image-2。',
          default: 'gemini',
        },
      },
      additionalProperties: false,
    },
    tags: ['builtin', 'media'],
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
  if (candidate === 'code_interpreter') return 'code_interpreter'
  if (candidate === 'search_memory') return 'search_memory'
  if (candidate === 'list_directory') return 'list_directory'
  if (candidate === 'view_file') return 'view_file'
  if (candidate === 'write_file') return 'write_file'
  if (candidate === 'patch_file') return 'patch_file'
  if (candidate === 'grep_search') return 'grep_search'
  if (candidate === 'file_search') return 'file_search'
  if (candidate === 'run_command') return 'run_command'
  if (candidate === 'web_search') return 'web_search'
  if (candidate === 'generate_image') return 'generate_image'
  if (candidate === 'builtin_get_current_time') return 'get_current_time'
  if (candidate === 'builtin_calculator') return 'calculator'
  if (candidate === 'builtin_code_interpreter') return 'code_interpreter'
  if (candidate === 'builtin_search_memory') return 'search_memory'
  if (candidate === 'builtin_list_directory') return 'list_directory'
  if (candidate === 'builtin_view_file') return 'view_file'
  if (candidate === 'builtin_write_file') return 'write_file'
  if (candidate === 'builtin_patch_file') return 'patch_file'
  if (candidate === 'builtin_grep_search') return 'grep_search'
  if (candidate === 'builtin_file_search') return 'file_search'
  if (candidate === 'builtin_run_command') return 'run_command'
  if (candidate === 'builtin_web_search') return 'web_search'
  if (candidate === 'builtin_generate_image') return 'generate_image'
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

      let output = ''
      if (builtin === 'get_current_time') {
        output = `当前时间：${new Intl.DateTimeFormat('zh-CN', {
          dateStyle: 'full',
          timeStyle: 'medium',
        }).format(new Date())}`
      } else if (builtin === 'calculator') {
        output = calculate(input)
      } else if (builtin === 'code_interpreter') {
        const rawInput = asRecord(input)
        const code = String(rawInput.code || '')
        const language = String(rawInput.language || 'javascript') as 'javascript' | 'python'
        
        const res = await executeCode(code, language)
        output = JSON.stringify({
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode
        })
      } else if (builtin === 'search_memory') {
        const rawInput = asRecord(input)
        const query = String(rawInput.query || '')
        
        let memories: string[] = []
        
        if (persistence && typeof (persistence as any).runId === 'string') {
          const runId = (persistence as any).runId
          const run = await prisma.agentRun.findUnique({
            where: { id: runId },
            include: {
              thread: true
            }
          })
          if (run && run.thread) {
            const agentId = run.agentId
            const ownerId = run.thread.ownerId
            memories = await retrieveMemories(agentId, ownerId, query)
          }
        }
        
        output = JSON.stringify({
          query,
          memories
        })
      } else if (
        builtin === 'list_directory' ||
        builtin === 'view_file' ||
        builtin === 'write_file' ||
        builtin === 'patch_file' ||
        builtin === 'grep_search' ||
        builtin === 'file_search' ||
        builtin === 'run_command' ||
        builtin === 'web_search' ||
        builtin === 'generate_image'
      ) {
        let threadId = 'default'
        if (persistence && typeof (persistence as any).runId === 'string') {
          const runId = (persistence as any).runId
          const run = await prisma.agentRun.findUnique({
            where: { id: runId },
            select: { threadId: true }
          })
          if (run && run.threadId) {
            threadId = run.threadId
          }
        }

        if (builtin === 'list_directory') {
          const rawInput = asRecord(input)
          const targetPath = String(rawInput.path || '.')
          const resolvedPath = WorkspaceManager.resolvePath(threadId, targetPath)
          const relPath = path.relative(WorkspaceManager.getWorkspacePath(threadId), resolvedPath)

          const allFiles = await WorkspaceManager.listFiles(threadId)
          const items = virtualReaddir(allFiles, relPath)
          output = JSON.stringify({
            path: targetPath,
            items: items.map((item) => ({
              name: item.name,
              type: item.isDirectory ? 'directory' : 'file',
            })),
          })
        } else if (builtin === 'view_file') {
          const rawInput = asRecord(input)
          const filePath = String(rawInput.path || '')
          if (!filePath) {
            output = '错误：必须提供 path 参数。'
          } else {
            const resolvedPath = WorkspaceManager.resolvePath(threadId, filePath)
            const relPath = path.relative(WorkspaceManager.getWorkspacePath(threadId), resolvedPath)
            const localPath = await WorkspaceManager.ensureFileCached(threadId, relPath)
            if (!localPath) {
              output = `错误：找不到文件或无法从云存储拉取: ${filePath}`
            } else {
              const content = await fs.promises.readFile(localPath, 'utf-8')
              const lines = content.split('\n')
              const totalLines = lines.length

              const startLine = rawInput.start_line ? Number(rawInput.start_line) : 1
              const endLine = rawInput.end_line ? Number(rawInput.end_line) : totalLines
              
              if (isNaN(startLine) || isNaN(endLine) || startLine < 1 || endLine < startLine) {
                output = `错误：起止行号无效（总行数：${totalLines}）。`
              } else {
                const slicedLines = lines.slice(startLine - 1, endLine)
                output = JSON.stringify({
                  path: filePath,
                  totalLines,
                  startLine,
                  endLine,
                  content: slicedLines.join('\n'),
                })
              }
            }
          }
        } else if (builtin === 'write_file') {
          const rawInput = asRecord(input)
          const filePath = String(rawInput.path || '')
          const content = String(rawInput.content || '')
          if (!filePath) {
            output = '错误：必须提供 path 参数。'
          } else {
            const resolvedPath = WorkspaceManager.resolvePath(threadId, filePath)
            const relPath = path.relative(WorkspaceManager.getWorkspacePath(threadId), resolvedPath)
            const parentDir = path.dirname(resolvedPath)
            if (!fs.existsSync(parentDir)) {
              fs.mkdirSync(parentDir, { recursive: true })
            }
            await fs.promises.writeFile(resolvedPath, content, 'utf-8')
            const ok = await WorkspaceManager.syncFileToCloud(threadId, relPath)
            if (ok) {
              const url = WorkspaceManager.getFileUrl(threadId, relPath)
              output = `文件已成功写入本地并同步至云端: ${filePath}\n云存储下载直链 (可分享给用户浏览器访问): ${url}`
            } else {
              output = `文件写入本地成功，但同步到云存储失败: ${filePath}`
            }
          }
        } else if (builtin === 'patch_file') {
          const rawInput = asRecord(input)
          const filePath = String(rawInput.path || '')
          const oldContent = String(rawInput.old_content || '')
          const newContent = String(rawInput.new_content || '')
          if (!filePath) {
            output = '错误：必须提供 path 参数。'
          } else {
            const resolvedPath = WorkspaceManager.resolvePath(threadId, filePath)
            const relPath = path.relative(WorkspaceManager.getWorkspacePath(threadId), resolvedPath)
            const localPath = await WorkspaceManager.ensureFileCached(threadId, relPath)
            if (!localPath) {
              output = `错误：找不到文件或无法从云存储拉取: ${filePath}`
            } else {
              const content = await fs.promises.readFile(localPath, 'utf-8')
              const occurrences = content.split(oldContent).length - 1
              if (occurrences === 0) {
                output = `修改失败：在文件 '${filePath}' 中未找到匹配的 old_content。请提供完全一致的旧文本内容。`
              } else if (occurrences > 1) {
                output = `修改失败：old_content 在文件 '${filePath}' 中匹配到 ${occurrences} 次，不唯一。请提供更长、更具唯一性的上下文来匹配。`
              } else {
                const updatedContent = content.replace(oldContent, newContent)
                await fs.promises.writeFile(localPath, updatedContent, 'utf-8')
                const ok = await WorkspaceManager.syncFileToCloud(threadId, relPath)
                if (ok) {
                  const url = WorkspaceManager.getFileUrl(threadId, relPath)
                  output = `文件修改成功并已同步到云端: ${filePath}\n云存储下载直链 (可分享给用户浏览器访问): ${url}`
                } else {
                  output = `文件修改成功，但同步到云端失败: ${filePath}`
                }
              }
            }
          }
        } else if (builtin === 'grep_search') {
          const rawInput = asRecord(input)
          const query = String(rawInput.query || '')
          if (!query) {
            output = '错误：必须提供 query 参数。'
          } else {
            await WorkspaceManager.ensureAllFilesCached(threadId)
            const localRoot = WorkspaceManager.getWorkspacePath(threadId)
            const results: { file: string; line: number; content: string }[] = []
            
            let regex: RegExp
            try {
              regex = new RegExp(query, 'i')
            } catch {
              const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              regex = new RegExp(escaped, 'i')
            }

            const searchDir = (dir: string) => {
              if (!fs.existsSync(dir)) return
              const entries = fs.readdirSync(dir, { withFileTypes: true })
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                const relPath = path.relative(localRoot, fullPath)
                
                if (
                  entry.name === 'node_modules' ||
                  entry.name === '.git' ||
                  entry.name === 'dist' ||
                  entry.name === '.persisted-workspaces' ||
                  entry.name === '.workspaces'
                ) {
                  continue
                }

                if (entry.isDirectory()) {
                  searchDir(fullPath)
                } else if (entry.isFile()) {
                  const ext = path.extname(entry.name).toLowerCase()
                  const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.go', '.rs', '.py', '.java', '.c', '.cpp', '.h', '.sh', '.yaml', '.yml', '.toml', '.proto', '.css', '.html', '.prisma']
                  if (textExtensions.includes(ext) || entry.name.startsWith('.') || entry.name === 'Dockerfile' || entry.name === 'Makefile') {
                    try {
                      const text = fs.readFileSync(fullPath, 'utf-8')
                      const lines = text.split('\n')
                      for (let i = 0; i < lines.length; i++) {
                        if (regex.test(lines[i])) {
                          results.push({
                            file: relPath,
                            line: i + 1,
                            content: lines[i].trim(),
                          })
                          if (results.length >= 100) break
                        }
                      }
                    } catch (e) {}
                  }
                }
                if (results.length >= 100) break
              }
            }

            searchDir(localRoot)
            output = JSON.stringify({
              query,
              totalMatches: results.length,
              results: results.slice(0, 50),
            })
          }
        } else if (builtin === 'file_search') {
          const rawInput = asRecord(input)
          const pattern = String(rawInput.pattern || '')
          if (!pattern) {
            output = '错误：必须提供 pattern 参数。'
          } else {
            const allFiles = await WorkspaceManager.listFiles(threadId)
            const escapedPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
            const regex = new RegExp(escapedPattern, 'i')
            const matched = allFiles.filter((file) => regex.test(file))
            output = JSON.stringify({
              pattern,
              matches: matched.slice(0, 100),
            })
          }
        } else if (builtin === 'run_command') {
          const rawInput = asRecord(input)
          const command = String(rawInput.command || '')
          if (!command) {
            output = '错误：必须提供 command 参数。'
          } else {
            await WorkspaceManager.ensureAllFilesCached(threadId)
            const localRoot = WorkspaceManager.ensureWorkspaceDir(threadId)
            output = await new Promise<string>((resolve) => {
              exec(
                command,
                {
                  cwd: localRoot,
                  timeout: 30000,
                  env: {
                    ...process.env,
                    PATH: `/Applications/Docker.app/Contents/Resources/bin:${process.env.PATH || ''}`
                  }
                },
                (err, stdout, stderr) => {
                  const res = {
                    stdout: stdout.toString(),
                    stderr: stderr.toString(),
                    exitCode: err ? err.code : 0,
                    timedOut: err && (err as any).killed ? true : false,
                  }
                  
                  void (async () => {
                    try {
                      const scanAndSync = async (dir: string) => {
                        if (!fs.existsSync(dir)) return
                        const entries = fs.readdirSync(dir, { withFileTypes: true })
                        for (const entry of entries) {
                          const fullPath = path.join(dir, entry.name)
                          const relPath = path.relative(localRoot, fullPath)
                          
                          if (
                            entry.name === 'node_modules' ||
                            entry.name === '.git' ||
                            entry.name === 'dist' ||
                            entry.name === '.persisted-workspaces' ||
                            entry.name === '.workspaces'
                          ) {
                            continue
                          }
                          
                          if (entry.isDirectory()) {
                            await scanAndSync(fullPath)
                          } else if (entry.isFile()) {
                            await WorkspaceManager.syncFileToCloud(threadId, relPath)
                          }
                        }
                      }
                      await scanAndSync(localRoot)
                    } catch (syncErr) {
                      logger.error({ msg: 'Failed to sync back files after run_command', syncErr })
                    }
                  })()

                  resolve(JSON.stringify(res))
                }
              )
            })
          }
        } else if (builtin === 'web_search') {
          const rawInput = asRecord(input)
          const query = String(rawInput.query || '')
          const apiKey = process.env.TAVILY_API_KEY
          
          if (!apiKey) {
            output = '错误：当前系统未配置 TAVILY_API_KEY 环境变量，无法执行网页搜索。请联系系统管理员或在 .env 文件中进行配置。'
          } else if (!query) {
            output = '错误：必须提供 query 参数。'
          } else {
            try {
              const res = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                },
                body: JSON.stringify({
                  api_key: apiKey,
                  query,
                  search_depth: 'basic',
                  include_answer: false,
                }),
              })
              
              if (!res.ok) {
                const errText = await res.text()
                output = `错误：Tavily 搜索请求失败（状态码 ${res.status}）：${errText}`
              } else {
                const data = await res.json() as {
                  results?: { title: string; url: string; content: string }[]
                }
                const searchResults = data.results || []
                if (searchResults.length === 0) {
                  output = `网页搜索没有找到与 "${query}" 相关的结果。`
                } else {
                  const formatted = searchResults.map((item, index) => {
                    return `[${index + 1}] 标题: ${item.title}\n    链接: ${item.url}\n    摘要: ${item.content}`
                  }).join('\n\n')
                  output = `搜索查询: "${query}"\n\n结果:\n\n${formatted}`
                }
              }
            } catch (e: any) {
              output = `错误：发送网页搜索请求时抛出异常：${e.message}`
            }
          }
        } else if (builtin === 'generate_image') {
          const rawInput = asRecord(input)
          const prompt = String(rawInput.prompt || '')
          if (!prompt) {
            output = '错误：必须提供 prompt 参数。'
          } else {
            const style_preset = rawInput.style_preset ? String(rawInput.style_preset) : undefined
            const aspect_ratio = rawInput.aspect_ratio ? String(rawInput.aspect_ratio) : undefined
            const negative_prompt = rawInput.negative_prompt ? String(rawInput.negative_prompt) : undefined
            const input_image_url = rawInput.input_image_url ? String(rawInput.input_image_url) : undefined
            const model = rawInput.model ? String(rawInput.model) as 'gemini' | 'gpt-image-2' : undefined
            
            const reference_image_urls: string[] = []
            if (Array.isArray(rawInput.reference_image_urls)) {
              for (const item of rawInput.reference_image_urls) {
                if (typeof item === 'string') {
                  reference_image_urls.push(item)
                }
              }
            }

            const genResult = await executeGenerateImage({
              prompt,
              style_preset,
              aspect_ratio,
              reference_image_urls,
              negative_prompt,
              input_image_url,
              model,
            }, threadId)

            const modeLabel = input_image_url ? '图生图' : '文生图'
            if (genResult.success) {
              output = `${modeLabel}成功！\n云存储图片直链 (可直接在浏览器中打开或向用户展示): ${genResult.image_url}\n\n【生成配置信息】\n- 模式: ${modeLabel}\n- 所用提示词: ${genResult.metadata.prompt_used}\n- 图像比例: ${genResult.metadata.aspect_ratio}\n- 生成耗时: ${genResult.metadata.latency_ms} ms`
            } else {
              output = `${modeLabel}失败。错误信息: ${genResult.error}`
            }
          }
        }
      }


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

/**
 * 默认绑定到所有 agent 的内置技能 name 列表。
 * 这些技能不在商店展示(metadata.builtin/hidden),但每个 agent 创建时自动绑定,
 * 用户无需手动绑定即可通过 $skill-name 触发。
 */
export const BUILTIN_SKILL_NAMES = ['skill-creator']

/**
 * 把所有内置技能(skill-creator 等)绑定到指定 agent。
 * 在 agent 创建时调用,幂等(skipDuplicates)。
 */
export async function attachBuiltinSkillsToAgent(agentId: string) {
  // 查出内置技能的 id(metadata.builtin = true 的系统技能)
  const builtinSkills = await prisma.skill.findMany({
    where: { ownerId: null, enabled: true },
    select: { id: true, name: true, metadata: true },
  })
  const targetSkillIds = builtinSkills
    .filter(s => {
      const meta = s.metadata as { builtin?: boolean; hidden?: boolean }
      return meta?.builtin === true && BUILTIN_SKILL_NAMES.includes(s.name)
    })
    .map(s => s.id)

  if (targetSkillIds.length === 0) return

  await prisma.agentSkill.createMany({
    data: targetSkillIds.map((skillId, index) => ({
      agentId,
      skillId,
      enabled: true,
      sortOrder: index,
    })),
    skipDuplicates: true,
  })
}
