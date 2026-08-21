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
import { z } from 'zod'
import { prisma } from './db.js'
import { AgentRunPersistence } from './persistence.js'
import { config, logger } from '../config/index.js'
import {
  buildCreatePlanTool,
  buildUpdatePlanStatusTool,
  isReadOnlyTool,
  type StructuredPlan,
} from './plan-tools.js'
import { buildClarifyQuestionTool, type ClarifyQuestion } from './clarify-tools.js'
import { PendingRunCache } from './pending-cache.js'
import { PlanStore } from './plan-store.js'
import { asRecord, asStringArray, safeJsonStringify } from '../utils/json.js'
import { buildBuiltinTool } from './builtin-tools.js'
import {
  buildSkillLoaderTool,
  buildSkillIndexBlock,
  buildSkillActivatedBlock,
} from './skill-loader.js'
import { WorkspaceManager } from './workspace.js'
import { getGcloudAccessToken, getGcloudOpenAIBaseUrl } from './gcloud.js'
import { DeepSeekReasoningModel } from './deepseek-reasoning-model.js'
import {
  Prisma,
  Tool as DbTool,
  McpServer as DbMcpServer,
} from '@prisma/client'

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
  /** 解析出的模型 provider */
  provider: RuntimeProvider
  /** 当前模型是否支持多模态视觉 */
  supportVision: boolean
}

export type PlanMode = 'plan' | 'execute'
export const DEFAULT_AGENT_TURNS = 50
export const MAX_AGENT_TURNS = 200

export interface RuntimeRunOptions {
  runId: string
  input: string | AgentInputItem[]
  threadId?: string | null
  stream?: boolean
  signal?: AbortSignal
  modelOverride?: string | null
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | null
  memoryInstructions?: string
  /**
   * 计划模式：
   * - 'plan'：保留只读工具，注入 create_plan 工具，模型产出结构化计划后 run 停止
   * - 'execute'：全部工具可用，注入 update_plan_status 工具跟踪进度
   */
  planMode?: PlanMode
  /** execute 阶段已批准的结构化计划 */
  approvedPlan?: StructuredPlan | null
  /** execute 阶段的 PlanStore 实例（用于 update_plan_status → SSE 推送） */
  planStore?: PlanStore
  /** 用户通过 $skill-name 显式触发的技能名（对标 Codex） */
  forceSkillName?: string
  /** 当前用户 ID，用于 skill 运行时可见范围过滤（自己的 + 系统级） */
  userId?: string
  /** plan 阶段模型产出计划时的回调（用于持久化 + SSE 推送） */
  onPlanCreated?: (plan: StructuredPlan) => void
  onEvent?: (event: {
    type: 'tool_start' | 'tool_end' | 'handoff'
    agentName?: string | null
    payload: Record<string, unknown>
  }) => void
}

/**
 * 计划模式系统提示词（plan 阶段）。
 * 引导模型先调用只读工具收集上下文，再调用 create_plan 产出结构化计划。
 */
const PLAN_MODE_INSTRUCTIONS = `你正处于「计划模式」（Plan Mode）。

你的任务：先充分收集上下文，然后调用 create_plan 工具产出一份结构化执行计划。

工作流程：
1. 仔细分析用户需求。如果信息不足，可以调用你现有的只读工具（如 search_memory、calculator、get_current_time 等）来收集上下文。
2. 充分理解任务后，调用 create_plan 工具，传入 summary（一句话概述）和 steps（步骤数组）。
3. 调用 create_plan 后，run 会立即停止，计划将展示给用户审批。

注意：
- 不要尝试调用任何写入/修改类的工具（如果有此类工具，它们在计划模式下已被禁用）。
- 计划要具体、可执行，通常 3-8 步。
- 不要在文本回复中写计划，计划必须通过 create_plan 工具提交。
- 调用 create_plan 前不需要额外的文本输出（可以简短说一句"我来制定计划"）。`

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
  supportVision: boolean
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

export { parseExplicitSkillTrigger } from './skill-loader.js'

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


/**
 * 从运行时输入中剥离所有图片 content part,保留文本。
 * 仅在 provider 不支持视觉时调用。
 */
function stripImageContent(
  input: string | AgentInputItem[]
): string | AgentInputItem[] {
  if (typeof input === 'string') return input
  if (!Array.isArray(input)) return input

  return input
    .map(item => {
      if (!item || typeof item !== 'object') return item
      const msg = item as { type?: string; role?: string; content?: unknown }
      // 仅处理 message 类型的 item;其余(item_reference 等)原样保留
      if (msg.type !== 'message' || msg.content === undefined) return item

      if (typeof msg.content === 'string') return item

      if (Array.isArray(msg.content)) {
        const filtered = msg.content.filter(
          (part: any) => !(part && part.type === 'input_image')
        )
        // 没有图片被移除,原样返回避免无谓的结构变化
        if (filtered.length === msg.content.length) return item
        // 全部被移除时回退为空字符串,保证 content 不为空数组
        return {
          ...msg,
          content:
            filtered.length > 0
              ? filtered
              : (msg.content.find((p: any) => p.type === 'input_text') as any)
                  ?.text ?? '',
        } as AgentInputItem
      }

      return item
    })
    .filter(Boolean) as AgentInputItem[]
}

function buildProviderData(
  provider: RuntimeProvider,
  reasoningEffort?: RuntimeRunOptions['reasoningEffort']
) {
  const effort = reasoningEffort ?? 'medium'
  const isMinimal = effort === 'minimal'
  if (provider === 'seed') {
    return {
      reasoning_effort: effort,
      ...(isMinimal ? { thinking: { type: 'disabled' } } : {}),
    }
  }
  if (provider === 'bailian') {
    return {
      enable_thinking: !isMinimal,
    }
  }
  if (provider === 'gcloud') {
    return isMinimal ? {} : { reasoning_effort: effort }
  }
  // OpenAI 兼容系（openai / shortapi）：o 系列等推理模型通过 reasoning_effort 控制强度，
  // minimal 表示尽量关闭（SDK 会映射为最弱档；非推理模型会忽略该参数）。
  if (provider === 'openai' || provider === 'shortapi') {
    return { reasoning_effort: effort }
  }
  // DeepSeek 官方 API（V4 系列）：
  // - 关闭推理：thinking: { type: 'disabled' }
  // - 开启推理：可附带 reasoning_effort 控制强度（'high' | 'max'）
  if (isMinimal) {
    return { thinking: { type: 'disabled' } }
  }
  return { reasoning_effort: effort }
}

export class AgentRuntimeService {
  /**
   * plan 阶段模型调用 create_plan 工具时，缓存产出的结构化计划。
   * chat.ts 在流式 run 结束后取出，用于持久化和 SSE 推送。
   * key = runId, value = StructuredPlan
   */
  private readonly pendingPlanCache = new PendingRunCache<StructuredPlan>('plan')

  /**
   * 模型调用 clarify_question 工具时，缓存提问及可选项。
   * run 结束后由调用方取出，用于持久化和 SSE 推送。
   * 存 Redis（带 TTL）：多实例可读 + run 异常终止时自动过期，修内存泄漏。
   */
  private readonly pendingClarifyCache = new PendingRunCache<ClarifyQuestion>('clarify')

  /** 取出并移除缓存的计划（run 结束后调用方取走） */
  async consumePendingPlan(runId: string): Promise<StructuredPlan | undefined> {
    return this.pendingPlanCache.consume(runId)
  }

  /** 取出并移除缓存的澄清问题（run 结束后调用方取走） */
  async consumePendingClarify(runId: string): Promise<ClarifyQuestion | undefined> {
    return this.pendingClarifyCache.consume(runId)
  }

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
      planMode?: PlanMode
      runId?: string
      planStore?: PlanStore
      threadId?: string | null
      forceSkillName?: string
      userId?: string
    }
  ): Promise<RuntimeBuildResult> {
    const depth = options?.depth ?? 0
    const planMode = options?.planMode
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

    // 计划模式下隐藏全部工具与 MCP 服务器，仅让模型产出计划文本
    const isPlanMode = planMode === 'plan'

    // 渐进式披露：system prompt 只注入 skill 元数据（name + description），
    // 全文由 execute_skill 工具按需加载，大幅节省 token。
    // 对于系统默认 agent（type=system, 如 T），自动合并当前用户安装的所有 skill，
    // 让用户安装后立即可用，无需手动绑定（system agent 不可编辑，无法走绑定流程）。
    const agentBoundSkills = source.skillsAsAgent
      .filter((link: any) => link.skill?.enabled)
      .map((link: any) => link.skill) as {
        id: string
        name: string
        description: string
        content: string
      }[]

    let userInstalledSkills: typeof agentBoundSkills = []
    if (source.type === 'system' && options?.userId) {
      const userSkills = await prisma.skill.findMany({
        where: { ownerId: options.userId, enabled: true },
        select: { id: true, name: true, description: true, content: true },
      })
      userInstalledSkills = userSkills
    }

    // 合并: agent 绑定的 skill + 用户安装的 skill (按 name 去重, agent 绑定优先)
    const seenNames = new Set(agentBoundSkills.map(s => s.name))
    const enabledSkills = [...agentBoundSkills, ...userInstalledSkills.filter(s => !seenNames.has(s.name))]

    // L1：元数据索引（始终注入）
    const skillIndexBlock = enabledSkills.length
      ? buildSkillIndexBlock(
          enabledSkills.map(s => ({ name: s.name, description: s.description }))
        )
      : ''

    // 显式触发：用户通过 $skill-name 前缀强制激活某 skill，
    // 把全文直接注入（等价已通过 execute_skill 激活），跳过模型判断。
    let activatedSkillBlock = ''
    if (options?.forceSkillName && !isPlanMode) {
      const forced = enabledSkills.find(s => s.name === options.forceSkillName)
      if (forced) {
        activatedSkillBlock = buildSkillActivatedBlock(forced)
      }
    }

    const relationDescriptions = source.subagentsAsParent.map(
      (relation: any) => {
        return `- ${relation.name || relation.subagent.name} (${relation.mode}): ${relation.description}`
      }
    )

    const threadId = options?.threadId || ''
    const shareUrlRule = (threadId && planMode !== 'plan')
      ? `\n# Cloud Share Link Guidelines\nWhen you create, modify, or output files in the workspace (via write_file, run_command, or other commands), they are automatically uploaded/synced to the cloud storage.\nYou MUST provide the user with the direct cloud sharing link (URL) for download and sharing.\nThe format of the sharing link is: ${WorkspaceManager.getFileUrl(threadId, '{FILE_RELATIVE_PATH}')}\nPlease replace \`{FILE_RELATIVE_PATH}\` with the actual relative path of the file from the workspace root (e.g., 'test_created.txt' or 'images/output.png'). Always use forward slashes in URLs.\nFor example, if you created 'test_created.txt', the URL you share is: ${WorkspaceManager.getFileUrl(threadId, 'test_created.txt')}\n`
      : ''

    const instructions = [
      source.instructions || source.description,
      shareUrlRule,
      skillIndexBlock,
      activatedSkillBlock,
      relationDescriptions.length && planMode !== 'plan'
        ? `# Available Subagents\n${relationDescriptions.join('\n')}`
        : '',
      depth === 0 ? options?.memoryInstructions : '',
      depth === 0 && planMode === 'plan' ? PLAN_MODE_INSTRUCTIONS : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    // 提取启用的常规工具和 MCP 服务器
    // plan 模式：只保留只读工具（builtin + HTTP GET），让模型能探索上下文
    // execute 模式：全部工具可用
    const rawTools = isPlanMode
      ? source.toolsAsAgent
          .filter((link: any) => link.tool?.enabled)
          .map((link: any) => link.tool)
          .filter((t: any) => isReadOnlyTool(t))
      : source.toolsAsAgent
          .filter((link: any) => link.tool?.enabled)
          .map((link: any) => link.tool)

    const rawMcpServers = isPlanMode
      ? [] // plan 模式不加载 MCP（难以判定单个工具读写性，保守禁用）
      : source.mcpServersAsAgent
          .filter((link: any) => link.mcpServer?.enabled)
          .map((link: any) => {
            const serverAllowed = asStringArray(link.mcpServer.allowedTools)
            const linkAllowed = asStringArray(link.allowedTools)
            return {
              ...link.mcpServer,
              allowedTools: linkAllowed.length ? linkAllowed : serverAllowed,
            }
          })

    // 直接全量注入所有启用的工具，去除过度设计的动态过滤与二次召回机制。
    const selectedTools = rawTools
    const selectedMcp = rawMcpServers

    const tools: Tool[] = selectedTools.map((t: any) =>
      buildEndpointTool(t, options?.persistence)
    )

    const handoffs: Agent[] = []

    // 计划模式下不构建任何 subagent（既不 handoff 也不 as_tool）
    if (!isPlanMode) {
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
    }

    const mcpServers = selectedMcp
      .map((link: any) => {
        return buildMcpServer(link, link.allowedTools)
      })
      .filter((server: MCPServer | null): server is MCPServer =>
        Boolean(server)
      )

    // Plan 模式专用工具注入
    if (isPlanMode) {
      // plan 阶段：注入 create_plan 工具，模型产出结构化计划后 run 停止
      tools.push(
        buildCreatePlanTool(plan =>
          void this.pendingPlanCache.set(options?.runId ?? '', plan).catch(
            err => {
              logger.warn({
                msg: 'Failed to persist pending plan (run will finish without plan part)',
                runId: options?.runId,
                err,
              })
            }
          )
        )
      )
    } else if (planMode === 'execute' && options?.planStore) {
      // execute 阶段：注入 update_plan_status 工具，模型逐步汇报进度
      // planStore.updateStep 返回 {ok, error?}——状态机约束的反馈直接传给工具
      const planStore = options.planStore
      tools.push(
        buildUpdatePlanStatusTool((stepIndex, status, note) =>
          planStore.updateStep(stepIndex, status, note)
        )
      )
    }

    // Skill 加载器工具注入（渐进式披露的 L2 关键）。
    // 非计划模式 + 至少有一个启用 skill 时才注入，让模型可按需加载 skill 全文。
    // 注意：显式触发（forceSkillName）已把全文注入 instructions，无需再注入此工具也能工作；
    // 但仍注入以便模型在本轮后续若需引用其他 skill 时可用。
    if (!isPlanMode && enabledSkills.length > 0) {
      tools.push(
        buildSkillLoaderTool(
          enabledSkills.map(s => ({ name: s.name, description: s.description })),
          options?.persistence,
          options?.userId
        )
      )
    }

    // 注入澄清提问工具
    tools.push(
      buildClarifyQuestionTool(clarify =>
        void this.pendingClarifyCache.set(options?.runId ?? '', clarify).catch(
          err => {
            logger.warn({
              msg: 'Failed to persist pending clarify (run will finish without clarify part)',
              runId: options?.runId,
              err,
            })
          }
        )
      )
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
      // stopAtToolNames 规则：
      // - plan 模式：当模型调用 create_plan 或 clarify_question 时立即停止并挂起
      // - 其他模式：当模型调用 clarify_question 时立即停止并挂起
      toolUseBehavior: {
        stopAtToolNames: isPlanMode
          ? ['create_plan', 'clarify_question']
          : ['clarify_question']
      },
    } as any)

    return {
      agent,
      source,
      provider: resolvedModel.provider,
      supportVision: resolvedModel.supportVision,
    }
  }

  async resolveModel(
    modelKey: string,
    reasoningEffort?: RuntimeRunOptions['reasoningEffort']
  ): Promise<RuntimeModelResolution> {
    const configuredModel = await prisma.chatModel.findUnique({
      where: { modelKey },
      select: { provider: true, supportVision: true },
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

    const supportVision = configuredModel
      ? configuredModel.supportVision
      : provider === 'openai' || provider === 'gcloud'

    const model = await modelProvider.getModel(modelKey)

    return {
      model: provider === 'deepseek' ? new DeepSeekReasoningModel(model) : model,
      modelKey,
      provider,
      providerData: buildProviderData(provider, reasoningEffort),
      supportVision,
    }
  }

  async run(agentId: string, options: RuntimeRunOptions) {
    const persistence = new AgentRunPersistence(options.runId)

    // 计算当前会话的最新用户输入 query
    const query =
      typeof options.input === 'string'
        ? options.input
        : extractPromptFromBody({ messages: options.input as any })

    const { agent, source, provider, supportVision } = await this.buildAgent(agentId, {
      persistence,
      modelOverride: options.modelOverride,
      reasoningEffort: options.reasoningEffort,
      memoryInstructions: options.memoryInstructions,
      query,
      planMode: options.planMode,
      runId: options.runId,
      planStore: options.planStore,
      threadId: options.threadId,
      forceSkillName: options.forceSkillName,
      userId: options.userId,
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

    // 计划模式相关运行参数：
    // - plan 模式：正常 maxTurns（让模型自由调用只读工具探索），由 toolUseBehavior.stopAtToolNames
    //   在调用 create_plan 时停止，无需强制 maxTurns=1（避免 MaxTurnsExceededError）
    // - execute 模式：将已批准的结构化计划作为上下文 prepend 到 input
    const isPlanMode = options.planMode === 'plan'
    const maxTurns =
      source.loopMode === 'single_turn'
        ? 1
        : Math.max(1, Math.min(source.maxTurns, MAX_AGENT_TURNS))

    let runInput: string | AgentInputItem[] = options.input
    if (options.planMode === 'execute' && options.approvedPlan) {
      const plan = options.approvedPlan
      const stepsText = plan.steps
        .map(
          (s, i) =>
            `${i + 1}. ${s.description}${s.tool_hint ? `（工具: ${s.tool_hint}）` : ''}`
        )
        .join('\n')
      const planContext =
        `# 已批准的执行计划\n\n${plan.summary}\n\n${stepsText}\n\n` +
        `请严格按照以上计划逐步执行。每开始一步时调用 update_plan_status(status='in_progress')，` +
        `完成一步后调用 update_plan_status(status='completed')。\n\n---\n用户当前指令：${query}`
      runInput = planContext
    }

    // 根据具体模型是否支持 Vision 来剥离历史消息中的图片部分
    if (!supportVision) {
      runInput = stripImageContent(runInput)
    } else if (provider === 'bailian' || provider === 'seed') {
      // 针对国内百炼、火山方舟平台，由于服务端拉取公网图片常因防火墙、私有云鉴权或404而报错超时，
      // 将图片 URL 自动转成 Base64 内嵌发送，实现 100% 稳定识别。
      runInput = await convertImagesToBase64(runInput)
    }

    if (options.stream) {
      const result = await runner.run(agent, runInput, {
        maxTurns,
        stream: true,
        signal: options.signal,
        toolNotFoundBehavior: 'return_error_to_model',
      })
      return { result, persistence }
    }

    const result = await runner.run(agent, runInput, {
      maxTurns,
      signal: options.signal,
      toolNotFoundBehavior: 'return_error_to_model',
    })
    return { result, persistence }
  }
}

/**
 * 自动将 input 消息中的所有 http(s) 图片 URL 预先下载并转换为 Base64 嵌入格式。
 * 避免阿里百炼或火山方舟服务端拉取公网图片资源时由于跨网、防火墙或防盗链等原因下载失败。
 */
async function convertImagesToBase64(
  input: string | AgentInputItem[]
): Promise<string | AgentInputItem[]> {
  if (typeof input === 'string') return input
  if (!Array.isArray(input)) return input

  try {
    const converted = await Promise.all(
      input.map(async item => {
        if (!item || typeof item !== 'object') return item
        const msg = item as { type?: string; role?: string; content?: unknown }
        if (msg.type !== 'message' || !Array.isArray(msg.content)) return item

        const contentConverted = await Promise.all(
          msg.content.map(async (part: any) => {
            if (part && part.type === 'input_image' && typeof part.image === 'string') {
              const url = part.image.trim()
              if (/^data:image\/[a-zA-Z\-+]+;base64,/i.test(url)) {
                return part
              }
              if (/^https?:\/\//i.test(url)) {
                try {
                  logger.info(`[Vision Optimizer] Downloading image for Base64 injection: ${url}`)
                  const res = await fetch(url)
                  if (res.ok) {
                    const contentType = res.headers.get('content-type') || 'image/jpeg'
                    const buffer = await res.arrayBuffer()
                    const base64Data = Buffer.from(buffer).toString('base64')
                    return {
                      ...part,
                      image: `data:${contentType};base64,${base64Data}`
                    }
                  } else {
                    logger.warn(`[Vision Optimizer] Failed to fetch image ${url}, status: ${res.status}. Fallback to original URL.`)
                  }
                } catch (e: any) {
                  logger.error(`[Vision Optimizer] Error fetching image ${url}: ${e.message}`)
                }
              }
            }
            return part
          })
        )

        return {
          ...msg,
          content: contentConverted
        } as AgentInputItem
      })
    )
    return converted
  } catch (e: any) {
    logger.error(`[Vision Optimizer] Error converting images to Base64: ${e.message}`)
    return input
  }
}

export const agentRuntimeService = new AgentRuntimeService()
