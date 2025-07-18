# Telos: Intelligent Workflow Orchestration Agent

[中文版 (Chinese Version)](./docs/README_zh.md)

**Author: LeviLiu**  
**Email: <liuwenyu1937@outlook.com>**

## Project Introduction

This project aims to build a modern, scalable intelligent workflow orchestration platform that supports automated task scheduling and management. It adopts a frontend-backend separation and microservices architecture, suitable for enterprise-level automation scenarios.

**Project Highlights:**

- Frontend based on Next.js 15 + Shadcn UI for a smooth experience
- Backend Go microservices for high performance and easy scalability
- Supports tRPC/gRPC for type-safe and efficient inter-service communication
- Monorepo management for unified dependencies and easy collaboration
- Complete containerization and CI/CD support

---

## 1. Project Overview

Telos is built on a modern full-stack architecture, aiming to create an intelligent workflow orchestrator for automated task scheduling and management. The frontend uses Next.js 15 App Router with Shadcn UI for a high-efficiency interactive experience; the backend is developed with Go microservices to ensure high performance and scalability. The project uses a Monorepo for unified code management, supporting rapid iteration and deployment.

---

## 2. Directory Structure

```plaintext
telos/
├── apps/
│   ├── web/                # Frontend Web App (Next.js 15 + Shadcn UI)
│   │   ├── src/
│   │   │   ├── app/        # App Router Directory Structure
│   │   │   ├── lib/        # Business Logic Library
│   │   │   ├── services/   # API Services (tRPC or REST)
│   │   │   └── assets/     # Static Assets
│   │   ├── public/         # Public Assets
│   │   ├── components.json # Shadcn UI Config
│   │   ├── next.config.ts  # Next.js Config
│   │   └── ...
│   └── api-gateway/        # API Gateway (Go)
│       ├── cmd/
│       ├── internal/
│       └── pkg/
├── services/               # Microservices Layer (Go)
│   ├── auth-service/
│   ├── user-service/
│   ├── product-service/
│   └── order-service/
├── packages/               # Shared Packages
│   ├── common/
│   ├── proto/
│   ├── config/
│   └── utils/
├── infrastructure/         # Infrastructure
│   ├── docker/
│   ├── k8s/
│   └── scripts/
├── tools/                  # Development Tools
│   ├── lint/
│   └── test/
└── package.json            # Monorepo Root Config
```

---

## 3. Overall Architecture

```plaintext
telos/
├── apps/ # Application Layer
│ ├── web/ # Frontend Web App (Next.js 15 + Shadcn UI)
│ │ ├── src/ # Source Code Directory
│ │ │ ├── app/ # App Router Directory Structure
│ │ │ │ ├── globals.css
│ │ │ │ ├── layout.tsx
│ │ │ │ ├── page.tsx
│ │ │ │ └── [...routes]/
│ │ │ ├── components/ # Component Library (Atomic, Molecular, Organism)
│ │ │ ├── hooks/ # Custom Hooks
│ │ │ ├── lib/ # Business Logic Library
│ │ │ ├── services/ # API Services (tRPC or REST)
│ │ │ └── assets/ # Static Assets
│ │ ├── public/ # Public Assets
│ │ ├── components.json # Shadcn UI Config
│ │ └── next.config.ts # Next.js Config
│ │
│ └── api-gateway/ # API Gateway (Go)
│ ├── cmd/ # Entry Point
│ ├── internal/ # Internal Modules
│ └── pkg/ # Utility Packages
│
├── services/ # Microservices Layer (Go)
│ ├── auth-service/ # Authentication Service
│ ├── user-service/ # User Service
│ ├── product-service/ # Product Service
│ └── order-service/ # Order Service
│
├── packages/ # Shared Packages
│ ├── common/ # Common Utilities
│ ├── proto/ # Protobuf Definitions (gRPC)
│ ├── config/ # Configuration Management
│ └── utils/ # Utility Functions
│
├── infrastructure/ # Infrastructure
│ ├── docker/ # Docker Config
│ ├── k8s/ # Kubernetes Config
│ └── scripts/ # Deployment Scripts
│
├── tools/ # Development Tools
│ ├── lint/ # Linting
│ └── test/ # Testing Tools
│
└── package.json # Monorepo Root Config
```

---

## 4. Technology Stack

### 4.1 Frontend

- **Next.js 15**: Uses App Router for server components and optimized routing
- **Shadcn UI**: Component library based on Tailwind CSS for rapid responsive UI development
- **TypeScript**: Strongly typed language for code stability and maintainability
- **tRPC**: Type-safe API calls between frontend and backend
- **Zustand**: Lightweight state management for complex interactions

### 4.2 Backend

- **Go**: High performance, native concurrency, ideal for microservices
- **Gin/Echo**: Lightweight HTTP frameworks for rapid API development
- **gRPC**: High-performance RPC framework based on Protobuf for inter-service communication
- **Consul**: Service registry and health check (see apps/registry)
- **PostgreSQL**: Relational database for structured data
- **Redis**: Cache database for fast data access and task queueing

### 4.3 Infrastructure

- **Docker**: Containerized deployment for environment consistency
- **Kubernetes**: Cluster orchestration for automated deployment and scaling
- **Helm**: K8s package manager for simplified deployment
- **Prometheus + Grafana**: Monitoring and visualization
- **Jaeger**: Distributed tracing for service call chain analysis

---

## 5. Quick Start

### 5.1 Start Frontend

```bash
cd apps/web
pnpm install
pnpm dev
```

### 5.2 Start Registry (Consul-based Service Discovery)

```bash
cd apps/registry
make run
# or docker-compose up -d
```

### 5.3 Start API Gateway

```bash
cd apps/api-gateway
GATEWAY_PORT=8080 AUTH_SERVICE_URL=http://localhost:8081 go run cmd/main.go
```

### 5.4 Start All Services (Requires Docker Compose)

```bash
docker-compose up -d
```

### 5.4 Common Commands

- Frontend build: `pnpm build`
- Backend test: `go test ./...`
- Code formatting: `pnpm lint` or `golangci-lint run`

---

## 6. Module Design

### 6.1 Frontend Modules (apps/web)

- App Router: Organize code by page routes, support dynamic routing and SSR
- Component Library: Follows atomic design (atomic, molecular, organism)
- API Services: Use tRPC or REST to call backend, integrate React Query for data caching

### 6.2 Backend Modules

- **API Gateway (apps/api-gateway)**: Handles frontend requests, forwards to microservices, implements authentication, rate limiting, CORS, and service discovery (via Consul)
- **Registry (apps/registry)**: Service registration, deregistration, discovery, health check, RESTful API (Consul integration)
- **Microservices (services/\*):**
  - Auth Service: Manages user login, registration, and JWT authentication
  - User Service: Handles user info management and permissions
  - Product Service: Manages workflow templates and task node configuration
  - Order Service: Orchestrates task execution and monitors workflow progress

### 6.3 Shared Modules (packages)

- common: Common utilities (logging, encryption, time handling)
- proto: gRPC service interface and message definitions
- config: Centralized config management, supports env vars and .env files

---

## 7. Development & Deployment Process

### 7.1 Development Environment

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

### 7.2 Production Deployment

- Containerization: Write Dockerfile for each service to build images
- Kubernetes: Use Helm Chart to define resources and deploy to K8s cluster
- CI/CD: Use GitHub Actions for automated build, test, and release

---

## 8. Configuration Management

### 8.1 Environment Variables

- Backend: Place .env file in each microservice root for service-specific configs (DB, port, etc.)
- Frontend: Use process.env in next.config.js for env variables (e.g., API URL)

### 8.2 Config Loading

- Go microservices: Use viper for multi-level config loading (.env, env vars, config files)
- Next.js: Use next.config.js and .env.local for sensitive info

---

## 9. Contribution Guide

1. Fork this repo and create a new branch (e.g., feature/xxx, fix/xxx)
2. Keep code style consistent: ESLint/Prettier for frontend, golangci-lint for backend
3. Ensure all tests pass before submitting PR
4. PR description should clearly explain changes and impact

---

## Commit Message Convention

This project uses [Commitlint](https://commitlint.js.org/) and [Husky](https://typicode.github.io/husky/) to enforce commit message conventions. Please use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification:

- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- style: 代码格式（不影响功能，例如空格、分号等）
- refactor: 代码重构（既不是修复 bug 也不是添加功能）
- perf: 性能优化
- test: 添加或修改测试
- chore: 构建过程或辅助工具的变动

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
