# Agent Service (TypeScript)

基于 LangChain.js 的 AI Agent 服务，使用 AI SDK 的 UI Message 流式响应。

## 技术栈

- **Node.js** + **TypeScript**
- **LangChain.js** - AI 应用框架
- **DeepSeek** - LLM 提供商
- **Express** - HTTP 服务器
- **Prisma** - ORM
- **PostgreSQL** - 数据库

## 功能特性

- ✅ 流式聊天响应（SSE）
- ✅ 简单聊天（AI SDK UI Message stream）
- ✅ 内置工具（计算器、时间）
- ✅ Agent 管理

## 项目结构

```
agent-service-ts/
├── prisma/
│   └── schema.prisma      # 数据库模型
├── src/
│   ├── config/            # 配置
│   │   └── index.ts
│   ├── routes/            # API 路由
│   │   ├── chat.ts        # 聊天接口
│   │   └── agents.ts      # Agent 管理
│   ├── services/          # 业务逻辑
│   │   └── db.ts          # 数据库服务
│   ├── types/             # 类型定义
│   │   └── index.ts
│   └── index.ts           # 主入口
├── package.json
├── tsconfig.json
└── .env.example
```

## 快速开始

### 1. 安装依赖

```bash
cd services/agent-service-ts
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/telos"
DEEPSEEK_API_KEY="sk-xxxxxxxxxxxxxx"
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"
# 可选：OpenAI-compatible 配置
# AI_API_KEY="sk-xxxxxxxxxxxxxx"
# AI_MODEL="deepseek-chat"
# AI_BASE_URL="https://api.deepseek.com/v1"
PORT=3001
NODE_ENV="development"
LOG_LEVEL="info"
```

### 3. 初始化数据库

```bash
npm run db:generate
npm run db:push
```

### 4. 启动服务

```bash
npm run dev
```

## API 接口

### 聊天接口

**POST** `/api/agent`（推荐）

请求体：
```json
{
  "message": "帮我计算 123 + 456"
}
```

响应为 AI SDK UI Message stream。
| GET | `/api/agents/:id/tools` | 获取 Agent 的工具 |
| PUT | `/api/agents/:id/tools` | 设置 Agent 的工具 |

### Agent 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents` | 获取 Agent 列表 |
| GET | `/api/agents/:id` | 获取 Agent 详情 |
| GET | `/api/agents/default` | 获取默认 Agent |
| POST | `/api/agents` | 创建 Agent |
| PUT | `/api/agents/:id` | 更新 Agent |
| DELETE | `/api/agents/:id` | 删除 Agent |

## 内置工具

### 计算器 (calculator)

执行数学运算，支持加法、减法、乘法、除法。

参数：
- `operation`: 运算类型（add/subtract/multiply/divide）
- `a`: 第一个数字
- `b`: 第二个数字

### 当前时间 (get_current_time)

获取指定时区的当前时间。

参数：
- `timezone`: 时区标识符（可选，默认 Asia/Shanghai）

## 工具定义示例

```json
{
  "id": "jina-reader",
  "name": "web_reader",
  "type": "invokable",
  "displayName": "Jina 网页阅读器",
  "description": "从任意 URL 读取并提取 LLM 友好的内容",
  "category": "web",
  "endpoint": {
    "url_template": "https://r.jina.ai/{url}",
    "method": "GET",
    "headers": {
      "X-With-Generated-Alt": "true"
    },
    "auth": {
      "type": "bearer",
      "tokenEnv": "JINA_READER_API_TOKEN"
    }
  },
  "parameters": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "要读取的网页 URL",
        "required": true
      }
    },
    "required": ["url"]
  },
  "enabled": true
}
```

## 开发

### 构建

```bash
npm run build
```

### 生产运行

```bash
npm start
```

### 数据库迁移

```bash
# 生成 Prisma Client
npm run db:generate

# 推送 schema 到数据库
npm run db:push

# 运行迁移
npm run db:migrate

# 打开 Prisma Studio
npm run db:studio
```

## 与 Go 版本的对比

| 特性 | Go 版本 | TypeScript 版本 |
|------|---------|-----------------|
| 框架 | Eino | LangChain.js |
| 工具调用 | ReAct Agent | Tool Calling Agent |
| 流式响应 | 需要 fallback 机制 | 原生支持 |
| 复杂度 | 较高 | 较低 |
| 生态 | 较新 | 成熟 |
