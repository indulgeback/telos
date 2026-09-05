# Telos：AI Agent 编排平台

[English Version](../README.md)

## 1. 项目简介

Telos 是一个基于现代微服务单体仓库架构的 AI Agent 编排平台。用户可以创建 Agent，为其配置技能、工具和 MCP 服务器并进行对话；平台以异步方式执行每一次 Agent Run，提供流式事件、工具调用审批、预算限制与完整的审计链路。

**项目亮点：**

- **Agent 工作台**：Agent 管理、技能/工具/MCP 绑定、多智能体关系
- **流式对话**：对接多家大模型服务商（DeepSeek、火山方舟 Seed、阿里百炼、OpenAI、Google Gemini、ShortAPI）
- **异步 Run 引擎**：队列 + 租约型 Worker、可断点续读的事件流、预算护栏、工具调用审批流、Outbox 模式持久化
- **实时语音**：基于 WebSocket 的火山实时语音
- **安全优先的网关**：边缘完成 Better Auth 会话校验，内部请求以 HMAC 签名 + Nonce 防重放转发
- **服务发现**：基于 Consul 的注册中心与健康检查，服务启动自动注册
- **Monorepo**：pnpm workspace 统一管理 TS 应用、Go 服务与共享包
- **统一日志**：自研 `tlog` 包为所有 Go 服务提供结构化日志

---

## 2. 架构总览

```plaintext
┌──────────────┐   ┌────────────────┐   ┌─────────────────┐
│  Web (Next)  │   │ Mobile (RN)    │   │ Admin (Vue+Vite)│
│    :8800     │   │ Metro :8081    │   │     :5174       │
└──────┬───────┘   └────────────────┘   └────────┬────────┘
       │                                         │
       ▼                                         ▼
┌────────────────────────────────┐   ┌──────────────────────────┐
│  API Gateway (Go Echo) :8890   │   │ admin-service (TS) :3002 │
│  - Better Auth 会话校验         │   └──────────────────────────┘
│  - 限流 / CORS                  │
│  - HMAC 签名转发                │
└──────────────┬─────────────────┘
               │ 签名请求
               ▼
┌────────────────────────────────────────────────┐
│  agent-service API (TypeScript Hono) :8895      │
│  agents · chat · runs · tools · skills · mcp ·  │
│  realtime                                       │
└──────┬───────────────┬────────────────┬────────┘
       │ BullMQ 队列    │                │
       ▼               │                │
┌──────────────────────┐                  │
│ agent-worker :8896   │                  │
│ 队列与租约执行器     │                  │
└──────────────────────┘                  │
       ▼               ▼                ▼
┌────────────┐  ┌───────────┐  ┌───────────────────────┐
│ PostgreSQL │  │   Redis   │  │ Registry (Go)         │
│  (Prisma)  │  │ 缓存/队列  │  │ REGISTRY_PORT (Consul)│
└────────────┘  └───────────┘  └───────────────────────┘
```

所有业务 API 均经由网关路由。网关校验用户 Better Auth 会话（会话由 Web 应用托管），再携带 HMAC 签名、时间戳与一次性 Nonce 转发到下游服务；下游服务拒绝任何不携带合法网关身份的请求。

---

## 3. 目录结构

```plaintext
telos/
├── apps/                        # 客户端与边缘应用
│   ├── web/                    # Next.js 15 前端（dashboard：agents/chat/skills/profile）
│   ├── mobile/                 # React Native 移动端
│   ├── admin/                  # Vue 3 + Vite 管理控制台 (:5174)
│   ├── api-gateway/            # API 网关 (Go Echo, :8890)
│   └── registry/               # 服务注册中心 (Go Echo, 基于 Consul)
├── services/                    # 后端微服务 (TypeScript)
│   ├── agent-service/          # AI Agent 编排服务 (:8895)
│   └── admin-service/          # 管理后台 API (:3002)
├── pkg/                         # 共享 Go 包（tlog）
├── prisma/                      # Prisma schema 与迁移（根级共享）
├── deploy/                      # 部署脚本（deploy.sh）
├── docs/                        # 文档
└── package.json                 # pnpm workspace 根配置
```

---

## 4. 技术选型

### 4.1 前端

- **Web (apps/web)**：Next.js 15 App Router、React 19、TypeScript 严格模式、Tailwind CSS、shadcn/ui（Radix）、next-intl（7 种语言：en / zh / tw / ko / ja / de / ru）、Zustand、React Hook Form + Zod、Better Auth SDK、Vitest
- **移动端 (apps/mobile)**：React Native、Metro 打包器、Jest
- **管理控制台 (apps/admin)**：Vue 3、Vite、Tailwind CSS v4

### 4.2 后端

- **Go 服务（Go ≥ 1.22）**：
  - 网关与注册中心均使用 Echo 框架
  - Viper 配置管理，`pkg/tlog` 结构化日志
  - 基于 Consul 的服务发现与健康检查
- **agent-service / admin-service（Node.js ≥ 22）**：
  - Hono HTTP 框架（`@hono/node-server`）
  - OpenAI Agents SDK + LangChain 做 Agent 编排
  - BullMQ（Redis）做异步 Run 排队
  - Prisma 7 + PostgreSQL 持久化（schema 位于仓库根目录统一管理）
  - Pino 结构化日志；`ws` 提供 WebSocket 实时语音

### 4.3 基础设施与工具

- Docker Compose（PostgreSQL 15、Redis 7）
- Husky git hooks + commitlint（约定式提交）
- ESLint + Prettier（TS），golangci-lint（Go）
- `.github/workflows/` 下的 GitHub Actions（basic-checks、docker-build、deploy）

---

## 5. 服务与端口

| 服务          | 默认端口              | 说明                                              |
| ------------- | --------------------- | ------------------------------------------------- |
| Web (Next.js) | `8800`                | 开发服务器；`next start` 使用 8802                |
| API Gateway   | `8890`                | 所有 `/api/*` 路由的入口                          |
| Agent API | `8895`                | Hono HTTP/SSE API；`/ready` 检查数据库与队列        |
| Agent Worker | `8896`                | 仅提供 `/health`、`/ready`；就绪状态检查本地执行器   |
| Registry      | `REGISTRY_PORT`       | `env.example` 默认 `8081`；生产 compose 为 `8891` |
| Admin Console | `5174`                | Vite 开发服务器                                   |
| Admin Service | `ADMIN_PORT` = `3002` | 管理后台 API                                      |
| Mobile Metro  | `8081`                | 仅开发使用                                        |
| PostgreSQL    | `5432`                | 主数据库（Prisma）                                |
| Redis         | `6379`                | 缓存、队列、鉴权缓存、Nonce                       |

网关路由表（均需有效会话）：`/api/agents`、`/api/tools`、`/api/skills`、`/api/mcp-servers`、`/api/runs`、`/api/agent`（聊天/SSE）、`/workspaces/shares`。

---

## 6. 核心能力

### 6.1 对话与 Agent（agent-service）

- SSE 流式聊天，支持逐条消息选择模型与重试
- 多服务商模型目录（DeepSeek、Seed/Ark、百炼、OpenAI、Gemini、ShortAPI）；Gemini 走 ADC 认证
- Agent 增删改查，支持绑定技能、内置/自定义工具与 MCP 服务器；包含图像生成工具
- 会话线程/消息/记忆持久化，支持受限的匿名 owner 模式

### 6.2 异步 Run 引擎

- Redis/BullMQ Run 队列，租约型 Worker（`AGENT_RUN_LEASE_MS`，Worker 并发数可配）
- 单次 Run 多维预算：输入字节、输出字符/token、工具调用次数、超时、预估成本上限
- 工具调用审批工作流，待审批项带 TTL
- Run 事件持久化用于追踪回放（`/api/runs`），事件游标可断点续读
- Outbox 模式（`AgentOutboxEvent`）保证领域事件可靠发布

### 6.3 安全模型

- Web 应用通过 [Better Auth](https://www.better-auth.com/) 承担认证（user/session/account 表位于同一 Prisma schema）
- 网关在代理转发前校验会话（带 TTL 缓存）
- 内部调用携带 HMAC 签名 + 时间戳 + Nonce；下游校验身份并拒绝重放（`GATEWAY_INTERNAL_SECRET`、`GATEWAY_NONCE_TTL_SECONDS`）
- 沙箱执行与内置命令执行均为显式开关（`SANDBOX_ENABLED`、`ENABLE_BUILTIN_RUN_COMMAND`）

---

## 7. 快速开始

### 7.1 环境要求

- Node.js ≥ 22 与 pnpm ≥ 10
- Go ≥ 1.22（网关与注册中心）
- Docker + Docker Compose（Postgres/Redis 或全栈）

### 7.2 本地开发

```bash
# 1. 安装依赖（Node + Go）
pnpm install:all

# 2. 启动基础设施
docker-compose up -d postgres redis

# 3. 准备环境文件（将各 *.env.example 复制为 .env）
cp services/agent-service/.env.example services/agent-service/.env
cp apps/web/.env.example apps/web/.env   # 如无示例文件则手动配置

# 4. 应用数据库 schema 并初始化技能数据
pnpm db:push                             # 或: npx prisma migrate deploy
pnpm --filter ./services/agent-service db:seed-skills

# 5. 启动服务（各自终端运行，或直接 docker compose）
pnpm agent-service:dev                   # API 监听 :8895
pnpm agent-worker:dev                    # worker 与健康检查监听 :8896
pnpm api-gateway:dev                     # API gateway 监听 :8890
pnpm registry:dev                        # registry 监听 $REGISTRY_PORT
pnpm web:dev                             # web 监听 :8800
```

开始对话前必须配置的环境变量：agent-service 中至少一个大模型密钥（如 `DEEPSEEK_API_KEY`），以及网关与下游共享的 `GATEWAY_INTERNAL_SECRET`。

### 7.3 测试与代码质量

```bash
# Web
pnpm --filter ./apps/web test            # Vitest 单次运行
pnpm --filter ./apps/web lint
pnpm --filter ./apps/web format:check

# Agent service
pnpm --filter ./services/agent-service test   # 先构建再跑 node:test 用例

# Go 服务（在 apps/api-gateway 或 apps/registry 目录下）
make test                                # go test ./...
make lint                                # golangci-lint
make fmt                                 # go fmt
```

---

## 8. 部署

- 生产全栈部署：`docker-compose.prod.yml`（web、gateway、registry、agent API、agent worker、Postgres、Redis）。进程拆分、健康检查、工作区存储与停止行为见[独立 Worker 指南](./independent-worker.md)。
- 脚本化部署：`deploy/deploy.sh`
- CI/CD：GitHub Actions 负责基础检查、镜像构建与部署。
- 生产部署会先停止旧 Agent worker、备份 PostgreSQL，再执行已审查的
  `prisma migrate deploy`；迁移账本核验通过后才启动新服务。

---

## 9. 配置管理

各服务均提供 `env.example` 说明所需变量。主要分组：

- **网关**：`PORT`、`REGISTRY_SERVICE_URL`、`BETTER_AUTH_BASE_URL`（会话校验地址）、`GATEWAY_INTERNAL_SECRET`、限流窗口/次数、鉴权缓存 TTL
- **Agent 服务**：各家模型密钥/Base URL（`DEEPSEEK_*`、`SEED_*`、`BAILIAN_*`、`OPENAI_*`、`SHORTAPI_*`）、`DATABASE_URL`、`REDIS_URL`、Run 引擎限额（`AGENT_RUN_*`）、功能开关（`SANDBOX_ENABLED`、`ENABLE_BUILTIN_RUN_COMMAND`、`ALLOW_SENSITIVE_TRACING`）
- **注册中心**：`REGISTRY_PORT`、Consul 连接配置
- **Web**：`NEXT_PUBLIC_API_URL`、Better Auth 密钥/OAuth 客户端凭证

严禁提交真实密钥或 `.env` 文件。

---

## 10. 贡献指南

1. Fork 并新建分支（如 `feature/xxx`、`fix/xxx`）
2. 保持风格一致：TS 使用 ESLint/Prettier，Go 使用 golangci-lint；pre-commit hooks 会强制检查
3. 新功能需附带测试，并保证现有用例通过
4. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范（commitlint 强制执行）：

```text
feat: add streaming retry for chat messages
fix: resume run event cursor after reconnect
```

---

## 11. 故障排查

### 服务注册失败

1. 确认注册中心已在 `$REGISTRY_PORT` 运行（本地默认 `8081`；`docker-compose.prod.yml` 为 `8891`）
2. 注册路径是 `POST /api/register`（不是 `/register`）
3. 检查注册服务的 `REGISTRY_URL` 与网关的 `REGISTRY_SERVICE_URL` 配置

### 数据库连接失败

1. 确保 Postgres 已启动（`docker-compose up -d postgres`）且 `DATABASE_URL` 指向它
2. 本地开发可用 `pnpm db:push`；生产环境只使用已审查的
   `prisma migrate deploy` 发布路径
3. 确认数据库/用户存在且权限充足

### 网关返回 401

1. Web 应用必须在线，网关才能校验 Better Auth 会话（`BETTER_AUTH_BASE_URL`）
2. 网关与下游服务的 `GATEWAY_INTERNAL_SECRET` 必须一致
3. 主机间时钟偏差过大会导致签名校验失败（`AUTH_CLOCK_SKEW_SECONDS`）

---

## 12. 联系方式

- **作者/维护者：** LeviLiu
- **邮箱：** <liuwenyu1937@outlook.com>
- **反馈：** 请使用 GitHub Issues

---

## 13. 许可证

本项目基于 **MIT License** 开源，详见 [LICENSE](../LICENSE) 文件。

详细许可说明见 [LICENSE_zh.md](./LICENSE_zh.md)。

---

**Telos Project Contributors** - Copyright (c) 2024
