import { API_BASE_URL } from './request'

// 消息类型
export type MessageRole = 'user' | 'assistant' | 'system'

// 工具调用状态
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error'

// 工具调用信息
export interface ToolCall {
  id: string
  name: string
  displayName: string
  status: ToolCallStatus
  input?: Record<string, any>
  output?: any
  error?: string
  timestamp: Date
}

// 聊天消息接口
export interface ChatMessage {
  role: MessageRole
  content: string
}

// SSE 流式数据格式
export interface StreamChunk {
  content: string
  done?: boolean
  // 工具调用事件
  type?: 'content' | 'tool_call_start' | 'tool_call_end' | 'tool_call_error'
  toolCall?: ToolCall
  // 工具调用位置：true 表示追加到内容后面，false 表示在内容前面
  append?: boolean
}

// Agent 类型
export type AgentType = 'public' | 'private' | 'system'

// Agent 接口
export interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  type: AgentType
  owner_id: string
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

// 流式响应回调
export type StreamCallback = (chunk: StreamChunk) => void
export type StreamErrorCallback = (error: Error) => void

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

  /**
   * 发送聊天消息（流式响应）
   * @param message 用户消息
   * @param onChunk 接收流式数据的回调
   * @param onError 错误回调
   * @param options 可选参数
   * @returns 清理函数
   */
  async chatStream(
    message: string,
    onChunk: StreamCallback,
    onError?: StreamErrorCallback,
    options?: {
      agentId?: string
      enableTools?: boolean
    }
  ): Promise<() => void> {
    const url = `${this.baseURL}/api/agent`
    const controller = new AbortController()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options?.agentId && { 'X-Agent-ID': options.agentId }),
        },
        body: JSON.stringify({
          message,
          ...(options?.enableTools !== undefined && {
            enable_tools: options.enableTools,
          }),
        }),
        signal: controller.signal,
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法获取响应流')
      }

      // 读取流式数据
      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              onChunk({ content: '', done: true })
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()

                if (data === '[DONE]') {
                  onChunk({ content: '', done: true })
                  continue
                }

                if (!data) continue

                try {
                  const parsed = JSON.parse(data) as StreamChunk
                  onChunk(parsed)
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            onError?.(error)
          }
        }
      }

      readStream()

      // 返回清理函数
      return () => controller.abort()
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError?.(error)
      }
      return () => {}
    }
  }

  /**
   * 发送聊天消息（非流式，简单版本）
   * @param message 用户消息
   * @param options 可选参数
   * @returns 完整响应
   */
  async chat(
    message: string,
    options?: {
      agentId?: string
      enableTools?: boolean
    }
  ): Promise<{ content: string }> {
    const url = `${this.baseURL}/api/agent`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.agentId && { 'X-Agent-ID': options.agentId }),
      },
      body: JSON.stringify({
        message,
        ...(options?.enableTools !== undefined && {
          enable_tools: options.enableTools,
        }),
      }),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 对于流式响应，收集所有内容
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]' || !data) continue

            try {
              const parsed = JSON.parse(data) as StreamChunk
              fullContent += parsed.content || ''
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    }

    return { content: fullContent }
  }
}

// 导出默认实例
export const agentService = new AgentService()
