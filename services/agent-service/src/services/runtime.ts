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
import { prisma } from './db.js'
import { AgentRunPersistence } from './persistence.js'
import { config } from '../config/index.js'
import { asRecord, asStringArray, safeJsonStringify } from '../utils/json.js'
import { buildBuiltinTool } from './builtin-tools.js'
import { getGcloudAccessToken, getGcloudOpenAIBaseUrl } from './gcloud.js'

type LoadedAgent = any
type LoadedTool = any
type LoadedMcpServer = any

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

    const tools: Tool[] = source.toolsAsAgent
      .filter((link: any) => link.tool?.enabled)
      .map((link: any) => buildEndpointTool(link.tool, options?.persistence))

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

    const mcpServers = source.mcpServersAsAgent
      .filter((link: any) => link.mcpServer?.enabled)
      .map((link: any) => {
        const serverAllowed = asStringArray(link.mcpServer.allowedTools)
        const linkAllowed = asStringArray(link.allowedTools)
        return buildMcpServer(
          link.mcpServer,
          linkAllowed.length ? linkAllowed : serverAllowed
        )
      })
      .filter((server: MCPServer | null): server is MCPServer =>
        Boolean(server)
      )

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
    const { agent, source } = await this.buildAgent(agentId, {
      persistence,
      modelOverride: options.modelOverride,
      reasoningEffort: options.reasoningEffort,
      memoryInstructions: options.memoryInstructions,
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
