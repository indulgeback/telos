# Agent Service

基于 CloudWego Eino 框架的 AI Agent 聊天服务。

## 功能特性

- 🤖 支持多种 LLM 提供商（OpenAI、DeepSeek、字节 Ark）
- 🌊 SSE 流式响应
- 🔧 简洁的 API 设计
- 📦 Docker 部署支持

## 支持的 LLM 提供商

| 提供商 | Provider 值 | 说明 |
|--------|-------------|------|
| OpenAI | `openai` | 标准 OpenAI API |
| DeepSeek | `deepseek` | DeepSeek API |
| 字节跳动 Ark | `ark` | 火山引擎 Ark API |

## 环境变量

```bash
# 服务配置
PORT=8895              # 服务端口
ENV=development        # 运行环境

# LLM 配置
LLM_PROVIDER=deepseek  # LLM 提供商
LLM_API_KEY=sk-xxx     # API 密钥
LLM_BASE_URL=...       # API 基础 URL
LLM_MODEL=...          # 模型名称
```

## API 端点

### POST /chat

流式聊天接口

**请求:**
```json
{
  "message": "你好，请介绍一下自己"
}
```

**响应 (SSE):**
```
data: {"content":"你好"}
data: {"content":"！"}
data: {"content":"我是"}
data: [DONE]
```

### GET /health

健康检查

### GET /ready

就绪检查

### GET /info

服务信息

## 本地开发

```bash
# 安装依赖
go mod download

# 运行服务
go run cmd/main.go
```

## Docker 部署

```bash
# 构建镜像
docker build -f services/agent-service/Dockerfile -t telos-agent-service .

# 运行容器
docker run -p 8895:8895 -e LLM_API_KEY=xxx telos-agent-service
```

## 技术栈

- **Go 1.23** - 编程语言
- **Eino** - AI 应用框架
- **Echo** - Web 框架
