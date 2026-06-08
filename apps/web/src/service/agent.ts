import { API_BASE_URL } from './request'

export type AgentType = 'public' | 'private' | 'system'
export type AgentLoopMode = 'auto' | 'single_turn'
export type AgentStatus = 'active' | 'archived' | 'disabled'
export type AgentRelationMode = 'as_tool' | 'handoff'
export type McpTransport = 'stdio' | 'streamable_http' | 'sse'
export type McpApprovalPolicy = 'none' | 'all' | 'sensitive'

export interface Agent {
  id: string
  name: string
  description: string
  instructions?: string
  type: AgentType
  owner_id: string | null
  owner_name?: string
  is_default: boolean
  model_key?: string
  temperature?: number
  max_turns?: number
  loop_mode?: AgentLoopMode
  status?: AgentStatus
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  slug?: string
  name: string
  description: string
  content?: string
  markdown?: string
  enabled: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface McpServer {
  id: string
  name: string
  description?: string | null
  transport: McpTransport
  command?: string | null
  args?: string[]
  url?: string | null
  env?: Record<string, string>
  headers?: Record<string, string>
  env_keys?: string[]
  enabled: boolean
  approval_policy: McpApprovalPolicy
  sensitive_tools?: string[]
  last_tools_snapshot?: unknown
  created_at: string
  updated_at: string
}

export interface AgentSkill {
  id: string
  agent_id: string
  skill_id: string
  enabled: boolean
  sort_order: number
  skill?: Skill
}

export interface AgentMcpServer {
  id: string
  agent_id: string
  mcp_server_id: string
  enabled: boolean
  allowed_tools?: string[]
  approval_policy_override?: McpApprovalPolicy | null
  mcp_server?: McpServer
}

export interface AgentRelation {
  id: string
  parent_id: string
  subagent_id: string
  mode: AgentRelationMode
  name?: string | null
  description?: string | null
  enabled: boolean
  sort_order: number
  subagent?: Agent
}

export interface AgentRun {
  id: string
  agent_id: string
  current_agent_id?: string | null
  thread_id?: string | null
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  input?: unknown
  final_output?: string | null
  error?: string | null
  metadata?: Record<string, unknown>
  started_at: string
  completed_at?: string | null
}

export interface AgentRunEvent {
  id: string
  run_id: string
  step_id?: string | null
  event_type: string
  payload?: unknown
  sequence: number
  created_at: string
}

export interface AgentThread {
  id: string
  agent_id: string
  owner_id?: string | null
  title: string
  status: 'active' | 'archived' | 'deleted'
  summary?: string | null
  metadata?: Record<string, unknown>
  last_message_at?: string | null
  created_at: string
  updated_at: string
  agent?: Pick<Agent, 'id' | 'name'>
  _count?: { messages?: number }
}

export interface AgentMessage {
  id: string
  thread_id: string
  run_id?: string | null
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string
  parts?: unknown
  metadata?: Record<string, unknown>
  sequence: number
  created_at: string
}

export interface CreateAgentRequest {
  name: string
  description: string
  instructions?: string
  type: 'public' | 'private'
  modelKey?: string
  model_key?: string
  temperature?: number
  maxTurns?: number
  max_turns?: number
  loopMode?: AgentLoopMode
  loop_mode?: AgentLoopMode
  metadata?: Record<string, unknown>
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  status?: AgentStatus
}

export interface AgentApiResponse<T> {
  code: number
  message: string
  data?: T
}

export class AgentService {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    init: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      ...init,
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`)
    }

    const result = (await response.json()) as AgentApiResponse<T>
    if (result.code !== 0) {
      throw new Error(result.message || 'Request failed')
    }

    return result.data as T
  }

  listAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('/api/agents')
  }

  getAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/api/agents/${id}`)
  }

  getDefaultAgent(): Promise<Agent> {
    return this.request<Agent>('/api/agents/default')
  }

  createAgent(data: CreateAgentRequest): Promise<Agent> {
    return this.request<Agent>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateAgent(id: string, data: UpdateAgentRequest): Promise<Agent> {
    return this.request<Agent>(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteAgent(id: string): Promise<void> {
    await this.request<unknown>(`/api/agents/${id}`, { method: 'DELETE' })
  }

  createRun(
    agentId: string,
    input: string,
    threadId?: string
  ): Promise<{ run_id: string; status: string }> {
    return this.request<{ run_id: string; status: string }>(
      `/api/agents/${agentId}/runs`,
      {
        method: 'POST',
        body: JSON.stringify({ input, threadId }),
      }
    )
  }

  getRun(runId: string): Promise<AgentRun> {
    return this.request<AgentRun>(`/api/runs/${runId}`)
  }

  getRunEvents(runId: string): Promise<{ events: AgentRunEvent[] }> {
    return this.request<{ events: AgentRunEvent[] }>(
      `/api/runs/${runId}/events`
    )
  }

  listThreads(params?: { agentId?: string | null }): Promise<AgentThread[]> {
    const search = new URLSearchParams()
    if (params?.agentId) search.set('agentId', params.agentId)
    const query = search.toString()
    return this.request<AgentThread[]>(
      `/api/agent/threads${query ? `?${query}` : ''}`
    )
  }

  createThread(data: {
    agentId: string
    title?: string
  }): Promise<AgentThread> {
    return this.request<AgentThread>('/api/agent/threads', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  listThreadMessages(threadId: string): Promise<AgentMessage[]> {
    return this.request<AgentMessage[]>(
      `/api/agent/threads/${threadId}/messages`
    )
  }

  updateThread(
    threadId: string,
    data: { title?: string; status?: 'active' | 'archived' }
  ): Promise<AgentThread> {
    return this.request<AgentThread>(`/api/agent/threads/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.request<unknown>(`/api/agent/threads/${threadId}`, {
      method: 'DELETE',
    })
  }

  getAgentSkills(agentId: string): Promise<{ skills: AgentSkill[] }> {
    return this.request<{ skills: AgentSkill[] }>(
      `/api/agents/${agentId}/skills`
    )
  }

  setAgentSkills(agentId: string, skillIds: string[]): Promise<unknown> {
    return this.request(`/api/agents/${agentId}/skills`, {
      method: 'PUT',
      body: JSON.stringify({ skill_ids: skillIds }),
    })
  }

  getAgentMcpServers(
    agentId: string
  ): Promise<{ mcp_servers: AgentMcpServer[] }> {
    return this.request<{ mcp_servers: AgentMcpServer[] }>(
      `/api/agents/${agentId}/mcp-servers`
    )
  }

  setAgentMcpServers(agentId: string, serverIds: string[]): Promise<unknown> {
    return this.request(`/api/agents/${agentId}/mcp-servers`, {
      method: 'PUT',
      body: JSON.stringify({ mcp_server_ids: serverIds }),
    })
  }

  getSubagents(agentId: string): Promise<{ subagents: AgentRelation[] }> {
    return this.request<{ subagents: AgentRelation[] }>(
      `/api/agents/${agentId}/subagents`
    )
  }

  setSubagents(
    agentId: string,
    relations: Array<{
      subagent_id: string
      mode: AgentRelationMode
      name?: string
      description?: string
      enabled?: boolean
    }>
  ): Promise<unknown> {
    return this.request(`/api/agents/${agentId}/subagents`, {
      method: 'PUT',
      body: JSON.stringify({ relations }),
    })
  }

  listSkills(): Promise<Skill[]> {
    return this.request<Skill[]>('/api/skills')
  }

  createSkill(data: {
    slug?: string
    name: string
    description: string
    markdown: string
    enabled?: boolean
  }): Promise<Skill> {
    return this.request<Skill>('/api/skills', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        content: data.markdown,
      }),
    })
  }

  updateSkill(id: string, data: Partial<Skill>): Promise<Skill> {
    return this.request<Skill>(`/api/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        content: data.content ?? data.markdown,
      }),
    })
  }

  async deleteSkill(id: string): Promise<void> {
    await this.request<unknown>(`/api/skills/${id}`, { method: 'DELETE' })
  }

  listMcpServers(): Promise<McpServer[]> {
    return this.request<McpServer[]>('/api/mcp-servers')
  }

  createMcpServer(
    data: Omit<McpServer, 'id' | 'created_at' | 'updated_at'>
  ): Promise<McpServer> {
    return this.request<McpServer>('/api/mcp-servers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  updateMcpServer(id: string, data: Partial<McpServer>): Promise<McpServer> {
    return this.request<McpServer>(`/api/mcp-servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  testMcpServer(id: string): Promise<{ tools: unknown[] }> {
    return this.request<{ tools: unknown[] }>(`/api/mcp-servers/${id}/test`, {
      method: 'POST',
    })
  }

  async deleteMcpServer(id: string): Promise<void> {
    await this.request<unknown>(`/api/mcp-servers/${id}`, {
      method: 'DELETE',
    })
  }
}

export const agentService = new AgentService()
