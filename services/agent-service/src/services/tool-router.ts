import OpenAI from 'openai'
import { config } from '../config/index.js'
import { logger } from '../config/logger.js'
import { getGcloudAccessToken, getGcloudOpenAIBaseUrl } from './gcloud.js'

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  const model = config.defaultModel || 'gpt-4o-mini'

  if (model.startsWith('gemini-') || model.startsWith('google/gemini-')) {
    const apiKey = getGcloudAccessToken()
    const baseURL = getGcloudOpenAIBaseUrl()
    return new OpenAI({
      apiKey,
      baseURL,
    })
  }

  if (openaiClient) return openaiClient
  const apiKey = config.openaiApiKey || config.shortapiApiKey
  const baseURL = config.openaiApiKey ? (config.openaiBaseUrl || undefined) : (config.shortapiBaseUrl || undefined)
  openaiClient = new OpenAI({
    apiKey: apiKey || 'dummy-key',
    baseURL,
  })
  return openaiClient
}


export interface ToolItem {
  id: string
  name: string
  description: string
  displayName?: string
  parameters?: any
}

export interface McpServerItem {
  id: string
  name: string
  description: string
  transport?: string
  command?: string | null
  args?: any
  url?: string | null
  env?: any
  allowedTools?: any
}

/**
 * 根据用户输入查询动态路由工具和 MCP 服务器，筛选出最相关的 Top-5
 */
export async function routeTools(
  query: string,
  tools: ToolItem[],
  mcpServers: McpServerItem[]
): Promise<{
  selectedTools: ToolItem[]
  selectedMcp: McpServerItem[]
  remainingTools: ToolItem[]
  remainingMcp: McpServerItem[]
}> {
  const totalCount = tools.length + mcpServers.length
  if (totalCount <= 5) {
    return {
      selectedTools: tools,
      selectedMcp: mcpServers,
      remainingTools: [],
      remainingMcp: [],
    }
  }

  try {
    const client = getOpenAIClient()
    
    // 构建候选工具的文本描述列表
    const candidateList = [
      ...tools.map(t => ({ name: t.name, type: 'tool', description: t.description })),
      ...mcpServers.map(m => ({ name: m.name, type: 'mcp', description: m.description }))
    ]

    const systemPrompt = `你是一个高精度的 Agent 工具过滤器。
用户输入了一个当前的对话请求。我们需要从备选的工具列表中筛选出与解决该请求最相关的工具，以便注入到大模型的上下文里（最多筛选出 5 个最相关的工具）。

当前用户请求：
"${query}"

备选工具列表：
${candidateList.map((c, i) => `${i + 1}. name: "${c.name}", type: "${c.type}", description: "${c.description}"`).join('\n')}

要求：
1. 仅选出对解决用户请求真正有帮助的工具，最多不超过 5 个。
2. 绝对不要返回任何 Markdown 格式。仅返回一个 JSON 数组，包含选中的工具的 'name'，如：["tool_name_1", "mcp_name_2"]。如果都不相关，返回空数组 []。
3. 绝对不要返回除了 JSON 数组外的任何额外文字。`

    const response = await client.chat.completions.create({
      model: config.defaultModel || 'gpt-4o-mini',

      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.1,
    })

    const rawText = response.choices?.[0]?.message?.content || ''
    let cleanJson = rawText.trim()
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7)
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.substring(3)
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3)
    }
    cleanJson = cleanJson.trim()

    let selectedNames: string[] = []
    try {
      selectedNames = JSON.parse(cleanJson)
    } catch {
      logger.warn({ msg: 'Failed to parse tool routing JSON', rawText })
    }

    const selectedToolSet = new Set(selectedNames)
    
    const selectedTools: ToolItem[] = []
    const remainingTools: ToolItem[] = []
    const selectedMcp: McpServerItem[] = []
    const remainingMcp: McpServerItem[] = []

    for (const t of tools) {
      if (selectedToolSet.has(t.name)) {
        selectedTools.push(t)
      } else {
        remainingTools.push(t)
      }
    }

    for (const m of mcpServers) {
      if (selectedToolSet.has(m.name)) {
        selectedMcp.push(m)
      } else {
        remainingMcp.push(m)
      }
    }

    // 容错机制：如果过滤结果全部为空，默认选前几个工具
    if (selectedTools.length === 0 && selectedMcp.length === 0) {
      return {
        selectedTools: tools.slice(0, 3),
        selectedMcp: mcpServers.slice(0, 2),
        remainingTools: tools.slice(3),
        remainingMcp: mcpServers.slice(2),
      }
    }

    return {
      selectedTools,
      selectedMcp,
      remainingTools,
      remainingMcp,
    }
  } catch (error) {
    logger.error({ msg: 'Tool routing failed, fallback to default', error })
    return {
      selectedTools: tools.slice(0, 4),
      selectedMcp: mcpServers.slice(0, 1),
      remainingTools: tools.slice(4),
      remainingMcp: mcpServers.slice(1),
    }
  }
}
