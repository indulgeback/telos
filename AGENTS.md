# Telos - Agent Guidelines

This document provides essential information for agentic coding agents working in the Telos monorepo.

## Build, Lint, and Test Commands

### Frontend (Web - Next.js)

```bash
# Development
pnpm web:dev                                    # Start dev server on port 8800
pnpm --filter ./apps/web build                  # Production build

# Code Quality
pnpm --filter ./apps/web lint                   # ESLint checks
pnpm --filter ./apps/web lint:fix               # Auto-fix lint issues
pnpm --filter ./apps/web format                 # Prettier formatting
pnpm --filter ./apps/web format:check           # Check formatting

# Testing (Vitest)
pnpm --filter ./apps/web test                   # Run all tests
pnpm --filter ./apps/web test --run             # Run tests once
pnpm --filter ./apps/web test src/path/to/file.test.ts  # Run single test
pnpm --filter ./apps/web test src/path/to/file.test.ts -t "test name"  # Run specific test
```

### Frontend (Mobile - React Native)

```bash
pnpm --filter ./apps/mobile start               # Start Metro bundler
pnpm --filter ./apps/mobile lint               # ESLint checks
```

### Backend (Agent Service - TypeScript)

```bash
pnpm --filter ./services/agent-service dev      # Start with tsx watch (port 8895)
pnpm --filter ./services/agent-service build    # Compile TypeScript (tsc)
pnpm --filter ./services/agent-service test     # Build + run node:test suites in test/
pnpm --filter ./services/agent-service lint     # ESLint over src/
```

Tests use Node's built-in test runner (`node --test`) and require a build first (`pnpm test` handles this).

### Backend (Go Microservices)

Both Go services (`apps/api-gateway`, `apps/registry`) have consistent Makefiles in their root directory:

```bash
# From service directory (e.g., apps/api-gateway or apps/registry)
make dev                                        # Hot reload with Air
make run                                        # Standard go run
make build                                      # Build binary to bin/
make test                                       # Run all tests (go test ./...)
make test ./path/to/package -run TestName       # Run single test
make fmt                                        # Format code (go fmt ./...)
make lint                                       # Run golangci-lint
make deps                                       # go mod tidy + download
make clean                                      # Remove build artifacts
```

### Root Commands

```bash
pnpm install:all                                # Install all dependencies (Node + Go)
pnpm api-gateway:dev                            # Start API gateway
pnpm registry:dev                               # Start service registry
pnpm agent-service:dev                          # Start agent service
docker-compose up -d                            # Start DB, Redis, etc.
```

## Code Style Guidelines

### Frontend (TypeScript/React)

**Formatting:**

- Use Prettier (configured in `.prettierrc`)
- No semicolons, single quotes, 80-char line width, 2-space indentation
- Run `pnpm --filter ./apps/web format` before committing

**Imports:**

- Use path alias `@/` for src imports: `import { Button } from '@/components'`
- Group imports: external libraries first, then internal modules
- Avoid deep nesting: prefer `@/lib/utils` over `@/components/atoms/button/utils`

**Component Structure:**

- Follow atomic design: `components/atoms/`, `components/molecules/`, `components/organisms/`
- File names: kebab-case (e.g., `user-avatar.tsx`)
- Component names: PascalCase (e.g., `UserAvatar`)
- Export components from `components/index.ts` for unified imports

**TypeScript:**

- Strict mode enabled
- Provide explicit types for component props
- Use `interface` for object shapes, `type` for unions/primitives
- Prefer `const assertions` over `as` casts

**React Patterns:**

- Use functional components with hooks
- Prefer `async/await` over `.then()` chains
- Use Zod for form validation with React Hook Form
- State management with Zustand for global state

### Backend (Go)

**Formatting:**

- Use `make fmt` (go fmt) before committing
- Run `make lint` (golangci-lint) for additional checks

**Imports:**

- Group imports: standard library first, then external packages, then internal packages
- Blank line between groups
- Use absolute imports: `github.com/indulgeback/telos/apps/api-gateway/internal/auth`

**Package Structure:**

- `cmd/main.go` - Application entry point
- `internal/` - Private application code (controller, service, repository, model, middleware, routes)
- `pkg/` - Public libraries (e.g., `pkg/tlog` for logging)
- Clean architecture: controller → service → repository

**Naming Conventions:**

- Exported names: PascalCase (`UserController`, `GetUser`)
- Private names: camelCase (`userRepo`, `getUser`)
- Interfaces: PascalCase, end with type name (`AuthService`, `UserRepository`)
- Constants: PascalCase (`JWT_SECRET`, `MAX_RETRIES`)
- Files: kebab-case (`auth_routes.go`, `user_repository.go`)

**Error Handling:**

- Always check errors, never ignore them
- Use structured logging with `tlog` package: `tlog.Error("message", "key", value)`
- Return errors from functions, don't panic in normal flow
- Wrap errors with context: `fmt.Errorf("failed to create user: %w", err)`
- Use status codes appropriately in HTTP responses

**Code Patterns:**

- Use dependency injection via constructor: `NewAuthService(repo)`
- Context-first functions: `func (s *Service) GetUser(ctx context.Context, id string) (*User, error)`
- Struct tags for JSON/GORM: `json:"user_id" gorm:"primaryKey"`
- Use interfaces for dependency abstraction

### General Rules

- Never commit secrets or `.env` files
- Follow conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, etc.
- Run linting commands before committing (pre-commit hooks enforce this)
- Write meaningful commit messages explaining "why" not just "what"
- Add unit tests for new features
- Keep functions focused and small (< 50 lines when possible)
- Use meaningful variable and function names

## Internationalization (i18n)

**Base Language:** English (`en`) - All translation keys must be defined first in `en.json`

**How to Add New Translation Keys:**

1. Always add keys to `apps/web/src/lang/en.json` first (base language)
2. When creating new pages, use `useTranslations('PageName')` hook
3. Keys are organized by page/component namespaces (e.g., `WorkflowsPage`, `IntegrationsPage`)
4. Do NOT translate data file content (categories, difficulty levels, etc.) - these stay in English

**Translation Files Location:**

- Base: `apps/web/src/lang/en.json` (always update this first)
- Other languages: `apps/web/src/lang/{locale}.json` (7 languages total: en, zh, tw, ko, ja, de, ru)

**Example:**

```typescript
import { useTranslations } from 'next-intl'

export default function MyPage() {
  const t = useTranslations('MyPage')
  return <h1>{t('hero.title')}</h1>
}
```

```json
// apps/web/src/lang/en.json
{
  "MyPage": {
    "hero": {
      "title": "My Page Title"
    }
  }
}
```

## Service Architecture

```
apps/web :8800 ──► api-gateway :8890 ──► agent-service :8895
                        │                     │    │    │
                        ▼                     ▼    │    ▼
                 registry ($REGISTRY_PORT)  Redis │ PostgreSQL (Prisma)
                 (Consul-backed, default          │
                  8081 locally / 8891 in prod)    ▼
                                             BullMQ queues
admin console :5174 ──► admin-service :3002 ─────────┘
```

- **Web** (`apps/web`, port 8800) - Next.js frontend; hosts Better Auth sessions and proxies all API calls through the gateway (`NEXT_PUBLIC_API_URL`)
- **API Gateway** (`apps/api-gateway`, port 8890) - Echo server. Validates Better Auth sessions, applies rate limiting/CORS, then forwards requests to downstream services with HMAC-signed identity headers (+ timestamp + nonce for replay protection). Route table lives in `cmd/main.go`
- **Registry** (`apps/registry`, port from `REGISTRY_PORT`: `8081` default per env.example, `8891` in docker-compose.prod.yml) - Consul-backed service discovery and health checks. Services self-register via `POST /api/register`
- **Agent Service** (`services/agent-service`, port 8895) - Hono + OpenAI Agents SDK/LangChain. Owns agents/chat/runs/tools/skills/mcp/realtime routes, the async run engine (BullMQ queue + lease workers + budgets + approvals), SSE event streams, and workspace file sharing. Health endpoint: `/ready`. Verifies gateway identity signatures (middleware `gatewayIdentity.ts`)
- **Admin Console + Admin Service** (`apps/admin` :5174, `services/admin-service` :ADMIN_PORT 3002) - Vue admin dashboard backed by its own TS service (auth/dashboard/models/skills routes)
- **Shared data**: root-level Prisma schema/migrations cover auth tables (Better Auth) and all agent domain models; Redis holds caches, queues, nonces and leases
- All services register with Registry on startup; gateway discovers them through `REGISTRY_SERVICE_URL`

---

## TODO / Future Features

### [FEAT-001] Async Agent System Prompt Generation

**Status:** 📋 Planned | **Priority:** Medium | **Owner:** @indulgeback

**Problem:**
Currently, when creating an Agent, the system prompt is generated synchronously by calling the LLM. This blocks the response and increases latency for the user.

**Proposed Solution: "Return First, Update Later"**

```
┌─────────┐      ┌─────────────┐      ┌──────────┐
│ Client  │ ───> │ Agent API   │ ───> │ Database │
└─────────┘      └─────────────┘      └──────────┘
                      │
                      ▼
               ┌─────────────┐
               │ Background  │ ───> LLM API ───> 更新 DB
               │ Task        │
               └─────────────┘
```

**Implementation Plan:**

1. **Backend Changes** (`services/agent-service/src/routes/agents.ts` + a new service under `src/services/`):
   - Create Agent with template-based prompt (immediate return)
   - Kick off a background task for LLM-based generation (in-process worker or BullMQ job; restart may drop in-flight work - see notes below)
   - Add new API endpoint: `PUT /api/agents/:id/regenerate-prompt`

2. **Frontend Enhancements**:
   - Add "Enhance Prompt" button on Agent detail page
   - Show prompt generation status (pending/completed/failed)
   - Allow manual retry if generation fails

3. **Error Handling**:
   - If LLM fails, log error but keep template prompt
   - Add retry mechanism for failed generations

**User's Optimization Notes:**

- Service restart may lose in-flight tasks (acceptable trade-off)
- Frontend "Enhance Prompt" button provides user control
- Retry capability ensures better UX

**Files to Modify:**


- `services/agent-service/src/routes/agents.ts` - Add regenerate endpoint & async kickoff
- `services/agent-service/src/services/default-agent.ts` (or new generation service) - Add async generation
- `apps/web/src/app/[locale]/(dashboard)/agents/components/` - Add enhance button
- `apps/web/src/service/agent.ts` - Add regenerate API call
