# Telos: Intelligent Workflow Orchestration Agent

[中文版 (Chinese Version)](./docs/README_zh.md)

**Author: LeviLiu**  
**Email: <liuwenyu1937@outlook.com>**

## 1. Project Introduction

This project aims to build a modern, scalable workflow orchestration agent platform that supports automated task scheduling and management. It adopts a frontend-backend separation and microservices architecture, suitable for enterprise-level automation scenarios.

**Project Highlights:**

- Frontend based on Next.js 15 + Shadcn UI for a smooth experience
- Backend Go microservices for high performance and easy scalability
- Supports tRPC/gRPC for type-safe and efficient inter-service communication
- Monorepo management for unified dependencies and easy collaboration
- Complete containerization and CI/CD support

---

## 2. Directory Structure

```plaintext
telos/
├── apps/
│   ├── web/                # Frontend Web App (Next.js 15 + Shadcn UI)
│   ├── api-gateway/        # API Gateway (Go Echo)
│   └── registry/           # Service Registry (Go Echo)
├── services/               # Microservices Layer (Go Gin)
│   ├── auth-service/
│   ├── user-service/
│   ├── product-service/
│   └── order-service/
├── packages/               # Shared Packages
├── infrastructure/         # Infrastructure
├── tools/                  # Development Tools
└── package.json            # Monorepo Root Config
```

---

## 3. Technology Stack

### 3.1 Frontend

- **Next.js 15**: Uses App Router for server components and optimized routing
- **Shadcn UI**: Component library based on Tailwind CSS for rapid responsive UI development
- **TypeScript**: Strongly typed language for code stability and maintainability
- **tRPC**: Type-safe API calls between frontend and backend
- **Zustand**: Lightweight state management for complex interactions

### 3.2 Backend

- **Go**: High performance, native concurrency, ideal for microservices
- **Echo**: Used for API Gateway and Registry (lightweight, high-performance HTTP services)
- **Gin**: Used for business microservices (rapid API development and middleware ecosystem)
- **gRPC**: High-performance RPC framework based on Protobuf for inter-service communication
- **Consul**: Service registry and health check (see apps/registry)
- **PostgreSQL**: Relational database for structured data
- **Redis**: Cache database for fast data access and task queueing

### 3.3 Infrastructure

- **Docker**: Containerized deployment for environment consistency
- **Kubernetes**: Cluster orchestration for automated deployment and scaling
- **Helm**: K8s package manager for simplified deployment
- **Prometheus + Grafana**: Monitoring and visualization
- **Jaeger**: Distributed tracing for service call chain analysis

---

## 4. Quick Start

### 4.1 Start Frontend

```bash
cd apps/web
pnpm install
pnpm dev
# Or unified entry
pnpm run web:dev
```

### 4.2 Start Auth Service (as an example)

```bash
cd services/auth-service
go mod tidy
go run cmd/main.go
# Recommended: use Makefile
make run
# Or unified entry
pnpm run auth-service:run
```

### 4.3 Start Registry (Consul-based Service Discovery)

```bash
cd apps/registry
make run
# or docker-compose up -d
# Or unified entry
pnpm run registry:run
```

### 4.4 Start API Gateway

```bash
cd apps/api-gateway
GATEWAY_PORT=8080 AUTH_SERVICE_URL=http://localhost:8081 go run cmd/main.go
# Recommended: use Makefile
make run
# Or unified entry
pnpm run api-gateway:run
```

### 4.5 Start All Services (Requires Docker Compose)

```bash
docker-compose up -d
```

### 4.6 Common Commands

- Frontend build: `pnpm build`
- Backend test: `go test ./...`
- Code formatting: `pnpm lint` or `golangci-lint run`
- All Go services support Makefile commands (build, run, test, clean) in their own directories.
- All main services can be started from the root via `pnpm run <service>:run`.

---

## 5. Module Design

### 5.1 Frontend Modules (apps/web)

- App Router: Organize code by page routes, support dynamic routing and SSR
- Component Library: Follows atomic design (atomic, molecular, organism)
- API Services: Use tRPC or REST to call backend, integrate React Query for data caching

### 5.2 Backend Modules

- **API Gateway (apps/api-gateway)**: Handles frontend requests, forwards to microservices, implements authentication, rate limiting, CORS, and service discovery (via Consul)
- **Registry (apps/registry)**: Service registration, deregistration, discovery, health check, RESTful API (Consul integration)
- **Microservices (services/\*):**
  - Auth Service: Manages user login, registration, and JWT authentication
  - User Service: Handles user info management and permissions
  - Product Service: Manages workflow templates and task node configuration
  - Order Service: Orchestrates task execution and monitors workflow progress

### 5.3 Shared Modules (packages)

- common: Common utilities (logging, encryption, time handling)
- proto: gRPC service interface and message definitions
- config: Centralized config management, supports env vars and .env files

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

- Backend: Place .env file in each microservice root for service-specific configs (DB, port, etc.)
- Frontend: Use process.env in next.config.js for env variables (e.g., API URL)

### 7.2 Config Loading

- Go microservices: Use viper for multi-level config loading (.env, env vars, config files)
- Next.js: Use next.config.js and .env.local for sensitive info

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

## 10. FAQ

- **Q:** How to add a new microservice?
  **A:** Refer to the services/auth-service structure, copy and modify the service name and configs.
- **Q:** How does the frontend call backend APIs?
  **A:** Use tRPC or REST, manage all APIs in apps/web/services.
- **Q:** How to debug DB/Redis locally?
  **A:** Use Docker Compose to start dependencies, see infrastructure/docker for configs.

---

## 11. Contact

- **Author/Maintainer:** LeviLiu
- **Email:** <liuwenyu1937@outlook.com>
- **Issues:** Please use GitHub Issues for feedback and suggestions

---

## 12. License

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
