# Tool Calling 工具调用系统设计文档

## 概述

本文档描述了 Telos 项目中 AI Agent 工具调用系统的设计和实现。该系统允许 AI Agent 动态调用外部工具来扩展其能力。

## 架构

### 核心组件

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                    (端口 8890)                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Service                               │
│                    (端口 8895)                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    ChatService                             │  │
│  │  - ChatStream           普通流式聊天                     │  │
│  │  - Chat                 非流式聊天                         │  │
│  │  - ChatStreamWithTools  支持工具调用的聊天                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   ToolService                              │  │
│  │  - CreateTool/UpdateTool/DeleteTool                     │  │
│  │  - GetEinoToolsForAgent   为 Agent 加载可用工具           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              GenericToolExecutor                          │  │
│  │  - Execute     执行工具（HTTP 或内部工具）                │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL 数据库                              │
│  - tools              工具定义表                                  │
│  - agent_tools       Agent 与工具的关联表                      │
│  - tool_executions  工具执行记录表                              │
└─────────────────────────────────────────────────────────────────┘
```

## 数据模型

### 1. Tool (工具定义)

```go
type Tool struct {
    ID                string             `json:"id"`
    Name              string             `json:"name"`
    Type              ToolType           `json:"type"`        // invokable/streamable
    DisplayName       string             `json:"display_name"`
    Description       string             `json:"description"`
    Category          string             `json:"category"`
    Endpoint          EndpointConfig     `json:"endpoint"`      // HTTP 配置
    Parameters        ParametersDef      `json:"parameters"`    // JSON Schema 参数
    ResponseTransform ResponseTransform  `json:"response_transform"`
    Enabled           bool               `json:"enabled"`
}
```

### 2. EndpointConfig (HTTP 端点配置)

```go
type EndpointConfig struct {
    URLTemplate string       `json:"url_template"`  // 支持 {param} 占位符
    Method      string       `json:"method"`         // GET/POST/PUT/DELETE
    Headers     map[string]string `json:"headers"`
    Auth        *AuthConfig  `json:"auth"`
    Timeout     int          `json:"timeout"`
}
```

### 3. AuthConfig (认证配置)

```go
type AuthType string
const (
    AuthTypeNone     AuthType = "none"
    AuthTypeBearer   AuthType = "bearer"
    AuthTypeAPIKey   AuthType = "api_key"
    AuthTypeBasic    AuthType = "basic"
)
```

### 4. ParametersDef (参数定义 - JSON Schema)

```go
type ParametersDef struct {
    Type       string                      `json:"type"`       // "object"
    Properties map[string]*ParameterDef     `json:"properties"`
    Required   []string                    `json:"required"`   // 必填参数名列表
}
```

## 核心实现

### 1. ReAct Agent 集成

使用 Cloudwego Eino 框架的 ReAct Agent 实现：

```go
agentConfig := &react.AgentConfig{
    ToolCallingModel: s.chatModel,  // DeepSeek ToolCallingChatModel
    ToolsConfig: compose.ToolsNodeConfig{
        Tools: tools,  // []tool.BaseTool
    },
    MaxStep: 10,  // 最多执行 10 轮工具调用
}

agent, err := react.NewAgent(ctx, agentConfig)
response, err := agent.Generate(ctx, messages)
```

### 2. 工具包装器 (DynamicToolWrapper)

将数据库中的工具定义包装为 Eino 的 `InvokableTool`：

```go
type DynamicToolWrapper struct {
    tool     *model.Tool
    executor *GenericToolExecutor
}

// Info 返回工具信息给 Eino
func (w *DynamicToolWrapper) Info(ctx context.Context) (*schema.ToolInfo, error)

// InvokableRun 执行工具
func (w *DynamicToolWrapper) InvokableRun(ctx context.Context, argumentsInJSON string) (string, error)
```

### 3. 工具执行器 (GenericToolExecutor)

支持两种类型的工具：

#### HTTP 工具
- 替换 URL 模板中的参数
- 添加认证头
- 发送 HTTP 请求
- 提取和转换响应

#### 内部工具 (Internal Tools)
- `internal://calculator` - 数学计算
- `internal://time` - 获取当前时间

## 工具调用流程

```
1. 用户发送消息 (带 X-Agent-ID 头)
                 │
                 ▼
2. Handler 获取 Agent 配置的工具
                 │
                 ▼
3. 创建 ReAct Agent (绑定工具)
                 │
                 ▼
4. Agent 调用 DeepSeek 模型
                 │
                 ▼
5. DeepSeek 决定是否调用工具
        ┌────────┴────────┐
        │                 │
    直接回答          返回 ToolCall
        │                 │
        ▼                 ▼
   返回结果        6. 执行工具
                     │
                     ▼
                  7. 返回工具结果给 Agent
                     │
                     ▼
                  8. Agent 继续调用模型
                     │
                     ▼
                  返回最终响应给用户
```

## DeepSeek 工具调用注意事项

### Tool Choice 模式

DeepSeek 使用 `tool_choice` 参数控制工具调用行为：

- `none` - 模型不调用任何工具
- `auto` - 模型可以自主选择是否调用工具（默认）
- `required` - 模型必须调用至少一个工具
- `{"type": "function", "function": {"name": "tool_name"}}` - 强制调用特定工具

### 模型行为

当使用 `auto` 模式时，DeepSeek 模型会根据问题的复杂度决定是否调用工具：
- **简单问题**（如基础数学计算）：模型可能直接回答而不调用工具
- **复杂问题**（如需要实时数据）：模型更可能调用工具

### 建议

1. 在 Agent 的 System Prompt 中明确告诉模型有工具可用
2. 为工具提供清晰的描述和参数说明
3. 对于必须使用工具的场景，考虑使用 `tool_choice=required`

## API 使用

### 发起工具调用聊天

```bash
curl -X POST http://localhost:8890/api/agent \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: {agent_id}" \
  -d '{
    "message": "请计算 25 乘以 4"
  }'
```

### 响应格式 (SSE)

```
data: {"content":"响应内容1"}
data: {"content":"响应内容2"}
data: [DONE]
```

## 数据库 Schema

### tools 表

```sql
CREATE TABLE tools (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'invokable',
    display_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'custom',
    endpoint JSONB NOT NULL,
    parameters JSONB NOT NULL,
    response_transform JSONB,
    rate_limit JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0.0',
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### agent_tools 表

```sql
CREATE TABLE agent_tools (
    id VARCHAR(36) PRIMARY KEY,
    agent_id VARCHAR(36) NOT NULL,
    tool_id VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (tool_id) REFERENCES tools(id)
);
```

## 工具类型

### InvokableTool (同步调用)
- 适用于快速操作（< 5 秒）
- 一次性返回完整结果

### StreamableTool (流式调用)
- 适用于长时间运行的操作
- 支持增量返回结果

## 认证类型支持

| 类型 | 说明 | 环境变量 |
|------|------|----------|
| `none` | 无需认证 | - |
| `bearer` | Bearer Token | `{TokenEnv}_TOKEN` |
| `api_key` | API Key | `{TokenEnv}_API_KEY` |
| `basic` | HTTP Basic | `Username` + `Password` 字段 |

## 相关文件

| 文件 | 说明 |
|------|------|
| `services/agent-service/internal/service/chat.go` | 聊天服务，ReAct Agent 集成 |
| `services/agent-service/internal/service/tool.go` | 工具服务接口 |
| `services/agent-service/internal/pkg/tool/dynamic_wrapper.go` | 工具包装器 |
| `services/agent-service/internal/pkg/tool/generic_executor.go` | 工具执行器 |
| `services/agent-service/internal/handler/chat.go` | HTTP 处理器 |
| `services/agent-service/internal/model/tool.go` | 数据模型 |
| `services/agent-service/internal/repository/` | 数据访问层 |

## 参考资料

- [Cloudwego Eino](https://github.com/cloudwego/eino)
- [Eino ReAct Agent](https://github.com/cloudwego/eino/tree/main/flow/agent/react)
- [DeepSeek API](https://api-docs.deepseek.com/)
- [tool_call_reasoning 示例](https://github.com/cloudwego/eino-ext/tree/main/components/model/deepseek/examples/tool_call_reasoning)
