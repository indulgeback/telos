import { requestService } from './request'

// ============ 类型定义 ============

// 工具类型
export type ToolType = 'invokable' | 'streamable'

// 认证类型
export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic'

// 认证配置
export interface AuthConfig {
  type: AuthType
  token_env?: string
  api_key?: string
  username?: string
  password?: string
}

// 端点配置
export interface EndpointConfig {
  url_template: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body_template?: string
  auth?: AuthConfig
  timeout?: number
}

// 参数定义
export interface ParameterDef {
  type: string
  description?: string
  required: boolean
  default?: any
  enum?: string[]
  properties?: Record<string, ParameterDef>
}

// 参数定义容器
export interface ParametersDef {
  type: string
  properties: Record<string, ParameterDef>
  required?: string[]
}

// 响应转换规则
export interface ResponseTransform {
  extract?: string
  format?: 'text' | 'json' | 'markdown'
  wrapper_text?: string
}

// 速率限制配置
export interface RateLimitConfig {
  max_requests: number
  window_secs: number
}

// 工具模型
export interface Tool {
  id: string
  name: string
  type: ToolType
  display_name: string
  description: string
  category: string
  endpoint: EndpointConfig
  parameters: ParametersDef
  response_transform: ResponseTransform
  rate_limit?: RateLimitConfig
  enabled: boolean
  version: string
  tags?: string[]
  created_at: string
  updated_at: string
}

// Agent 工具关联
export interface AgentTool {
  id: string
  agent_id: string
  tool_id: string
  enabled: boolean
  config?: Record<string, any>
  created_at: string
  updated_at: string
  Tool?: Tool
}

// 工具列表响应
export interface ToolsListResponse {
  tools: Tool[]
  total: number
  page: number
  page_size: number
}

// Agent 工具列表响应
export interface AgentToolsResponse {
  tools: AgentTool[]
}

// 创建/更新工具请求
export interface CreateToolRequest {
  id: string
  name: string
  type: ToolType
  display_name: string
  description: string
  category: string
  endpoint: EndpointConfig
  parameters: ParametersDef
  response_transform: ResponseTransform
  rate_limit?: RateLimitConfig
  enabled?: boolean
  version?: string
  tags?: string[]
}

export type UpdateToolRequest = CreateToolRequest

// 设置 Agent 工具请求
export interface SetAgentToolsRequest {
  tool_ids: string[]
}

// 切换工具状态请求
export interface ToggleToolRequest {
  enabled: boolean
}

// 工具列表选项
export interface ToolListOptions {
  category?: string
  enabled?: boolean
  search?: string
  page?: number
  page_size?: number
}

// ============ Tool Service ============

export class ToolService {
  /**
   * 获取工具列表
   */
  async listTools(options?: ToolListOptions): Promise<ToolsListResponse> {
    const params = new URLSearchParams()
    if (options?.category) params.append('category', options.category)
    if (options?.enabled !== undefined)
      params.append('enabled', String(options.enabled))
    if (options?.search) params.append('search', options.search)
    if (options?.page) params.append('page', String(options.page))
    if (options?.page_size)
      params.append('page_size', String(options.page_size))

    const query = params.toString()
    return requestService.get<ToolsListResponse>(
      `/api/tools${query ? `?${query}` : ''}`
    )
  }

  /**
   * 获取工具详情
   */
  async getTool(id: string): Promise<Tool> {
    return requestService.get<Tool>(`/api/tools/${id}`)
  }

  /**
   * 创建新工具
   */
  async createTool(data: CreateToolRequest): Promise<Tool> {
    return requestService.post<Tool>(`/api/tools`, data)
  }

  /**
   * 更新工具
   */
  async updateTool(id: string, data: UpdateToolRequest): Promise<Tool> {
    return requestService.put<Tool>(`/api/tools/${id}`, data)
  }

  /**
   * 删除工具
   */
  async deleteTool(id: string): Promise<void> {
    return requestService.delete<void>(`/api/tools/${id}`)
  }

  /**
   * 获取 Agent 的工具列表
   */
  async getAgentTools(agentId: string): Promise<AgentToolsResponse> {
    return requestService.get<AgentToolsResponse>(
      `/api/agents/${agentId}/tools`
    )
  }

  /**
   * 设置 Agent 的工具
   */
  async setAgentTools(
    agentId: string,
    toolIds: string[]
  ): Promise<{ message: string }> {
    return requestService.put<{ message: string }>(
      `/api/agents/${agentId}/tools`,
      {
        tool_ids: toolIds,
      }
    )
  }

  /**
   * 切换 Agent 工具的启用状态
   */
  async toggleAgentTool(
    agentId: string,
    toolId: string,
    enabled: boolean
  ): Promise<{ message: string }> {
    return requestService.patch<{ message: string }>(
      `/api/agents/${agentId}/tools/${toolId}/toggle`,
      { enabled }
    )
  }

  /**
   * 按分类获取工具
   */
  async getToolsByCategory(category: string): Promise<Tool[]> {
    const result = await this.listTools({ category, enabled: true })
    return result.tools
  }

  /**
   * 搜索工具
   */
  async searchTools(keyword: string): Promise<Tool[]> {
    const result = await this.listTools({ search: keyword })
    return result.tools
  }
}

// 导出默认实例
export const toolService = new ToolService()
