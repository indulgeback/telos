import {
  Agent,
  MCPServerSSE,
  MCPServerStdio,
  MCPServerStreamableHttp,
  Runner,
  createMCPToolStaticFilter,
  tool,
  type Model,
  type AgentInputItem,
  type MCPServer,
  type Tool,
} from '@openai/agents'
import { OpenAIProvider } from '@openai/agents-openai'
import { routeTools } from './tool-router.js'
import { z } from 'zod'
import { prisma } from './db.js'
import { AgentRunPersistence } from './persistence.js'
import { config } from '../config/index.js'
import { asRecord, asStringArray, safeJsonStringify } from '../utils/json.js'
import { buildBuiltinTool } from './builtin-tools.js'
import { getGcloudAccessToken, getGcloudOpenAIBaseUrl } from './gcloud.js'
import { Prisma, Tool as DbTool, McpServer as DbMcpServer } from '@prisma/client'

export type LoadedAgent = Prisma.AgentGetPayload<{
  include: {
    skillsAsAgent: {
      include: { skill: true }
    }
    toolsAsAgent: {
      include: { tool: true }
    }
    mcpServersAsAgent: {
      include: { mcpServer: true }
    }
    subagentsAsParent: {
      include: { subagent: true }
    }
  }
}>

export type LoadedTool = DbTool

export type LoadedMcpServer = DbMcpServer

export interface RuntimeBuildResult {
  agent: Agent
  source: LoadedAgent
}

export interface RuntimeRunOptions {
  runId: string
  input: string | AgentInputItem[]
  threadId?: string | null
  stream?: boolean
  signal?: AbortSignal
  modelOverride?: string | null
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | null
  memoryInstructions?: string
  onEvent?: (event: {
    type: 'tool_start' | 'tool_end' | 'handoff'
    agentName?: string | null
    payload: Record<string, unknown>
  }) => void
}

type RuntimeProvider =
  | 'openai'
  | 'deepseek'
  | 'seed'
  | 'bailian'
  | 'gcloud'
  | 'shortapi'

interface RuntimeModelResolution {
  model: Model
  modelKey: string
  provider: RuntimeProvider
  providerData: Record<string, unknown>
}

function toToolName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

function fillTemplate(template: string, input: Record<string, unknown>) {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = input[key.trim()]
    return value === undefined || value === null ? '' : String(value)
  })
}

function resolveEnv(envConfig: unknown): Record<string, string> {
  const env = asRecord(envConfig)
  const resolved: Record<string, string> = {}

  Object.entries(env).forEach(([key, value]) => {
    if (typeof value !== 'string') return
    resolved[key] = process.env[value] ?? ''
  })

  return resolved
}

function extractText(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (!raw || typeof raw !== 'object') return ''

  const message = raw as {
    content?: unknown
    parts?: Array<{ type?: string; text?: string }>
  }

  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(part => part.type === 'text' && typeof part.text === 'string')
      .map(part => part.text)
      .join('')
  }
  return ''
}

export function extractPromptFromBody(body: Record<string, unknown>): string {
  const explicit = extractText(body.message)
  if (explicit.trim()) return explicit.trim()

  const messages = Array.isArray(body.messages) ? body.messages : []
  const lastUser =
    [...messages].reverse().find(raw => {
      return (
        raw &&
        typeof raw === 'object' &&
        (raw as { role?: unknown }).role === 'user'
      )
    }) ?? messages[messages.length - 1]

  return extractText(lastUser).trim()
}

function buildEndpointTool(raw: LoadedTool, persistence?: AgentRunPersistence) {
  const builtinTool = buildBuiltinTool(raw, persistence)
  if (builtinTool) return builtinTool

  const endpoint = asRecord(raw.endpoint)
  const responseTransform = asRecord(raw.responseTransform)
  const parameters = asRecord(raw.parameters)

  return tool({
    name: toToolName(raw.name || raw.id),
    description: raw.description || raw.displayName || raw.name,
    parameters: Object.keys(parameters).length
      ? (parameters as any)
      : undefined,
    strict: false,
    async execute(input) {
      const inputRecord = asRecord(input)
      const urlTemplate =
        typeof endpoint.url_template === 'string'
          ? endpoint.url_template
          : typeof endpoint.urlTemplate === 'string'
            ? endpoint.urlTemplate
            : ''
      if (!urlTemplate) {
        return 'Tool endpoint is missing url_template.'
      }

      const method =
        typeof endpoint.method === 'string'
          ? endpoint.method.toUpperCase()
          : 'GET'
      const headers = asRecord(endpoint.headers)
      const url = fillTemplate(urlTemplate, inputRecord)
      const timeout =
        typeof endpoint.timeout === 'number' ? endpoint.timeout : 15000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const bodyTemplate =
        typeof endpoint.body_template === 'string'
          ? endpoint.body_template
          : typeof endpoint.bodyTemplate === 'string'
            ? endpoint.bodyTemplate
            : undefined

      await persistence?.event('tool_http_request', {
        toolId: raw.id,
        toolName: raw.name,
        method,
        url,
      })

      try {
        const response = await fetch(url, {
          method,
          headers: headers as Record<string, string>,
          body:
            method === 'GET' || method === 'HEAD'
              ? undefined
              : bodyTemplate
                ? fillTemplate(bodyTemplate, inputRecord)
                : JSON.stringify(inputRecord),
          signal: controller.signal,
        })
        const contentType = response.headers.get('content-type') || ''
        const output = contentType.includes('application/json')
          ? await response.json()
          : await response.text()
        const formatted =
          responseTransform.format === 'json'
            ? safeJsonStringify(output)
            : typeof output === 'string'
              ? output
              : safeJsonStringify(output)

        await persistence?.event('tool_http_response', {
          toolId: raw.id,
          toolName: raw.name,
          status: response.status,
        })

        return responseTransform.wrapper_text
          ? fillTemplate(String(responseTransform.wrapper_text), {
              output: formatted,
            })
          : formatted
      } finally {
        clearTimeout(timeoutId)
      }
    },
  })
}

function buildMcpServer(
  raw: LoadedMcpServer,
  allowedTools: string[]
): MCPServer | null {
  const toolFilter = createMCPToolStaticFilter({
    allowed: allowedTools.length ? allowedTools : undefined,
  })
  const name = raw.name as string
  const timeout = 30000

  if (raw.transport === 'stdio') {
    if (!raw.command) return null
    return new MCPServerStdio({
      name,
      command: raw.command,
      args: asStringArray(raw.args),
      env: resolveEnv(raw.env),
      cacheToolsList: true,
      toolFilter,
      timeout,
    })
  }

  if (raw.transport === 'streamable_http') {
    if (!raw.url) return null
    return new MCPServerStreamableHttp({
      name,
      url: raw.url,
      cacheToolsList: true,
      toolFilter,
      timeout,
    })
  }

  if (raw.transport === 'sse') {
    if (!raw.url) return null
    return new MCPServerSSE({
      name,
      url: raw.url,
      cacheToolsList: true,
      toolFilter,
      timeout,
    })
  }

  return null
}

function normalizeRuntimeProvider(value: unknown): RuntimeProvider {
  if (
    value === 'deepseek' ||
    value === 'seed' ||
    value === 'bailian' ||
    value === 'gcloud' ||
    value === 'shortapi'
  ) {
    return value
  }
  return 'openai'
}

function inferProviderFromModel(modelKey: string): RuntimeProvider {
  if (modelKey.startsWith('deepseek-')) return 'deepseek'
  if (modelKey.startsWith('doubao-') || modelKey.startsWith('glm-'))
    return 'seed'
  if (modelKey.startsWith('qwen')) return 'bailian'
  if (modelKey.startsWith('gemini-') || modelKey.startsWith('google/gemini-'))
    return 'gcloud'
  if (modelKey.startsWith('openai/')) return 'shortapi'
  return 'openai'
}

function providerConfig(provider: RuntimeProvider) {
  switch (provider) {
    case 'deepseek':
      return {
        apiKey: config.deepseekApiKey,
        baseURL: config.deepseekBaseUrl,
        missingMessage: 'DEEPSEEK_API_KEY is required for DeepSeek agent runs',
      }
    case 'seed':
      return {
        apiKey: config.seedApiKey,
        baseURL: config.seedBaseUrl,
        missingMessage: 'SEED_API_KEY is required for Seed agent runs',
      }
    case 'bailian':
      return {
        apiKey: config.bailianApiKey,
        baseURL: config.bailianBaseUrl,
        missingMessage: 'BAILIAN_API_KEY is required for Bailian agent runs',
      }
    case 'shortapi':
      return {
        apiKey: config.shortapiApiKey,
        baseURL: config.shortapiBaseUrl,
        missingMessage: 'SHORTAPI_API_KEY is required for ShortAPI agent runs',
      }
    case 'gcloud':
      return {
        apiKey: getGcloudAccessToken(),
        baseURL: getGcloudOpenAIBaseUrl(),
        missingMessage:
          'Google Cloud authentication is required for Gemini agent runs',
      }
    case 'openai':
    default:
      return {
        apiKey: config.openaiApiKey,
        baseURL: config.openaiBaseUrl || undefined,
        missingMessage: 'OPENAI_API_KEY is required for OpenAI agent runs',
      }
  }
}

function buildProviderData(
  provider: RuntimeProvider,
  reasoningEffort?: RuntimeRunOptions['reasoningEffort']
) {
  const effort = reasoningEffort ?? 'medium'
  if (provider === 'seed') {
    return {
      reasoning_effort: effort,
      ...(effort === 'minimal' ? { thinking: { type: 'disabled' } } : {}),
    }
  }
  if (provider === 'bailian') {
    return {
      enable_thinking: effort !== 'minimal',
    }
  }
  if (provider === 'gcloud') {
    return effort === 'minimal' ? {} : { reasoning_effort: effort }
  }
  return {}
}

export class AgentRuntimeService {
  async getDefaultAgentId() {
    const agent = await prisma.agent.findFirst({
      where: { isDefault: true, status: 'active' },
      select: { id: true },
    })
    return agent?.id ?? null
  }

  async loadAgent(agentId: string) {
    return prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        skillsAsAgent: {
          where: { enabled: true },
          orderBy: { sortOrder: 'asc' },
          include: { skill: true },
        },
        toolsAsAgent: {
          where: { enabled: true },
          include: { tool: true },
        },
        mcpServersAsAgent: {
          where: { enabled: true },
          include: { mcpServer: true },
        },
        subagentsAsParent: {
          where: { enabled: true },
          orderBy: { sortOrder: 'asc' },
          include: { subagent: true },
        },
      },
    }) as Promise<LoadedAgent | null>
  }

  async buildAgent(
    agentId: string,
    options?: {
      depth?: number
      path?: string[]
      persistence?: AgentRunPersistence
      modelOverride?: string | null
      reasoningEffort?: RuntimeRunOptions['reasoningEffort']
      memoryInstructions?: string
      query?: string
    }
  ): Promise<RuntimeBuildResult> {
    const depth = options?.depth ?? 0
    const path = options?.path ?? []

    if (depth > 2) {
      throw new Error('Subagent depth exceeds the maximum of 2')
    }
    if (path.includes(agentId)) {
      throw new Error('Circular subagent relation detected')
    }

    const source = await this.loadAgent(agentId)
    if (!source || source.status !== 'active') {
      throw new Error('Agent not found or inactive')
    }

    const skillBlocks = source.skillsAsAgent
      .filter((link: any) => link.skill?.enabled)
      .map((link: any) => {
        return `## Skill: ${link.skill.name}\n${link.skill.content}`
      })

    const relationDescriptions = source.subagentsAsParent.map(
      (relation: any) => {
        return `- ${relation.name || relation.subagent.name} (${relation.mode}): ${relation.description}`
      }
    )

    const instructions = [
      source.instructions || source.description,
      skillBlocks.length
        ? `# Available Skills\n${skillBlocks.join('\n\n')}`
        : '',
      relationDescriptions.length
        ? `# Available Subagents\n${relationDescriptions.join('\n')}`
        : '',
      depth === 0 ? options?.memoryInstructions : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    // 提取启用的常规工具和 MCP 服务器
    const rawTools = source.toolsAsAgent
      .filter((link: any) => link.tool?.enabled)
      .map((link: any) => link.tool)

    const rawMcpServers = source.mcpServersAsAgent
      .filter((link: any) => link.mcpServer?.enabled)
      .map((link: any) => {
        const serverAllowed = asStringArray(link.mcpServer.allowedTools)
        const linkAllowed = asStringArray(link.allowedTools)
        return {
          ...link.mcpServer,
          allowedTools: linkAllowed.length ? linkAllowed : serverAllowed
        }
      })

    // 根据最新 query 对工具进行动态语义过滤，限制首批加载数量在 5 个以内
    const query = options?.query
    let selectedTools = rawTools
    let selectedMcp = rawMcpServers
    let remainingTools: any[] = []
    let remainingMcp: any[] = []

    if (query && depth === 0) {
      const routed = await routeTools(query, rawTools, rawMcpServers)
      selectedTools = routed.selectedTools
      selectedMcp = routed.selectedMcp
      remainingTools = routed.remainingTools
      remainingMcp = routed.remainingMcp
    }

    const tools: Tool[] = selectedTools.map((t: any) => 
      buildEndpointTool(t, options?.persistence)
    )

    const handoffs: Agent[] = []

    for (const relation of source.subagentsAsParent) {
      const built = await this.buildAgent(relation.subagentId, {
        depth: depth + 1,
        path: [...path, agentId],
        persistence: options?.persistence,
        modelOverride: null,
        reasoningEffort: options?.reasoningEffort,
        memoryInstructions: '',
      })
      if (relation.mode === 'handoff') {
        handoffs.push(built.agent)
      } else {
        tools.push(
          built.agent.asTool({
            toolName: toToolName(relation.name || built.agent.name),
            toolDescription: relation.description || built.source.description,
          } as any)
        )
      }
    }

    const mcpServers = selectedMcp
      .map((link: any) => {
        return buildMcpServer(link, link.allowedTools)
      })
      .filter((server: MCPServer | null): server is MCPServer =>
        Boolean(server)
      )

    // 如果首批工具被截断过滤了，向主 Agent 动态注入 search_more_tools 和 execute_retrieved_tool 挂载闭环
    if (depth === 0 && (remainingTools.length > 0 || remainingMcp.length > 0)) {
      tools.push(
        tool({
          name: 'search_more_tools',
          description: '当需要的工具没有在当前的工具集中被加载时，可使用该工具通过语义查询来搜索并列出备选的工具（包含常规工具和MCP服务）。',
          parameters: z.object({
            query: z.string().describe('用于查找工具的搜索词或功能描述（如“数学计算”、“画图”等）'),
          }),
          async execute({ query: searchWord }: { query: string }) {
            const matchedTools = remainingTools.filter(t => 
              t.name.toLowerCase().includes(searchWord.toLowerCase()) || 
              t.description.toLowerCase().includes(searchWord.toLowerCase())
            )
            const matchedMcp = remainingMcp.filter(m => 
              m.name.toLowerCase().includes(searchWord.toLowerCase()) || 
              m.description.toLowerCase().includes(searchWord.toLowerCase())
            )

            if (matchedTools.length === 0 && matchedMcp.length === 0) {
              return '没有检索到匹配的备用工具。'
            }

            const toolInfoText = [
              matchedTools.length > 0 
                ? `### 备选常规工具：\n${matchedTools.map(t => `- name: "${t.name}"\n  description: "${t.description}"\n  parameters: ${JSON.stringify(t.parameters)}`).join('\n')}`
                : '',
              matchedMcp.length > 0
                ? `### 备选 MCP 服务器：\n${matchedMcp.map(m => `- name: "${m.name}"\n  description: "${m.description}"`).join('\n')}`
                : ''
            ].filter(Boolean).join('\n\n')

            return `检索到以下可以被动态调用的备选工具。如果你需要运行其中某个工具，请使用 execute_retrieved_tool 工具，并传入其 name 和所需的 toolArgs 参数。\n\n${toolInfoText}`
          }
        } as any)
      )

      tools.push(
        tool({
          name: 'execute_retrieved_tool',
          description: '执行通过 search_more_tools 检索到的备选常规工具。',
          parameters: z.object({
            toolName: z.string().describe('要执行的工具的 name'),
            toolArgs: z.record(z.string(), z.any()).describe('工具执行所需的 JSON 键值对参数'),
          }),
          async execute({ toolName, toolArgs }: { toolName: string; toolArgs: Record<string, any> }) {
            const targetTool = remainingTools.find(t => t.name === toolName)
            if (targetTool) {
              const executable = buildEndpointTool(targetTool, options?.persistence)
              if (executable) {
                try {
                  return await (executable as any).execute(toolArgs)
                } catch (err: any) {
                  return `执行工具 ${toolName} 失败: ${err.message}`
                }
              }
            }

            const targetMcp = remainingMcp.find(m => m.name === toolName)
            if (targetMcp) {
              return `抱歉，MCP 服务器 ${toolName} 暂不支持动态代理执行，请优先尝试其他常规工具。`
            }

            return `没有找到名字为 ${toolName} 的备选工具，请确认你传入的 toolName 是否正确。`
          }
        } as any)
      )
    }

    const resolvedModel = await this.resolveModel(
      options?.modelOverride || source.modelKey,
      options?.reasoningEffort
    )

    const agent = Agent.create({
      name: source.name,
      instructions,
      handoffDescription: source.description,
      model: resolvedModel.model,
      modelSettings: {
        temperature: source.temperature,
        providerData: resolvedModel.providerData,
      },
      tools,
      handoffs,
      mcpServers,
      mcpConfig: {
        convertSchemasToStrict: false,
      },
    } as any)

    return { agent, source }
  }

  async resolveModel(
    modelKey: string,
    reasoningEffort?: RuntimeRunOptions['reasoningEffort']
  ): Promise<RuntimeModelResolution> {
    const configuredModel = await prisma.chatModel.findUnique({
      where: { modelKey },
      select: { provider: true },
    })
    const provider = configuredModel
      ? normalizeRuntimeProvider(configuredModel.provider)
      : inferProviderFromModel(modelKey)
    const providerOptions = providerConfig(provider)
    if (!providerOptions.apiKey) {
      throw new Error(providerOptions.missingMessage)
    }

    const modelProvider = new OpenAIProvider({
      apiKey: providerOptions.apiKey,
      baseURL: providerOptions.baseURL,
      useResponses: false,
      strictFeatureValidation: false,
    })

    return {
      model: await modelProvider.getModel(modelKey),
      modelKey,
      provider,
      providerData: buildProviderData(provider, reasoningEffort),
    }
  }

  async run(agentId: string, options: RuntimeRunOptions) {
    const persistence = new AgentRunPersistence(options.runId)
    
    // 计算当前会话的最新用户输入 query
    const query = typeof options.input === 'string'
      ? options.input
      : extractPromptFromBody({ messages: options.input as any })

    const { agent, source } = await this.buildAgent(agentId, {
      persistence,
      modelOverride: options.modelOverride,
      reasoningEffort: options.reasoningEffort,
      memoryInstructions: options.memoryInstructions,
      query,
    })
    const runner = new Runner({
      tracingDisabled: !config.openaiApiKey,
      traceIncludeSensitiveData: true,
      workflowName: `Telos Agent: ${source.name}`,
      groupId: options.threadId ?? options.runId,
      traceMetadata: {
        runId: options.runId,
        agentId,
      },
    } as any)

    runner.on('agent_start', (_context, startedAgent, turnInput) => {
      void persistence.step('agent_start', startedAgent.name, turnInput)
      void persistence.event(
        'agent_start',
        { input: turnInput },
        startedAgent.name
      )
    })
    runner.on('agent_end', (_context, endedAgent, output) => {
      void persistence.step('agent_end', endedAgent.name, undefined, output)
      void persistence.event('agent_end', { output }, endedAgent.name)
    })
    runner.on('agent_handoff', (_context, fromAgent, toAgent) => {
      options.onEvent?.({
        type: 'handoff',
        payload: {
          fromAgent: fromAgent.name,
          toAgent: toAgent.name,
        },
      })
      void persistence.event('handoff', {
        fromAgent: fromAgent.name,
        toAgent: toAgent.name,
      })
    })
    runner.on(
      'agent_tool_start',
      (_context, activeAgent, activeTool, details) => {
        const payload = {
          toolName: activeTool.name,
          toolCall: details.toolCall,
        }
        options.onEvent?.({
          type: 'tool_start',
          agentName: activeAgent.name,
          payload,
        })
        void persistence.event('tool_start', payload, activeAgent.name)
      }
    )
    runner.on('agent_tool_end', (_context, activeAgent, activeTool, result) => {
      const payload = {
        toolName: activeTool.name,
        result,
      }
      options.onEvent?.({
        type: 'tool_end',
        agentName: activeAgent.name,
        payload,
      })
      void persistence.event('tool_end', payload, activeAgent.name)
    })

    if (options.stream) {
      const result = await runner.run(agent, options.input, {
        maxTurns: source.loopMode === 'single_turn' ? 1 : source.maxTurns,
        stream: true,
        signal: options.signal,
        toolNotFoundBehavior: 'return_error_to_model',
      })
      return { result, persistence }
    }

    const result = await runner.run(agent, options.input, {
      maxTurns: source.loopMode === 'single_turn' ? 1 : source.maxTurns,
      signal: options.signal,
      toolNotFoundBehavior: 'return_error_to_model',
    })
    return { result, persistence }
  }
}

export const agentRuntimeService = new AgentRuntimeService()
