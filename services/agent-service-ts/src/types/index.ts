// ========== 核心类型定义 ==========

// 工具类型
export enum ToolType {
  INVOKABLE = "invokable",
  STREAMABLE = "streamable",
}

// Agent 类型
export enum AgentType {
  PUBLIC = "public",
  PRIVATE = "private",
  SYSTEM = "system",
}

// 认证类型
export enum AuthType {
  NONE = "none",
  BEARER = "bearer",
  API_KEY = "api_key",
  BASIC = "basic",
}

// ========== 工具相关类型 ==========

// 端点配置
export interface EndpointConfig {
  urlTemplate: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  auth?: AuthConfig;
  timeout?: number;
}

// 认证配置
export interface AuthConfig {
  type: AuthType;
  tokenEnv?: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

// 参数定义 (JSON Schema 格式)
export interface ParameterDef {
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
  enum?: string[];
  properties?: Record<string, ParameterDef>;
}

// 参数定义容器
export interface ParametersDef {
  type: "object";
  properties: Record<string, ParameterDef>;
  required?: string[];
}

// 响应转换规则
export interface ResponseTransform {
  extract?: string;
  format?: "markdown" | "json" | "text";
  wrapperText?: string;
}

// 速率限制配置
export interface RateLimitConfig {
  maxRequests: number;
  windowSecs: number;
}

// 工具定义（从数据库读取）
export interface ToolDefinition {
  id: string;
  name: string;
  type: ToolType;
  displayName: string;
  description: string;
  category: string;
  endpoint: EndpointConfig;
  parameters: ParametersDef;
  responseTransform?: ResponseTransform;
  rateLimit?: RateLimitConfig;
  enabled: boolean;
  version: string;
  tags: string[];
}

// 工具执行请求
export interface ToolExecuteRequest {
  tool: ToolDefinition;
  parameters: Record<string, any>;
  agentId?: string;
  userId?: string;
}

// 工具执行结果
export interface ToolExecuteResult {
  success: boolean;
  data?: any;
  errorMessage?: string;
  durationMs: number;
}

// ========== Agent 相关类型 ==========

// Agent 定义
export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  type: AgentType;
  ownerId?: string;
  isDefault: boolean;
  tools?: ToolDefinition[];
}

// ========== 聊天相关类型 ==========

// 聊天消息角色
export enum MessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
}

// 聊天消息
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

// 带工具的聊天请求
export interface ChatRequestWithTools {
  agentId: string;
  userId?: string;
  message: string;
  systemPrompt?: string;
}

// SSE 事件类型
export enum SSEEventType {
  CONTENT = "content",
  TOOL_CALL_START = "tool_call_start",
  TOOL_CALL_END = "tool_call_end",
  TOOL_CALL_ERROR = "tool_call_error",
  ERROR = "error",
  DONE = "done",
}

// 工具调用状态
export enum ToolCallStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCESS = "success",
  ERROR = "error",
}

// 工具调用信息
export interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: ToolCallStatus;
  input?: Record<string, any>;
  output?: any;
  error?: string;
  timestamp: Date;
}

// SSE 数据块
export interface StreamChunk {
  type?: SSEEventType;
  content?: string;
  toolCall?: ToolCallInfo;
  error?: string;
  done?: boolean;
}

// ========== API 响应类型 ==========

// 统一响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 工具列表选项
export interface ToolListOptions extends PaginationParams {
  category?: string;
  enabled?: boolean;
  search?: string;
}
