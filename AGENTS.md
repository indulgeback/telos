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

### Backend (Go Microservices)
All Go services have consistent Makefiles in their root directory:
```bash
# From service directory (e.g., services/auth-service)
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
pnpm auth-service:dev                           # Start auth service
pnpm user-service:dev                           # Start user service
pnpm workflow-service:dev                       # Start workflow service
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
- Use absolute imports: `github.com/indulgeback/telos/services/auth-service/internal/model`

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

**Base Language:** Chinese (`zh`) - All translation keys must be defined first in `zh.json`

**How to Add New Translation Keys:**
1. Always add keys to `apps/web/src/lang/zh.json` first (base language)
2. When creating new pages, use `useTranslations('PageName')` hook
3. Keys are organized by page/component namespaces (e.g., `WorkflowsPage`, `IntegrationsPage`)
4. Do NOT translate data file content (categories, difficulty levels, etc.) - these stay in English

**Translation Files Location:**
- Base: `apps/web/src/lang/zh.json` (always update this first)
- Other languages: `apps/web/src/lang/{locale}.json` (18 languages total: en, ja, ko, de, fr, es, it, pt, ru, tr, th, id, pl, nl, nb, da, tr, tw)

**Example:**
```typescript
import { useTranslations } from 'next-intl'

export default function MyPage() {
  const t = useTranslations('MyPage')
  return <h1>{t('hero.title')}</h1>
}
```

```json
// apps/web/src/lang/zh.json
{
  "MyPage": {
    "hero": {
      "title": "我的页面标题"
    }
  }
}
```

## Service Architecture
- **API Gateway** (port 8890) - Routes requests to microservices, handles auth/rate limiting
- **Registry** (port 8891) - Service discovery and health checks (POST to `/api/register`)
- **Auth Service** (port 8892) - Authentication, JWT tokens, user sign-in/out
- **User Service** (port 8893) - User profile management, permissions
- **Workflow Service** (port 8894) - Workflow orchestration, task execution
- **Agent Service** - AI agent orchestration and execution
- All services register with Registry on startup
- Health check endpoints at `/health` on all services
