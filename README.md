# Telos: AI Agent Orchestration Platform

[中文版 (Chinese Version)](./docs/README_zh.md)

**Author: LeviLiu**
**Email: <liuwenyu1937@outlook.com>**

## 1. Project Introduction

Telos is an AI agent orchestration platform built as a modern microservices monorepo. Users create agents, equip them with skills, tools and MCP servers, and chat with them — while the platform executes every agent run asynchronously with streaming events, plan approval flows, tool-call approvals, budget limits and full audit trails.

**Project Highlights:**

- **Agent workspace**: agent management, skill/tool/MCP binding, multi-agent relations, per-agent persona & voice configuration
- **Streaming chat** backed by multiple LLM providers (DeepSeek, Volcano Ark / Doubao Seed, Alibaba Bailian, OpenAI, Google Gemini via Vertex ADC, ShortAPI) with a 7-level thinking-depth control mapped per provider
- **Async run engine**: BullMQ queue + lease-based workers, resumable event cursors, budget guards, plan/tool-call approval flows, outbox-pattern persistence
- **Long-conversation compaction**: model-generated rolling summaries keep threads coherent beyond the raw context window
- **Realtime voice**: Volcano end-to-end full-duplex voice (Seeduplex) over WebSocket — the model decides, Telos executes tool calls and feeds results back mid-conversation
- **Integration protocols**: an A2A (Agent-to-Agent) JSON-RPC egress so external agents can drive Telos agents, and an AG-UI event stream endpoint for standard AG-UI clients
- **Image generation & web search**: Vertex AI image models (Nano Banana family) and a built-in web_search tool with citation-style source panels
- **Security-first gateway**: Better Auth session validation at the edge, HMAC-signed internal forwarding with nonce replay protection, explicit CORS allowlist
- **Service discovery**: Consul-backed registry with health checks; services self-register and re-register periodically
- **Monorepo** managed by pnpm workspaces covering TypeScript apps, Go services and shared packages
- **Unified logging** with the custom `tlog` package across all Go services

---

## 2. Architecture Overview

```plaintext
              ┌──────────────┐   ┌────────────────┐   ┌─────────────────┐
              │  Web (Next)  │   │ Mobile (Expo)  │   │ Admin (Vue+Vite)│
              │    :8800     │   │ scaffold       │   │     :5174       │
              └──────┬───────┘   └────────────────┘   └────────┬────────┘
                     │                                         │
                     ▼                                         ▼
   external  ┌────────────────────────────────┐   ┌──────────────────────────┐
   agents ──►│  API Gateway (Go Echo) :8890   │   │ admin-service (TS) :3002 │
   (A2A)     │  - Better Auth session check   │   └──────────────────────────┘
             │  - Rate limiting / CORS        │
             │  - HMAC-signed forwarding      │
             │  - /api/a2a public + Bearer    │
             └──────────────┬─────────────────┘
                            │ signed requests
                            ▼
             ┌────────────────────────────────────────────────┐
             │  agent-service API (TypeScript Hono) :8895      │
             │  agents · chat · runs · tools · skills · mcp ·  │
             │  realtime voice · a2a · agui                    │
             └──────┬───────────────┬────────────────┬────────┘
                    │ BullMQ jobs   │                │
                    ▼               │                │
             ┌──────────────────┐   │                │
             │ agent-worker     │   │                │
             │ :8896 queue +    │   │                │
             │ lease runner     │   │                │
             └──────────────────┘   │                │
                    ▼               ▼                ▼
             ┌────────────┐  ┌───────────┐  ┌───────────────────────┐
             │ PostgreSQL │  │   Redis   │  │ Registry (Go)         │
             │  (Prisma)  │  │ cache/queue│ │ REGISTRY_PORT (Consul)│
             └────────────┘  └───────────┘  └───────────────────────┘
```

All business APIs are routed through the gateway. The gateway validates the user's Better Auth session (hosted by the web app), then forwards requests to downstream services with an HMAC signature, timestamp and one-time nonce. Downstream services reject any request that does not carry a valid gateway identity.

The single exception is `/api/a2a`: a public JSON-RPC surface for external agent-to-agent calls, authenticated by its own `A2A_API_KEY` bearer token instead of a browser session.

---

## 3. Directory Structure

```plaintext
telos/
├── apps/                        # Client & edge applications
│   ├── web/                    # Next.js 16 frontend (landing, dashboard: agents/chat/skills/profile)
│   ├── mobile/                 # Expo (SDK 54) app — early scaffold
│   ├── admin/                  # Vue 3 + Vite admin console (:5174)
│   ├── api-gateway/            # API Gateway (Go Echo, :8890)
│   └── registry/               # Service registry (Go Echo, Consul-backed)
├── services/                    # Backend microservices (TypeScript)
│   ├── agent-service/          # AI agent orchestration service (:8895)
│   └── admin-service/          # Admin dashboard API (:3002)
├── pkg/                         # Shared Go packages (tlog)
├── prisma/                      # Prisma schema & migrations (root-level, shared)
├── deploy/                      # Deployment scripts (deploy.sh)
├── docs/                        # Documentation (A2A integration, worker guide, deployment…)
└── package.json                 # pnpm workspace root
```

---

## 4. Technology Stack

### 4.1 Frontend

- **Web (apps/web)**: Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, shadcn/ui (Radix), next-intl (7 locales: en / zh / tw / ko / ja / de / ru), Zustand, React Hook Form + Zod, Better Auth SDK, Vitest
- **Mobile (apps/mobile)**: Expo SDK 54 with expo-router — scaffold stage, not feature-complete
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
  - Pino structured logging; `ws` for the realtime voice WebSocket; `@google/genai` for Vertex AI image generation

### 4.3 Infrastructure & Tools

- Docker Compose (PostgreSQL 15, Redis 7) for development; `docker-compose.prod.yml` for full-stack production
- Husky git hooks + commitlint (conventional commits)
- ESLint + Prettier (TS), golangci-lint (Go)
- GitHub Actions workflows under `.github/workflows/`: basic checks, Docker image builds, and two deploy pipelines (registry pull and direct SCP)

---

## 5. Services & Ports

| Service       | Default Port          | Notes                                                   |
| ------------- | --------------------- | ------------------------------------------------------- |
| Web (Next.js) | `8800`                | dev server; `next start` uses 8802                      |
| API Gateway   | `8890`                | entry point for all `/api/*` routes                     |
| Agent API | `8895`                | Hono HTTP/SSE API; `/ready` checks database and queue       |
| Agent Worker | `8896`                | Worker-only `/health` and `/ready`; local execution readiness |
| Registry      | `REGISTRY_PORT`       | `.env.example` default `8081`; prod compose uses `8891` |
| Admin Console | `5174`                | Vite dev server                                         |
| Admin Service | `ADMIN_PORT` = `3002` | admin dashboard API                                     |
| Mobile Metro  | `8081`                | development only                                        |
| PostgreSQL    | `5432`                | primary datastore (Prisma)                              |
| Redis         | `6379`                | cache, queues, auth caches, nonces                      |

Gateway route table: `/api/agents`, `/api/tools`, `/api/skills`, `/api/mcp-servers`, `/api/runs`, `/api/agent` (chat/SSE), `/workspaces/shares` — all require a valid session. `/api/a2a` is public and authenticated with its own bearer key.

---

## 6. Core Capabilities

### 6.1 Chat & Agents (agent-service)

- Streaming chat over SSE with per-message model selection and retry support
- Multi-provider model catalog (DeepSeek, Doubao Seed/Ark, Bailian, OpenAI, Gemini via Vertex ADC, ShortAPI)
- **Thinking-depth control**: a 7-level effort scale (`off / minimal / low / medium / high / xhigh / max`) translated to each provider's native parameter — `reasoning_effort` for OpenAI-compatible APIs, `thinking_level` for Gemini, on/off thinking switches for Doubao and Qwen
- Agent CRUD with skills, built-in/custom tools and MCP servers attached
- **Plan mode**: the agent can propose a structured plan, wait for approval, then execute step by step with live progress
- Clarification questions and tool-call approval cards inline in the conversation
- **Built-in web search** with deduplicated citation markers `[n]`, clickable source pills and a sources panel
- **Image generation** tool backed by Vertex AI (Gemini image / Nano Banana family, global-region routing, text-to-image and image-to-image)
- Thread/message/memory persistence with anonymous-owner support gating

### 6.2 Async Run Engine

- Redis/BullMQ run queue with lease-based workers (`AGENT_RUN_LEASE_MS`, worker concurrency configurable)
- Per-run budgets: input bytes, output characters/tokens, tool-call count, timeout, estimated cost caps
- Tool-call approval workflow with TTL-bound pending approvals
- Run events persisted to a Redis stream with resumable cursors (`/api/runs`), DB as source of truth for terminal states
- Outbox pattern (`AgentOutboxEvent`) for reliable domain-event publishing

### 6.3 Long-Conversation Compaction

- When a thread grows past the recent-message window, a model-generated structured rolling summary (decisions, facts, artifacts, open questions) replaces naive truncation
- Summaries are injected into every subsequent run's system instructions; the naive concatenation remains as a failure fallback

### 6.4 Realtime Voice

- Volcano end-to-end full-duplex voice (Seeduplex) over a WebSocket bridge: uplink PCM audio in, streamed transcription + text + audio out
- **Voice function calling**: the voice model decides when to call tools; Telos executes them with the same permission model as text runs and feeds results back so the agent keeps talking
- Mute/unmute with keepalive signalling, reconnect with session resume, and graceful upstream-failure surfacing

### 6.5 Integration Protocols

- **A2A egress** (`/api/a2a`, [integration guide](./docs/a2a-integration.md)): JSON-RPC 2.0 with an agent card (`/.well-known/agent-card.json`), blocking `message/send` (falls back to `tasks/get` polling after 120s) and task status mapping — external agents can drive Telos agents through the documented protocol
- **AG-UI stream** (`/api/runs/:id/agui`): the internal run event stream translated to standard AG-UI events (`RUN_STARTED`, `TEXT_MESSAGE_*`, `THINKING_*`, `TOOL_CALL_*`, `RUN_FINISHED`), enabling off-the-shelf AG-UI clients to render Telos runs

### 6.6 Security Model

- Web app owns authentication via [Better Auth](https://www.better-auth.com/) (user/session/account tables live in the same Prisma schema)
- Gateway validates sessions (with TTL caching) before proxying; production CORS is an explicit origin allowlist
- Internal calls carry HMAC signatures + timestamps + nonces; downstream validates identity and rejects replays (`GATEWAY_INTERNAL_SECRET`, `GATEWAY_NONCE_TTL_SECONDS`)
- `ALLOW_ANONYMOUS_OWNER` enables anonymous ownership for local demos and is hard-refused in production

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

# 3. Prepare environment files (copy each env.example)
cp services/agent-service/.env.example services/agent-service/.env
cp apps/web/.env.example apps/web/.env
cp apps/api-gateway/env.example apps/api-gateway/.env
cp apps/registry/env.example apps/registry/.env

# 4. Apply database schema & seed skills
pnpm db:push                             # or: npx prisma migrate deploy
pnpm --filter ./services/agent-service db:seed-skills

# 5. Start services (each in its own terminal, or use docker compose)
pnpm agent-service:dev                   # API on :8895
pnpm agent-worker:dev                    # queue worker and health on :8896
pnpm api-gateway:dev                     # API gateway on :8890
pnpm registry:dev                        # registry on $REGISTRY_PORT
pnpm web:dev                             # web on :8800
```

Environment variables that must be set before chatting: at least one LLM provider key in agent-service (e.g. `DEEPSEEK_API_KEY`) plus `GATEWAY_INTERNAL_SECRET` shared between gateway and downstream services. Realtime voice additionally needs `VOLC_REALTIME_API_KEY`; image generation uses Google Cloud ADC credentials (`telos` project) with `VERTEX_IMAGE_MODEL`.

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

- Full-stack production: `docker-compose.prod.yml` (web, gateway, registry, agent API, agent worker, Postgres, Redis). See [the independent worker guide](./docs/independent-worker.md) for the process split, health semantics, workspace storage, and shutdown behavior, and [deployment.md](./docs/deployment.md) for environment topology.
- Scripted deploy: `deploy/deploy.sh <image-tag>` — pulls images, backs up PostgreSQL, runs `prisma migrate deploy`, recreates services and keeps a local rollback tag (`./deploy/deploy.sh <old-tag>` rolls back without touching GHCR).
- CI/CD: GitHub Actions build images on every push to `main` (`sha-<short-sha>` and `main` tags) and trigger the deploy workflow automatically; a direct-SCP pipeline (`deploy-scp.yml`) exists for networks where registry pulls are impractical.
- Production deploys stop the old Agent worker, back up PostgreSQL, run the reviewed migrations with `prisma migrate deploy`, verify the migration ledger, and only then start the new services.

---

## 9. Configuration Management

Each service ships an `env.example` describing its variables. Key groups:

- **Gateway**: `PORT`, `REGISTRY_SERVICE_URL`, `BETTER_AUTH_BASE_URL` (where sessions are validated), `GATEWAY_INTERNAL_SECRET`, `CORS_ORIGINS` (explicit allowlist; required for credentialed browser access), rate-limit window/requests, auth cache TTL
- **Agent service**: provider keys/base URLs (`DEEPSEEK_*`, `SEED_*`, `BAILIAN_*`, `OPENAI_*`, `SHORTAPI_*`), `DATABASE_URL`, `REDIS_URL`, run-engine limits (`AGENT_RUN_*`), realtime voice (`VOLC_REALTIME_API_KEY`, `VOLC_REALTIME_MODEL`, `VOLC_REALTIME_SPEAKER`), image generation (`VERTEX_IMAGE_MODEL`, Google Cloud ADC), A2A egress (`A2A_API_KEY`, `A2A_PUBLIC_BASE_URL`), `ALLOW_ANONYMOUS_OWNER`
- **Registry**: `REGISTRY_PORT`, Consul connection settings
- **Web**: `NEXT_PUBLIC_API_URL`, `BETTER_AUTH_SECRET` (required in production — the app refuses to boot without it), `BETTER_AUTH_URL`, OAuth client credentials

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
4. agent-service re-registers every 30 seconds, so a Consul restart self-heals within one interval

### Database connection issues

1. Ensure Postgres is up (`docker-compose up -d postgres`) and `DATABASE_URL` points at it
2. For local development, apply schema with `pnpm db:push`; for production,
   use only the reviewed `prisma migrate deploy` release path
3. Ensure the database/user exist and have sufficient privileges

### Gateway returns 401

1. The web app must be running so the gateway can validate Better Auth sessions (`BETTER_AUTH_BASE_URL`)
2. `GATEWAY_INTERNAL_SECRET` must match between gateway and downstream services
3. Large clock skews between hosts will trip signature validation (`AUTH_CLOCK_SKEW_SECONDS`)

### Realtime voice fails to connect

1. `VOLC_REALTIME_API_KEY` must be set and the Volcano account must have the full-duplex voice resource enabled
2. Volcano allows one concurrent voice session per key — a stuck session blocks the next one until it is closed
3. Check agent-service logs for `Voice toolset resolved` (session up) or `upstream_unauthorized` (credential/entitlement problem)

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

**Telos Project Contributors** - Copyright (c) 2024-2026
