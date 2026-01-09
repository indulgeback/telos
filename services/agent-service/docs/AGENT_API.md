# Agent Service API 文档

## 概述

Agent Service 是基于字节跳动 Eino 框架的可配置 AI Agent 服务，提供以下功能：

- Agent 配置管理 (创建、更新、删除、查询)
- 多种 Agent 类型支持 (Chain、ReAct、RAG、Graph)
- 对话管理和历史记录
- 工具调用能力
- 多 LLM 提供商支持 (OpenAI、Claude、豆包 Ark、Ollama)

## 基础信息

- **服务名称**: agent-service
- **端口**: 8895
- **版本**: 1.0.0

## API 端点

### 1. Agent 管理

#### 创建 Agent

```http
POST /api/v1/agents
Content-Type: application/json

{
  "name": "客服助手",
  "description": "处理客户咨询的 AI 助手",
  "type": "chain",
  "config": {
    "system_prompt": "你是一个专业的客服助手...",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

#### 获取 Agent 列表

```http
GET /api/v1/agents
```

#### 获取 Agent 详情

```http
GET /api/v1/agents/:id
```

#### 更新 Agent

```http
PUT /api/v1/agents/:id
Content-Type: application/json

{
  "name": "客服助手 v2",
  "enabled": true
}
```

#### 删除 Agent

```http
DELETE /api/v1/agents/:id
```

### 2. 对话管理

#### 创建对话

```http
POST /api/v1/conversations
Content-Type: application/json

{
  "agent_id": "agent-uuid",
  "user_id": "user-uuid"
}
```

#### 获取对话历史

```http
GET /api/v1/conversations/:id/history
```

### 3. Chat 接口

#### 发送消息

```http
POST /api/v1/chat
Content-Type: application/json

{
  "agent_id": "agent-uuid",
  "conversation_id": "conversation-uuid",
  "message": "你好，请介绍一下你的功能"
}
```

**响应示例**:

```json
{
  "response": "你好！我是基于 Eino 框架构建的 AI Agent..."
}
```

### 4. 健康检查

```http
GET /api/v1/health
```

## Agent 类型

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| `chain` | 链式处理 | 简单的 prompt → model → response |
| `react` | ReAct 循环 | 复杂任务规划、工具调用 |
| `rag` | 检索增强生成 | 知识库问答、文档助手 |
| `graph` | 自定义图 | 复杂业务流程编排 |

## 支持的 LLM 提供商

| 提供商 | 值 | 说明 |
|--------|-----|------|
| OpenAI | `openai` | GPT-4、GPT-3.5 等 |
| 豆包 | `ark` | 字节跳动豆包模型 |
| Ollama | `ollama` | 本地部署模型 |

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 8895 |
| `DB_HOST` | 数据库地址 | localhost |
| `REDIS_ADDR` | Redis 地址 | localhost:6379 |
| `LLM_PROVIDER` | LLM 提供商 | openai |
| `LLM_API_KEY` | API Key | - |
| `LLM_MODEL` | 模型名称 | gpt-4o-mini |

## 数据库表结构

### agents (Agent 配置)
- `id`: 主键
- `name`: 名称
- `type`: Agent 类型
- `config`: JSON 配置
- `enabled`: 是否启用

### conversations (对话)
- `id`: 主键
- `agent_id`: 关联的 Agent
- `user_id`: 用户 ID
- `title`: 对话标题

### messages (消息)
- `id`: 主键
- `conversation_id`: 对话 ID
- `role`: 角色 (user/assistant)
- `content`: 消息内容

### tool_definitions (工具定义)
- `id`: 主键
- `name`: 工具名称
- `type`: 工具类型
- `schema`: JSON Schema

## 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
