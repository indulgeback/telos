# Telos: AI Agent Orchestration Platform

[中文版 (Chinese Version)](./docs/README_zh.md)

**Author: LeviLiu**
**Email: <liuwenyu1937@outlook.com>**

## 1. Project Introduction

Telos is an AI agent orchestration platform built as a modern microservices monorepo. Users create agents, equip them with skills, tools and MCP servers, and chat with them — while the platform executes every agent run asynchronously with streaming events, tool-call approvals, budget limits and full audit trails.

**Project Highlights:**

- **Agent workspace**: agent management, skill/tool/MCP binding, multi-agent relations
- **Streaming chat** backed by multiple LLM providers (DeepSeek, Volcano Ark / Seed, Alibaba Bailian, OpenAI, Google Gemini, ShortAPI)
- **Async run engine**: queue + lease-based workers, event streams with resumable cursors, budget guards, tool-call approval flows, outbox-pattern persistence
- **Realtime voice** (Volcano realtime audio) via WebSocket
- **Security-first gateway**: Better Auth session validation at the edge, HMAC-signed internal request forwarding with nonce replay protection
- **Service discovery**: Consul-backed registry with health checks; services self-register on startup
- **Monorepo** managed by pnpm workspaces covering TypeScript apps, Go services and shared packages
- **Unified logging** with the custom `tlog` package across all Go services

---

## 2. Architecture Overview

```plaintext
┌──────────────┐   ┌────────────────┐   ┌─────────────────┐
│  Web (Next)  │   │ Mobile (RN)    │   │ Admin (Vue+Vite)│
│    :8800     │   │ Metro :8081    │   │     :5174       │
└──────┬───────┘   └────────────────┘   └────────┬────────┘
       │                                         │
       ▼                                         ▼
┌────────────────────────────────┐   ┌──────────────────────────┐
│  API Gateway (Go Echo) :8890   │   │ admin-service (TS) :3002 │
│  - Better Auth session check   │   └──────────────────────────┘
│  - Rate limiting / CORS        │
│  - HMAC-signed forwarding      │
└──────────────┬─────────────────┘
               │ signed requests
               ▼
┌────────────────────────────────────────────────┐
│  agent-service (TypeScript Hono) :8895          │
│  agents · chat · runs · tools · skills · mcp ·  │
│  realtime                                       │
└──────┬───────────────┬────────────────┬────────┘
       ▼               ▼                ▼
┌────────────┐  ┌───────────┐  ┌───────────────────────┐
│ PostgreSQL │  │   Redis   │  │ Registry (Go)         │
│  (Prisma)  │  │ cache/queue│ │ REGISTRY_PORT (Consul)│
└────────────┘  └───────────┘  └───────────────────────┘
```

All business APIs are routed through the gateway. The gateway validates the user's Better Auth session (hosted by the web app), then forwards requests to downstream services with an HMAC signature, timestamp and one-time nonce. Downstream services reject any request that does not carry a valid gateway identity.

---

## 3. Directory Structure

```plaintext
telos/
├── apps/                        # Client & edge applications
│   ├── web/                    # Next.js 15 frontend (dashboard: agents/chat/skills/profile)
│   ├── mobile/                 # React Native mobile app
│   ├── admin/                  # Vue 3 + Vite admin console (:5174)
│   ├── api-gateway/            # API Gateway (Go Echo, :8890)
│   └── registry/               # Service registry (Go Echo, Consul-backed)
├── services/                    # Backend microservices (TypeScript)
│   ├── agent-service/          # AI agent orchestration service (:8895)
│   └── admin-service/          # Admin dashboard API (:3002)
├── pkg/                         # Shared Go packages (tlog)
├── prisma/                      # Prisma schema & migrations (root-level, shared)
├── deploy/                      # Deployment scripts (deploy.sh)
├── docs/                        # Documentation
└── package.json                 # pnpm workspace root
```

---

## 4. Technology Stack

### 4.1 Frontend

- **Web (apps/web)**: Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS, shadcn/ui (Radix), next-intl (7 locales: en / zh / tw / ko / ja / de / ru), Zustand, React Hook Form + Zod, Better Auth SDK, Vitest
- **Mobile (apps/mobile)**: React Native, Metro bundler, Jest
- **Admin console (apps/admin)**: Vue 3, Vite, Tailwind CSS v4

### 4.2 Backend

- **Go services (Go ≥ 1.22)**:
  - Echo for both the gateway and the registry
  - Viper for configuration, `pkg/tlog` for structured logging
  - Consul-backed service discovery with health checks
- **agent-service / admin-service (Node.js ≥ 22)**:
  - Hono HTTP framework (`@hono/node-server`)
  - OpenAI Agents SDK + LangChain for agent orchestration
  - BullMQ (Redis) for async run queuing
  - Prisma 7 + PostgreSQL for persistence (schema shared at repo root)
  - Pino structured logging; `ws` for WebSocket realtime voice

### 4.3 Infrastructure & Tools

- Docker Compose (PostgreSQL 15, Redis 7)
- Husky git hooks + commitlint (conventional commits)
- ESLint + Prettier (TS), golangci-lint (Go)
- GitHub Actions workflows under `.github/workflows/` (basic-checks, docker-build, deploy)

---

## 5. Services & Ports

| Service       | Default Port          | Notes                                                   |
| ------------- | --------------------- | ------------------------------------------------------- |
| Web (Next.js) | `8800`                | dev server; `next start` uses 8802                      |
| API Gateway   | `8890`                | entry point for all `/api/*` routes                     |
| Agent Service | `8895`                | Hono server, `/ready` health endpoint                   |
| Registry      | `REGISTRY_PORT`       | `.env.example` default `8081`; prod compose uses `8891` |
| Admin Console | `5174`                | Vite dev server                                         |
| Admin Service | `ADMIN_PORT` = `3002` | admin dashboard API                                     |
| Mobile Metro  | `8081`                | development only                                        |
| PostgreSQL    | `5432`                | primary datastore (Prisma)                              |
| Redis         | `6379`                | cache, queues, auth caches, nonces                      |

Gateway route table (all require a valid session): `/api/agents`, `/api/tools`, `/api/skills`, `/api/mcp-servers`, `/api/runs`, `/api/agent` (chat/SSE), `/workspaces/shares`.

---

## 6. Core Capabilities

### 6.1 Chat & Agents (agent-service)

- Streaming chat over SSE with per-message model selection and retry support
- Multi-provider model catalog (DeepSeek, Seed/Ark, Bailian, OpenAI, Gemini, ShortAPI); Gemini authenticates via ADC
- Agent CRUD with skills, built-in/custom tools and MCP servers attached; image generation tools included
- Thread/message/memory persistence with anonymous-owner support gating

### 6.2 Async Run Engine

- Redis/BullMQ run queue with lease-based workers (`AGENT_RUN_LEASE_MS`, worker concurrency configurable)
- Per-run budgets: input bytes, output characters/tokens, tool-call count, timeout, estimated cost caps
- Tool-call approval workflow with TTL-bound pending approvals
- Run events persisted for trace/replay (`/api/runs`), resumable event cursors
- Outbox pattern (`AgentOutboxEvent`) for reliable domain-event publishing

### 6.3 Security Model

- Web app owns authentication via [Better Auth](https://www.better-auth.com/) (user/session/account tables live in the same Prisma schema)
- Gateway validates sessions (with TTL caching) before proxying
- Internal calls carry HMAC signatures + timestamps + nonces; downstream validates identity and rejects replays (`GATEWAY_INTERNAL_SECRET`, `GATEWAY_NONCE_TTL_SECONDS`)
- Sandbox execution and built-in command execution are opt-in flags (`SANDBOX_ENABLED`, `ENABLE_BUILTIN_RUN_COMMAND`)

---

## 7. Quick Start

### 7.1 Prerequisites

- Node.js ≥ 22 and pnpm ≥ 10
- Go ≥ 1.22 (for gateway & registry)
- Docker + Docker Compose (for Postgres/Redis, or full-stack)

### 7.2 Local Development

```bash
# 1. Install dependencies (Node + Go)
pnpm install:all

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Prepare environment files (copy each *.env.example to .env)
cp services/agent-service/.env.example services/agent-service/.env
cp apps/web/.env.example apps/web/.env   # if present; else configure manually

# 4. Apply database schema & seed skills
pnpm db:push                             # or: npx prisma migrate deploy
pnpm --filter ./services/agent-service db:seed-skills

# 5. Start services (each in its own terminal, or use docker compose)
pnpm agent-service:dev                   # agent service on :8895
pnpm api-gateway:dev                     # API gateway on :8890
pnpm registry:dev                        # registry on $REGISTRY_PORT
pnpm web:dev                             # web on :8800
```

Environment variables that must be set before chatting: at least one LLM provider key in agent-service (e.g. `DEEPSEEK_API_KEY`) plus `GATEWAY_INTERNAL_SECRET` shared between gateway and downstream services.

### 7.3 Testing & Code Quality

```bash
# Web
pnpm --filter ./apps/web test            # Vitest once-through
pnpm --filter ./apps/web lint
pnpm --filter ./apps/web format:check

# Agent service
pnpm --filter ./services/agent-service test   # builds then runs node:test suites

# Go services (run inside apps/api-gateway or apps/registry)
make test                                # go test ./...
make lint                                # golangci-lint
make fmt                                 # go fmt
```

---

## 8. Deployment

- Full-stack production: `docker-compose.prod.yml` (web, gateway, registry, agent-service, Postgres, Redis). See header comments inside the file for topology.
- Scripted deploy: `deploy/deploy.sh`
- CI/CD: GitHub Actions workflows handle basic checks, image builds and deployment.
- Production deploys stop the old Agent worker, back up PostgreSQL, run the
  reviewed migrations with `prisma migrate deploy`, verify the migration
  ledger, and only then start the new services.

---

## 9. Configuration Management

Each service ships an `env.example` describing its variables. Key groups:

- **Gateway**: `PORT`, `REGISTRY_SERVICE_URL`, `BETTER_AUTH_BASE_URL` (where sessions are validated), `GATEWAY_INTERNAL_SECRET`, rate-limit window/requests, auth cache TTL
- **Agent service**: provider keys/base URLs (`DEEPSEEK_*`, `SEED_*`, `BAILIAN_*`, `OPENAI_*`, `SHORTAPI_*`), `DATABASE_URL`, `REDIS_URL`, run-engine limits (`AGENT_RUN_*`), feature flags (`SANDBOX_ENABLED`, `ENABLE_BUILTIN_RUN_COMMAND`, `ALLOW_SENSITIVE_TRACING`)
- **Registry**: `REGISTRY_PORT`, Consul connection settings
- **Web**: `NEXT_PUBLIC_API_URL`, Better Auth secrets/OAuth client credentials

Never commit real secrets or `.env` files.

---

## 10. Contribution Guide

1. Fork and branch (e.g. `feature/xxx`, `fix/xxx`)
2. Keep style consistent: ESLint/Prettier for TS, golangci-lint for Go; pre-commit hooks enforce this
3. Add tests for new features and make sure existing suites pass
4. Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) — enforced by commitlint:

```text
feat: add streaming retry for chat messages
fix: resume run event cursor after reconnect
```

---

## 11. Troubleshooting

### Service registration issues

1. Confirm the registry is running on `$REGISTRY_PORT` (default `8081` locally; `docker-compose.prod.yml` sets `8891`)
2. Registration endpoint is `POST /api/register` (not `/register`)
3. Check `REGISTRY_URL` on registering services and `REGISTRY_SERVICE_URL` on the gateway

### Database connection issues

1. Ensure Postgres is up (`docker-compose up -d postgres`) and `DATABASE_URL` points at it
2. For local development, apply schema with `pnpm db:push`; for production,
   use only the reviewed `prisma migrate deploy` release path
3. Ensure the database/user exist and have sufficient privileges

### Gateway returns 401

1. The web app must be running so the gateway can validate Better Auth sessions (`BETTER_AUTH_BASE_URL`)
2. `GATEWAY_INTERNAL_SECRET` must match between gateway and downstream services
3. Large clock skews between hosts will trip signature validation (`AUTH_CLOCK_SKEW_SECONDS`)

---

## 12. Contact

- **Author/Maintainer:** LeviLiu
- **Email:** <liuwenyu1937@outlook.com>
- **Issues:** Please use GitHub Issues for feedback and suggestions

---

## 13. License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

For detailed license information and usage guidelines, see [docs/LICENSE_zh.md](docs/LICENSE_zh.md).

---

**Telos Project Contributors** - Copyright (c) 2024
