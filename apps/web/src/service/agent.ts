import { API_BASE_URL } from './request'

// Agent 类型
export type AgentType = 'public' | 'private' | 'system'

// Agent 接口
export interface Agent {
  id: string
  name: string
  description: string
  type: AgentType
  owner_id: string | null
  owner_name?: string
  is_default: boolean
  created_at: string
  updated_at: string
}

// 创建 Agent 请求
export interface CreateAgentRequest {
  name: string
  description: string
  type: 'public' | 'private'
}

// 更新 Agent 请求
export interface UpdateAgentRequest {
  name: string
  description: string
}

// API 响应格式
export interface AgentApiResponse<T> {
  code: number
  message: string
  data?: T
}

// Agent 服务类
export class AgentService {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  /**
   * 获取 Agent 列表
   */
  async listAgents(): Promise<Agent[]> {
    const response = await fetch(`${this.baseURL}/api/agents`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.statusText}`)
    }

    const result: AgentApiResponse<Agent[]> = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || 'Failed to fetch agents')
    }

    return result.data || []
  }

  /**
   * 获取单个 Agent
   */
  async getAgent(id: string): Promise<Agent> {
    const response = await fetch(`${this.baseURL}/api/agents/${id}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.statusText}`)
    }

    const result: AgentApiResponse<Agent> = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || 'Failed to fetch agent')
    }

    return result.data!
  }

  /**
   * 获取默认 Agent
   */
  async getDefaultAgent(): Promise<Agent> {
    const response = await fetch(`${this.baseURL}/api/agents/default`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch default agent: ${response.statusText}`)
    }

    const result: AgentApiResponse<Agent> = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || 'Failed to fetch default agent')
    }

    return result.data!
  }

  /**
   * 创建新 Agent
   */
  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    const response = await fetch(`${this.baseURL}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`)
    }

    const result: AgentApiResponse<Agent> = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || 'Failed to create agent')
    }

    return result.data!
  }

  /**
   * 更新 Agent
   */
  async updateAgent(id: string, data: UpdateAgentRequest): Promise<Agent> {
    const response = await fetch(`${this.baseURL}/api/agents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to update agent: ${response.statusText}`)
    }

    const result: AgentApiResponse<Agent> = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || 'Failed to update agent')
    }

    return result.data!
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(id: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/agents/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`)
    }

    const result: AgentApiResponse<unknown> = await response.json()
    if (result.code !== 0) {
      throw new Error(result.message || 'Failed to delete agent')
    }
  }
}

// 导出默认实例
export const agentService = new AgentService()
