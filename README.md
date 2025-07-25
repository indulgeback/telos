# Telos: Intelligent Workflow Orchestration Agent

[中文版 (Chinese Version)](./docs/README_zh.md)

**Author: LeviLiu**  
**Email: <liuwenyu1937@outlook.com>**

## 1. Project Introduction

Telos is an intelligent workflow orchestration agent platform designed for enterprise-level automation scenarios. The system implements automated task scheduling, management, and execution through a modern microservices architecture.

**Project Highlights:**

- **Next.js 15** frontend with App Router and React 19 concurrent features
- **Go microservices** backend with high performance and easy scalability  
- **Service discovery** with built-in registry and health checks
- **Multi-language support** with internationalization for 18 languages
- **Visual workflow builder** based on React Flow components
- **Monorepo management** for unified dependencies and streamlined development
- **Unified logging** with custom tlog package for structured logging across all services

---

## 2. Directory Structure

```plaintext
telos/
├── apps/                   # Application Layer
│   ├── web/               # Next.js Frontend Application
│   ├── api-gateway/       # API Gateway (Go Echo)
│   └── registry/          # Service Registry (Go Echo)
├── services/              # Microservices Layer
│   ├── auth-service/      # Authentication Service (Go Gin)
│   ├── user-service/      # User Management Service (Go Gin)
│   └── workflow-service/  # Workflow Orchestration Service (Go Gin)
├── packages/              # Shared Packages (Future)
├── docs/                  # Documentation
├── pkg/                   # Shared Go Packages
├── node_modules/          # Root Dependencies
└── package.json           # Monorepo Configuration
```

---

## 3. Technology Stack

### 3.1 Frontend Stack

- **Next.js 15**: App Router with server components and SSR
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full application strict type checking
- **Tailwind CSS 4**: Utility-first CSS framework
- **Shadcn UI**: Component library built on Radix UI primitives
- **Next-intl**: Internationalization supporting 18 languages
- **React Flow**: Visual workflow builder components
- **Zustand**: Lightweight state management
- **React Hook Form + Zod**: Form handling and validation

### 3.2 Backend Stack

- **Go 1.24.4**: High-performance backend services
- **Gin**: Web framework for microservice business logic
- **Echo**: Lightweight framework for API Gateway and Registry
- **GORM**: Database ORM operations
- **Viper**: Configuration management with .env support
- **JWT**: Authentication and authorization
- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage

### 3.3 Infrastructure & Tools

- **Docker**: Containerization for all services
- **Air**: Hot reload for Go development
- **Husky**: Git hooks for code quality
- **Commitlint**: Conventional commit standards
- **ESLint + Prettier**: Code formatting and linting
- **golangci-lint**: Go code quality checks

---

## 4. Quick Start

### 4.1 Frontend Development

```bash
# Development
pnpm web:dev                    # Start dev server on port 8800
pnpm --filter ./apps/web dev    # Alternative dev command

# Build & Deploy
pnpm --filter ./apps/web build  # Production build
pnpm --filter ./apps/web start  # Start production server

# Code Quality
pnpm --filter ./apps/web lint      # ESLint checks
pnpm --filter ./apps/web lint:fix  # Auto-fix lint issues
pnpm --filter ./apps/web format    # Prettier formatting
```

### 4.2 Backend Services

Each Go service supports these Makefile commands:

```bash
# Development
make dev        # Hot reload with Air
make run        # Standard go run
make build      # Build binary to bin/

# Code Quality
make fmt        # Format code with go fmt
make lint       # Run golangci-lint
make test       # Run all tests

# Dependencies
make deps       # go mod tidy + download

# Docker
make docker-build  # Build Docker image
make docker-run    # Run with docker-compose
make docker-stop   # Stop containers

# Cleanup
make clean      # Remove build artifacts
```

### 4.3 Monorepo Commands (from root)

```bash
# Specific service development
pnpm auth-service:dev      # Start auth service with hot reload
pnpm user-service:dev      # Start user service with hot reload
pnpm workflow-service:dev  # Start workflow service with hot reload
pnpm api-gateway:dev       # Start API gateway with hot reload
pnpm registry:dev          # Start service registry with hot reload

# Git hooks
pnpm prepare              # Install Husky hooks
```

### 4.4 Development Workflow

1. **Environment Setup**: Each service has `.env` files for configuration
2. **Hot Reload**: Use `make dev` for Go services, `pnpm web:dev` for frontend
3. **Code Quality**: Pre-commit hooks enforce linting and conventional commits
4. **Testing**: Run `make test` in service directories
5. **Docker**: Use `docker-compose up -d` for full-stack development

---

## 5. Module Design

### 5.1 Frontend Modules (apps/web)

- App Router: Organize code by page routes, support dynamic routing and SSR
- Component Library: Follows atomic design (atomic, molecular, organism)
- API Services: Use tRPC or REST to call backend, integrate React Query for data caching

### 5.2 Backend Modules

- **API Gateway (apps/api-gateway)**: Handles frontend requests, forwards to microservices, implements authentication, rate limiting, CORS, and service discovery
- **Registry (apps/registry)**: Service registration, deregistration, discovery, health check with RESTful API
- **Microservices (services/\*):**
  - **Auth Service**: User authentication, registration, and JWT token management
  - **User Service**: User profile management and permissions
  - **Workflow Service**: Workflow orchestration, task execution, and progress monitoring

### 5.3 Shared Modules (pkg)

- **tlog**: Unified structured logging package with support for:
  - Multiple output formats (JSON, text, colored console)
  - Log levels and filtering
  - Gin middleware integration
  - Request ID tracking
  - Production and development presets
  - File rotation and remote logging capabilities

---

## 6. Development & Deployment Process

### 6.1 Development Environment

- Frontend:

  ```bash
  cd apps/web
  pnpm install
  pnpm dev
  ```

- Backend:

  ```bash
  cd services/auth-service
  go mod tidy
  go run cmd/main.go
  ```

- Debugging tools: Use Docker Compose to quickly start dependencies (e.g., DB, Redis)

### 6.2 Production Deployment

- Containerization: Write Dockerfile for each service to build images
- Kubernetes: Use Helm Chart to define resources and deploy to K8s cluster
- CI/CD: Use GitHub Actions for automated build, test, and release

---

## 7. Configuration Management

### 7.1 Environment Variables

- **Backend**: Each microservice has a `.env` file in its root directory for service-specific configurations:
  - `PORT`: Service port number
  - `SERVICE_NAME`: Service identifier for logging and registration
  - `REGISTRY_URL`: Service registry endpoint (e.g., `http://localhost:8891`)
  - `DB_*`: Database connection parameters
  - `JWT_SECRET`: Authentication secret key
  - `LOG_*`: Logging configuration (level, format, output)

- **Frontend**: Use `process.env` in `next.config.js` for environment variables

### 7.2 Config Loading

- **Go microservices**: Use Viper for multi-level config loading (.env, env vars, config files)
- **Next.js**: Use `next.config.js` and `.env.local` for sensitive information

### 7.3 Service Registration

All microservices automatically register with the service registry on startup:
- **Registry endpoint**: `/api/register` (not `/register`)
- **Service info**: Includes name, address, port, tags, and metadata
- **Health checks**: Built-in health check endpoints at `/health`

---

## 8. Contribution Guide

1. Fork this repo and create a new branch (e.g., feature/xxx, fix/xxx)
2. Keep code style consistent: ESLint/Prettier for frontend, golangci-lint for backend
3. Ensure all tests pass before submitting PR
4. PR description should clearly explain changes and impact

---

## 9. Commit Message Convention

This project uses [Commitlint](https://commitlint.js.org/) and [Husky](https://typicode.github.io/husky/) to enforce commit message conventions. Please use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification:

- feat: New feature
- fix: Bug fix
- docs: Documentation change
- style: Code style (formatting, etc.)
- refactor: Code refactoring (not bug fix or feature)
- perf: Performance improvement
- test: Add or modify tests
- chore: Build process or auxiliary tool changes

**Example:**

```textplain
feat: add user login API
fix: correct typo in README
```

Commit messages not following the convention will be rejected.

---

## 10. Troubleshooting

### 10.1 Service Registration Issues

If microservices fail to register with the registry, check:

1. **Registry Status**: Ensure the registry is running on port `8891`
2. **Registration Path**: Services should POST to `/api/register`, not `/register`
3. **Network Connectivity**: Verify `REGISTRY_URL` configuration is correct
4. **Log Output**: Check service startup logs for registration status

### 10.2 Database Connection Issues

1. **Database Service**: Ensure PostgreSQL is running on the specified port
2. **Connection Parameters**: Verify `DB_*` configurations in `.env` files
3. **Permissions**: Ensure database user has sufficient privileges

### 10.3 Port Conflicts

Default ports for each service:
- Frontend (web): `8800`
- Api-Gateway: `8890`
- Registry: `8891`
- Auth Service: `8892`
- User Service: `8893`
- Workflow Service: `8894`

## 11. FAQ

- **Q:** How to add a new microservice?
  **A:** Refer to the services/auth-service structure, copy and modify the service name and configs.
- **Q:** How does the frontend call backend APIs?
  **A:** Use tRPC or REST, manage all APIs in apps/web/services.
- **Q:** How to debug DB/Redis locally?
  **A:** Use Docker Compose to start dependencies, see infrastructure/docker for configs.
- **Q:** Service registration fails, what to do?
  **A:** Check if registry is running, confirm registration path is `/api/register`, and review service logs for detailed error information.

---

## 12. Contact

- **Author/Maintainer:** LeviLiu
- **Email:** <liuwenyu1937@outlook.com>
- **Issues:** Please use GitHub Issues for feedback and suggestions

---

## 13. License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### License Summary

The MIT License is a permissive license that allows you to:

- ✅ Use the software for any purpose
- ✅ Modify and distribute the software
- ✅ Use it commercially
- ✅ Integrate it into proprietary software

The only requirement is that you include the original copyright and license notice.

For detailed license information and usage guidelines, see [docs/LICENSE_zh.md](docs/LICENSE_zh.md).

---

**Telos Project Contributors** - Copyright (c) 2024
