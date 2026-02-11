// ========== Agent 相关类型 ==========

export enum AgentType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SYSTEM = 'system',
}

export interface AgentDefinition {
  id: string
  name: string
  description: string
  type: AgentType
  ownerId?: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// ========== 聊天相关类型 ==========

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface ChatMessage {
  role: MessageRole
  content: string
}

// ========== API 响应类型 ==========

export interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}
