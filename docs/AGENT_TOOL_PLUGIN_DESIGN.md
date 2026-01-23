# Agent 工具插件系统设计文档

## 1. 概述

### 1.1 目标
设计一个可插拔的工具系统，使 AI Agent 能够使用外部服务（如 jina.ai Reader API、Web Search）进行功能扩展。

### 1.2 核心目标
- **可插拔性**: 工具可以添加/移除，无需修改核心代码
- **用户可配置**: 每个 Agent 可以装配不同的工具集
- **类型安全**: 完整的 TypeScript 类型支持
- **执行安全**: 沙箱化工具执行，完善的错误处理
- **开放标准**: 兼容 OpenAI Function Calling 格式

## 2. 当前架构分析

### 2.1 现有 Agent 数据模型
```typescript
// 当前 Agent 结构
interface Agent {
  id: string
  name: string
  description: string
  system_prompt: string
  type: 'public' | 'private' | 'system'
  owner_id: string
  is_default: boolean
  created_at: string
  updated_at: string
}
```

### 2.2 现有局限性
| 局限性 | 影响 |
|------------|--------|
| 无工具支持 | Agent 只能生成文本 |
| 静态提示词 | 无法根据可用工具动态调整 |
| 无外部集成 | 无法访问 web、API、数据库 |
| 硬编码能力 | 添加工具需要修改代码 |

## 3. 工具系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           前端 (Web)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Agent 配置   │  │ 工具选择器   │  │ 流程编辑器   │              │
│  │  UI          │──│  UI          │──│  (工具节点)  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API
┌──────────────────────────────▼──────────────────────────────────────┐
│                         后端 (Go)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Agent        │  │ Tool         │  │ Chat         │              │
│  │ Service      │──│ Registry     │──│ Service      │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    工具执行引擎                               │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │  │
│  │  │ Jina    │ │ Search  │ │ 自定义  │ │ 未来    │             │  │
│  │  │ Reader  │ │ 工具    │ │ 工具    │ │ 工具    │             │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    外部服务                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│  │ Jina.ai │  │ Google  │  │ 自定义  │  │  ...    │               │
│  │ Reader  │  │ Search  │  │ APIs    │  │         │               │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 核心组件

#### 3.2.1 工具定义 (TypeScript)
```typescript
// 前后端共享的类型定义

/**
 * 标准工具定义，兼容 OpenAI Function Calling
 */
interface ToolDefinition {
  // 核心标识
  id: string                    // 唯一工具标识 (如 'jina-reader')
  name: string                  // LLM 调用的函数名 (如 'web_reader')
  category: ToolCategory        // 工具分类，用于 UI 组织

  // 人类可读信息
  displayName: string           // UI 显示名称
  description: string           // 给 LLM 和用户的描述

  // 执行配置
  parameters: ToolParameters    // JSON Schema 参数定义
  executor: ToolExecutor        // 执行逻辑 (仅后端)

  // 可选约束
  rateLimit?: RateLimit         // 限流配置
  requiresAuth?: boolean        // 是否需要 API 密钥
  enabled: boolean              // 是否可用

  // 元数据
  version: string               // 工具版本
  author: string                // 创建者
  tags: string[]                // 搜索/过滤标签
}

type ToolCategory =
  | 'web'              // 网页抓取、搜索
  | 'data'             // 数据处理、转换
  | 'communication'    // 邮件、消息、通知
  | 'integration'      // 第三方服务集成
  | 'custom'           // 用户自定义工具

interface ToolParameters {
  type: 'object'
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    description: string
    enum?: string[]           // 枚举选项
    default?: any             // 默认值
    required?: boolean
  }>
  required: string[]          // 必需参数名称
}

interface RateLimit {
  maxRequests: number         // 时间窗口内最大请求数
  windowMs: number           // 时间窗口 (毫秒)
  perUser?: boolean          // 按用户限流还是全局限流
}

// 工具执行结果
interface ToolResult {
  success: boolean
  data: unknown              // 结果数据
  error?: string             // 失败时的错误信息
  metadata?: {
    tokensUsed?: number      // 消耗的 token 数
    duration: number         // 执行耗时 (毫秒)
    cached: boolean          // 结果是否来自缓存
  }
}
```

#### 3.2.2 Agent-工具关联
```typescript
// 扩展 Agent 模型以支持工具
interface Agent {
  // ... 现有字段 ...

  // 工具支持相关的新字段
  tools: AgentToolConfig[]    // 该 Agent 可用的工具
  toolPolicy: ToolPolicy      // 工具使用策略
}

interface AgentToolConfig {
  toolId: string              // 引用工具定义
  enabled: boolean            // 是否启用该工具
  config?: Record<string, unknown>  // 工具特定配置
}

interface ToolPolicy {
  mode: 'auto' | 'require_approval' | 'disabled'
  maxToolsPerCall: number     // 限制同时使用的工具数
  allowedCategories: ToolCategory[]  // 允许的工具类别
}
```

#### 3.2.3 工具定义 (后端 Go - Eino 标准)

```go
// 使用 Eino 的 BaseTool 接口定义工具
// 参考: https://www.cloudwego.io/zh/docs/eino/core_modules/components/tools_node_guide/how_to_create_a_tool/

package tools

import (
    "context"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/schema"
)

// BaseTool 是 Eino 中所有工具的基础接口
type BaseTool interface {
    // Info 返回工具的元信息
    Info(ctx context.Context) (*schema.ToolInfo, error)
}

// InvokableTool 非流式工具（返回字符串结果）
type InvokableTool interface {
    BaseTool
    InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error)
}

// StreamableTool 流式工具（返回流式结果）
type StreamableTool interface {
    BaseTool
    StreamableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (*schema.StreamReader[string], error)
}

// ToolInfo 包含工具的描述和参数定义
type ToolInfo struct {
    Name        string           // 工具名称，LLM 通过此名称调用
    Desc        string           // 工具描述，告诉 LLM 这个工具做什么
    ParamsOneOf *schema.ParamsOneOf  // 参数定义（两种方式选一）
}
```

**参数定义的两种方式:**

```go
// 方式 1: 使用 ParameterInfo（简单场景）
params := map[string]*schema.ParameterInfo{
    "url": {
        Type:     schema.String,
        Required: true,
        Desc:     "要读取的网页 URL",
    },
    "format": {
        Type: schema.String,
        Enum: []string{"markdown", "json", "html"},
        Desc: "输出格式",
    },
}

// 方式 2: 使用结构体 tag（推荐，自动推断）
type ReadURLRequest struct {
    URL    string `json:"url" jsonschema:"required,description=要读取的网页 URL"`
    Format string `json:"format" jsonschema:"enum=markdown,enum=json,enum=html,description=输出格式"`
}
```

#### 3.2.4 工具注册中心 (Eino 兼容)

```go
package tools

import (
    "context"
    "github.com/cloudwego/eino/components/tool"
)

// ToolRegistry 管理 Eino 工具
type ToolRegistry interface {
    // 注册工具
    Register(toolId string, tool tool.BaseTool) error

    // 注销工具
    Unregister(toolId string) error

    // 获取工具
    Get(toolId string) (tool.BaseTool, error)

    // 列出所有工具
    List() map[string]tool.BaseTool

    // 获取 Agent 配置的工具
    GetForAgent(agentId string) ([]tool.BaseTool, error)

    // 将 Eino 工具转换为 LLM 可用的格式
    ToLLMTools(tools []tool.BaseTool) ([]*schema.ToolInfo, error)
}

type toolRegistry struct {
    tools     map[string]tool.BaseTool
    agentRepo AgentRepository  // 用于获取 Agent 的工具配置
}

func (r *toolRegistry) GetForAgent(agentId string) ([]tool.BaseTool, error) {
    // 1. 获取 Agent 的工具配置
    agent, err := r.agentRepo.Get(context.Background(), agentId)
    if err != nil {
        return nil, err
    }

    // 2. 根据 agent.Tools 配置筛选工具
    var result []tool.BaseTool
    for _, toolConfig := range agent.Tools {
        if !toolConfig.Enabled {
            continue
        }
        if t, ok := r.tools[toolConfig.ToolID]; ok {
            result = append(result, t)
        }
    }

    return result, nil
}
```

#### 3.2.5 Chat 服务集成 (使用 Eino Tool Calling)

```go
// 扩展现有 ChatService，使用 Eino 的工具调用能力

import (
    "github.com/cloudwego/eino/components/model"
    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/schema"
)

type ChatService struct {
    chatModel   model.ChatModel    // 已有的 DeepSeek ChatModel
    toolRegistry ToolRegistry
}

type ChatRequest struct {
    Message string
    AgentID string
}

// 处理聊天，支持工具调用
func (s *ChatService) Chat(ctx context.Context, req ChatRequest) (*ChatResponse, error) {
    // 1. 获取 Agent 及其配置的工具
    agent := s.agentService.Get(ctx, req.AgentID)
    tools, _ := s.toolRegistry.GetForAgent(req.AgentID)

    // 2. 如果没有配置工具，直接走普通对话
    if len(tools) == 0 {
        return s.chatWithoutTools(ctx, agent, req.Message)
    }

    // 3. 构建 Eino 的 ChatScene，绑定工具
    // Eino 会自动处理: LLM 生成工具调用 -> 执行工具 -> 将结果反馈给 LLM -> 最终响应
    toolsMap := make(map[string]tool.BaseTool)
    for _, t := range tools {
        info, _ := t.Info(ctx)
        toolsMap[info.Name] = t
    }

    // 4. 构建 Prompt（包含系统提示词）
    messages := []*schema.Message{
        {Role: schema.System, Content: agent.SystemPrompt},
        {Role: schema.User, Content: req.Message},
    }

    // 5. 使用 Eino 的 Tool Calling 能力
    // Eino 会自动完成多轮对话：工具调用 -> 工具执行 -> 结果整合
    resp, err := s.chatModel.Generate(ctx, messages,
        model.WithTools(toolsMap),           // 绑定工具
        model.WithToolChoice("auto"),        // 自动决定是否调用工具
    )

    return &ChatResponse{
        Message: resp.Content,
        Usage:   resp.Usage,
    }, nil
}
```

**Eino Tool Calling 流程:**

```
用户消息
    │
    ▼
LLM (DeepSeek) + Tools 定义
    │
    ▼
LLM 决定是否调用工具
    │
    ├─→ 不需要工具 → 直接返回响应
    │
    └─→ 需要工具 → Eino 自动处理:
         │
         ├─→ 调用 Tool.InvokableRun(argumentsInJSON)
         │
         ├─→ 获取工具返回结果
         │
         └─→ 将结果反馈给 LLM 生成最终响应
```

## 4. 内置工具

### 4.1 Jina.ai Reader 工具 (Eino 实现)

```go
// tools/jina_reader.go

package tools

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/components/tool/utils"
    "github.com/cloudwego/eino/schema"
)

// 请求参数结构体
type ReadURLRequest struct {
    URL         string `json:"url" jsonschema:"required,description=要读取内容的网页 URL"`
    Format      string `json:"format" jsonschema:"enum=markdown,enum=json,enum=html,description=输出格式，默认为 markdown"`
    ExtractOnly string `json:"extract_only" jsonschema:"description=CSS选择器，用于定向提取特定内容"`
}

// 响应结构体
type ReadURLResponse struct {
    Content string `json:"content"`
    URL     string `json:"url"`
    Title   string `json:"title,omitempty"`
}

// JinaReaderTool 实现 Eino 的 InvokableTool
type JinaReaderTool struct {
    client   *http.Client
    apiToken string // 可选，用于更高限流
}

func NewJinaReaderTool(apiToken string) tool.InvokableTool {
    return &JinaReaderTool{
        client:   &http.Client{},
        apiToken: apiToken,
    }
}

// Info 返回工具的元信息 (BaseTool 接口)
func (t *JinaReaderTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "web_reader",
        Desc: "从任意 URL 读取并提取 LLM 友好的内容，将网页转换为 Markdown 格式。支持自动图片描述和链接摘要。",
        // 使用 GoStruct2ParamsOneOf 自动从结构体 tag 生成参数定义
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "url": {
                Type:     schema.String,
                Required: true,
                Desc:     "要读取内容的网页 URL",
            },
            "format": {
                Type: schema.String,
                Enum: []string{"markdown", "json", "html"},
                Desc: "输出格式",
            },
            "extract_only": {
                Type: schema.String,
                Desc: "CSS 选择器，用于定向提取特定内容",
            },
        }),
    }, nil
}

// InvokableRun 执行工具 (InvokableTool 接口)
func (t *JinaReaderTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
    // 1. 解析参数
    var req ReadURLRequest
    if err := json.Unmarshal([]byte(argumentsInJSON), &req); err != nil {
        return "", fmt.Errorf("invalid arguments: %w", err)
    }

    // 2. 设置默认值
    if req.Format == "" {
        req.Format = "markdown"
    }

    // 3. 构建 Reader API URL
    readerURL := fmt.Sprintf("https://r.jina.ai/%s", req.URL)

    // 4. 创建 HTTP 请求
    httpReq, err := http.NewRequestWithContext(ctx, "GET", readerURL, nil)
    if err != nil {
        return "", fmt.Errorf("create request: %w", err)
    }

    // 添加请求头
    httpReq.Header.Set("X-With-Generated-Alt", "true")   // 启用图片描述
    httpReq.Header.Set("X-With-Links-Summary", "true")    // 包含链接摘要
    if t.apiToken != "" {
        httpReq.Header.Set("Authorization", "Bearer "+t.apiToken)
    }
    if req.ExtractOnly != "" {
        httpReq.Header.Set("X-Extract-Only", req.ExtractOnly)
    }

    // 5. 发送请求
    resp, err := t.client.Do(httpReq)
    if err != nil {
        return "", fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("Reader API error: %s", resp.Status)
    }

    // 6. 读取响应
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", fmt.Errorf("read response: %w", err)
    }

    // 7. 构建返回结果
    result := ReadURLResponse{
        Content: string(body),
        URL:     req.URL,
    }

    resultJSON, _ := json.Marshal(result)
    return string(resultJSON), nil
}
```

### 4.2 Jina.ai Search 工具 (Eino 实现)

```go
// tools/jina_search.go

package tools

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"

    "github.com/cloudwego/eino/components/tool"
    "github.com/cloudwego/eino/schema"
)

// 搜索请求参数
type SearchRequest struct {
    Query      string `json:"query" jsonschema:"required,description=搜索查询内容"`
    NumResults int    `json:"num_results" jsonschema:"description=返回结果数量，1-5，默认为5"`
}

// 搜索结果项
type SearchResult struct {
    Title   string `json:"title"`
    URL     string `json:"url"`
    Content string `json:"content"`
}

// 搜索响应
type SearchResponse struct {
    Query   string        `json:"query"`
    Results []SearchResult `json:"results"`
}

type JinaSearchTool struct {
    client   *http.Client
    apiToken string // Search 必需 API Key
}

func NewJinaSearchTool(apiToken string) tool.InvokableTool {
    if apiToken == "" {
        panic("Jina Search requires API token")
    }
    return &JinaSearchTool{
        client:   &http.Client{},
        apiToken: apiToken,
    }
}

func (t *JinaSearchTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name: "web_search",
        Desc: "搜索网页并获取前 5 个结果的内容摘要。适用于获取最新信息、实时数据。",
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "query": {
                Type:     schema.String,
                Required: true,
                Desc:     "搜索查询内容",
            },
            "num_results": {
                Type: schema.Integer,
                Desc: "返回结果数量，1-5，默认为5",
            },
        }),
    }, nil
}

func (t *JinaSearchTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
    var req SearchRequest
    if err := json.Unmarshal([]byte(argumentsInJSON), &req); err != nil {
        return "", fmt.Errorf("invalid arguments: %w", err)
    }

    // 默认值处理
    if req.NumResults == 0 || req.NumResults > 5 {
        req.NumResults = 5
    }

    // 构建搜索 URL
    searchURL := fmt.Sprintf("https://s.jina.ai/?q=%s", url.QueryEscape(req.Query))

    httpReq, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
    if err != nil {
        return "", fmt.Errorf("create request: %w", err)
    }

    httpReq.Header.Set("Accept", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+t.apiToken)

    resp, err := t.client.Do(httpReq)
    if err != nil {
        return "", fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("Search API error: %s", resp.Status)
    }

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", fmt.Errorf("read response: %w", err)
    }

    // Jina Search 返回的是 JSON 数组
    var results []SearchResult
    if err := json.Unmarshal(body, &results); err != nil {
        return "", fmt.Errorf("parse response: %w", err)
    }

    // 限制结果数量
    if len(results) > req.NumResults {
        results = results[:req.NumResults]
    }

    response := SearchResponse{
        Query:   req.Query,
        Results: results,
    }

    resultJSON, _ := json.Marshal(response)
    return string(resultJSON), nil
}
```

### 4.3 使用 utils.InferTool 简化工具创建

对于简单工具，可以使用 `InferTool` 自动推断参数定义：

```go
// tools/simple_example.go

package tools

import (
    "context"
    "fmt"

    "github.com/cloudwego/eino/components/tool/utils"
)

// 使用 jsonschema tag 定义参数约束
type DateTimeRequest struct {
    Timezone string `json:"timezone" jsonschema:"description=时区，如 Asia/Shanghai，默认为 UTC"`
    Format   string `json:"format" jsonschema:"enum=RFC3339,enum=unix,enum=iso8601,description=时间格式"`
}

type DateTimeResponse struct {
    Time   string `json:"time"`
    Format string `json:"format"`
}

func GetCurrentDateTime(ctx context.Context, req *DateTimeRequest) (*DateTimeResponse, error) {
    // 实现获取时间的逻辑
    return &DateTimeResponse{
        Time:   time.Now().Format(time.RFC3339),
        Format: req.Format,
    }, nil
}

// 使用 InferTool 自动创建工具
func NewDateTimeTool() (tool.InvokableTool, error) {
    return utils.InferTool(
        "date_time",           // tool name
        "获取当前日期和时间",   // description
        GetCurrentDateTime,    // 实现函数
    )
}
```

### 4.4 其他工具建议
| 工具 | 描述 | 优先级 |
|------|-------------|----------|
| `date-time` | 获取任意时区的当前日期时间 | 高 |
| `code-interpreter` | 在沙箱环境中执行代码 | 中 |
| `email` | 通过 SMTP 发送邮件 | 中 |
| `http-request` | 发起经过认证的 HTTP 请求 | 高 |
| `file-storage` | 读写配置的存储文件 | 中 |
| `database-query` | 执行只读数据库查询 | 低 |

## 5. 数据库变更

```sql
-- 工具表 (存储可用工具定义)
CREATE TABLE tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id VARCHAR(100) UNIQUE NOT NULL,        -- 如 'jina-reader'
    name VARCHAR(100) NOT NULL,                  -- LLM 调用的函数名
    category VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    parameters JSONB NOT NULL,                    -- JSON Schema
    rate_limit JSONB,                            -- 限流配置
    requires_auth BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0.0',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent 工具关联表 (Agent 可以使用哪些工具)
CREATE TABLE agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_id VARCHAR(100) NOT NULL REFERENCES tools(tool_id),
    enabled BOOLEAN DEFAULT TRUE,
    config JSONB,                                 -- 工具特定配置
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, tool_id)
);

-- 工具执行日志 (用于监控和调试)
CREATE TABLE tool_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id),
    user_id UUID REFERENCES users(id),
    tool_id VARCHAR(100) REFERENCES tools(tool_id),
    parameters JSONB,
    result JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 性能索引
CREATE INDEX idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX idx_tool_executions_agent ON tool_executions(agent_id);
CREATE INDEX idx_tool_executions_user ON tool_executions(user_id);
CREATE INDEX idx_tool_executions_tool ON tool_executions(tool_id);
```

## 6. API 端点

### 6.1 工具管理
```
GET    /api/tools                    - 列出所有可用工具
GET    /api/tools/:id                - 获取工具详情
POST   /api/tools                    - 注册自定义工具 (管理员)
PUT    /api/tools/:id                - 更新工具 (管理员)
DELETE /api/tools/:id                - 注销工具 (管理员)
```

### 6.2 Agent-工具关联
```
GET    /api/agents/:id/tools         - 获取 Agent 的工具
PUT    /api/agents/:id/tools         - 设置 Agent 的工具
POST   /api/agents/:id/tools/:toolId - 为 Agent 添加工具
DELETE /api/agents/:id/tools/:toolId - 从 Agent 移除工具
```

### 6.3 工具执行 (通过 Chat)
```
POST   /api/agent/chat               - 支持自动工具调用的聊天
       X-Agent-ID: <agent-id>
       Body: { message: string }
```

### 6.4 工具执行历史
```
GET    /api/tools/executions         - 列出工具执行记录 (管理员)
GET    /api/agents/:id/executions    - Agent 的工具执行记录
```

## 7. 前端组件

### 7.1 工具选择器 UI
```
┌─────────────────────────────────────────────────────────┐
│  Agent 工具配置                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 🔍 搜索工具...                                     │ │
│  ├───────────────────────────────────────────────────┤ │
│  │ 可用工具                                           │ │
│  │ ┌──────────────────────────────────────────────┐ │ │
│  │ │ 🔍 网页搜索   [添加]                          │ │ │
│  │ │    搜索网页获取最新信息                        │ │ │
│  │ ├──────────────────────────────────────────────┤ │ │
│  │ │ 📄 网页阅读   [添加]                          │ │ │
│  │ │    从任意 URL 提取内容                         │ │ │
│  │ ├──────────────────────────────────────────────┤ │ │
│  │ │ 📧 邮件发送   [添加]                          │ │ │
│  │ │    通过 SMTP 发送邮件                          │ │ │
│  │ └──────────────────────────────────────────────┘ │ │
│  │                                                   │ │
│  │ 已选工具 (拖拽可排序)                              │ │
│  │ ┌──────────────────────────────────────────────┐ │ │
│  │ │ ✅ 网页搜索                    [移除]         │ │ │
│  │ └──────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 7.2 流程编辑器集成
为现有 Flow 组件添加新的节点类型：
```
┌──────────────────────┐
│   工具: 网页阅读      │
├──────────────────────┤
│ URL: [输入框]         │
│ 格式: [下拉选择]      │
│        │              │
│        ▼              │
│   [输出端口]          │
└──────────────────────┘
```

## 8. 实施计划 (后端优先)

### 第一阶段: 后端基础设施 (第 1-2 周) - 🔥 优先
- [ ] 定义工具的 TypeScript 类型（前后端共享）
- [ ] 实现 Go ToolRegistry 服务
- [ ] 创建工具表的数据库迁移
- [ ] 构建 BaseTool 接口的适配层

### 第二阶段: Jina.ai 工具实现 (第 2-3 周) - 🔥 优先
- [ ] 实现 JinaReaderTool (Eino InvokableTool)
- [ ] 实现 JinaSearchTool (Eino InvokableTool)
- [ ] 添加 API 密钥管理
- [ ] 创建工具执行日志

### 第三阶段: Chat 服务集成 (第 3-4 周) - 🔥 优先
- [ ] 扩展 ChatService，集成 Eino Tool Calling
- [ ] 实现多轮对话处理
- [ ] 添加工具结果流式传输
- [ ] 优雅处理工具执行错误
- [ ] 工具调用的限流和监控

### 第四阶段: Agent-工具关联 API (第 4 周) - 🔥 优先
- [ ] `GET /api/tools` - 列出所有可用工具
- [ ] `GET /api/agents/:id/tools` - 获取 Agent 的工具
- [ ] `PUT /api/agents/:id/tools` - 设置 Agent 的工具
- [ ] `GET /api/tools/executions` - 工具执行历史

### 第五阶段: 前端开发 (第 5-6 周)
- [ ] 构建工具选择器组件
- [ ] 为 Agent 创建/编辑表单添加工具配置
- [ ] 将工具节点集成到流程编辑器
- [ ] 创建工具执行历史视图

### 第六阶段: 测试与完善 (第 6-7 周)
- [ ] 工具执行单元测试
- [ ] 聊天与工具集成的集成测试
- [ ] 限流测试
- [ ] 安全审查 (工具沙箱化)
- [ ] 文档完善

---

**当前状态**: 准备开始第一阶段 (后端基础设施)

## 9. 安全考虑

### 9.1 工具执行安全
1. **沙箱化**: 在隔离上下文中执行工具
2. **超时控制**: 强制执行最大执行时间
3. **资源限制**: 限制内存/CPU 使用
4. **输入验证**: 执行前验证所有参数

### 9.2 限流保护
1. **按工具限流**: 遵守外部 API 限流
2. **按用户限流**: 防止滥用
3. **成本追踪**: 监控 token/成本消耗

### 9.3 访问控制
1. **工具权限**: 用户只能使用启用的工具
2. **API 密钥安全**: 安全存储外部 API 密钥
3. **审计日志**: 记录所有工具执行

## 10. 参考资料

- [Jina.ai Reader API](https://jina.ai/reader/)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Agent 架构分析](/docs/agent-architecture-analysis.md)

---

**文档版本**: 1.0
**最后更新**: 2025-01-21
**状态**: 草稿 - 待审核
