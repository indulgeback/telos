# 流程编排智能体 Telos

[English Version](../README.md)

## 项目简介

本项目致力于打造一个现代化、可扩展的流程编排智能体平台，支持自动化任务调度与管理。采用前后端分离、微服务架构，适合企业级自动化场景。

**项目亮点：**

- 前端基于 Next.js 15 + Shadcn UI，体验流畅
- 后端 Go 微服务，性能优越，易于扩展
- 支持 tRPC/gRPC，类型安全，服务间通信高效
- Monorepo 管理，统一依赖，便于协作
- 完善的容器化与 CI/CD 支持

---

## 一、项目概述

Telos 基于现代化全栈架构，旨在构建一个流程编排智能体，实现自动化任务调度与管理。前端采用 Next.js 15 的 App Router 结合 Shadcn UI，提供高效交互体验；后端基于 Go 语言开发微服务，确保服务的高性能与可扩展性。项目采用 Monorepo 模式统一管理代码，支持快速迭代与部署。

---

## 二、目录结构

```plaintext
telos/
├── apps/
│   ├── web/                # 前端 Web 应用 (Next.js 15 + Shadcn UI)
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   └── ...
│   └── api-gateway/        # API 网关 (Go)
│       ├── cmd/
│       ├── internal/
│       └── pkg/
├── services/               # 微服务层 (Go)
│   ├── auth-service/
│   ├── user-service/
│   ├── product-service/
│   └── order-service/
├── packages/               # 共享包
│   ├── common/
│   ├── proto/
│   ├── config/
│   └── utils/
├── infrastructure/         # 基础设施
│   ├── docker/
│   ├── k8s/
│   └── scripts/
├── tools/                  # 开发工具
│   ├── lint/
│   └── test/
└── package.json            # Monorepo 根配置
```

---

## 三、整体架构

```plaintext
telos/
├── apps/ # 应用层
│ ├── web/ # 前端 Web 应用 (Next.js 15 + Shadcn UI)
│ │ ├── app/ # App Router 目录结构
│ │ │ ├── globals.css
│ │ │ ├── layout.tsx
│ │ │ ├── page.tsx
│ │ │ └── [...routes]/
│ │ ├── components/ # 组件库 (原子、分子、组织模式)
│ │ ├── hooks/ # 自定义 Hooks
│ │ ├── lib/ # 业务逻辑库
│ │ ├── services/ # API 服务 (tRPC 或 REST)
│ │ └── next.config.js # Next.js 配置
│ │
│ └── api-gateway/ # API 网关 (Go)
│ ├── cmd/ # 入口点
│ ├── internal/ # 内部模块
│ └── pkg/ # 工具包
│
├── services/ # 微服务层 (Go)
│ ├── auth-service/ # 认证服务
│ ├── user-service/ # 用户服务
│ ├── product-service/ # 产品服务
│ └── order-service/ # 订单服务
│
├── packages/ # 共享包
│ ├── common/ # 通用工具库
│ ├── proto/ # Protobuf 定义 (gRPC)
│ ├── config/ # 配置管理
│ └── utils/ # 工具函数
│
├── infrastructure/ # 基础设施
│ ├── docker/ # Docker 配置
│ ├── k8s/ # Kubernetes 配置
│ └── scripts/ # 部署脚本
│
├── tools/ # 开发工具
│ ├── lint/ # 代码检查
│ └── test/ # 测试工具
│
└── package.json # Monorepo 根配置
```

---

## 四、技术选型

### 4.1 前端技术栈

- **Next.js 15**：利用 App Router 实现服务器组件与路由优化
- **Shadcn UI**：基于 Tailwind CSS 的组件库，快速构建响应式界面
- **TypeScript**：强类型语言提升代码稳定性与可维护性
- **tRPC**：实现前端与后端的类型安全 API 调用
- **Zustand**：轻量级状态管理库，处理复杂交互逻辑

### 4.2 后端技术栈

- **Go 语言**：高性能、原生支持并发，适合微服务架构
- **Gin/Echo**：轻量级 HTTP 框架，快速搭建 API 接口
- **gRPC**：基于 Protobuf 的高性能 RPC 框架，用于服务间通信
- **PostgreSQL**：关系型数据库，存储结构化数据
- **Redis**：缓存数据库，加速数据读取与任务队列处理

### 4.3 基础设施

- **Docker**：容器化部署，确保环境一致性
- **Kubernetes**：集群编排，实现自动化部署与扩缩容
- **Helm**：K8s 包管理器，简化应用部署流程
- **Prometheus + Grafana**：监控与可视化系统
- **Jaeger**：分布式追踪，定位服务调用链问题

---

## 五、快速开始

### 5.1 前端启动

```bash
cd apps/web
pnpm install
pnpm dev
```

### 5.2 后端启动（以认证服务为例）

```bash
cd services/auth-service
go mod tidy
go run cmd/main.go
```

### 5.3 一键启动所有服务（需 Docker Compose 支持）

```bash
docker-compose up -d
```

### 5.4 常用命令

- 前端构建：`pnpm build`
- 后端测试：`go test ./...`
- 格式化代码：`pnpm lint` 或 `golangci-lint run`

---

## 六、模块设计

### 6.1 前端模块（apps/web）

- App Router：按页面路由组织代码，支持动态路由与服务器端渲染
- 组件库：遵循原子设计原则，分为原子、分子、组织三级组件
- API 服务：通过 tRPC 或 REST 调用后端接口，集成 React Query 管理数据缓存

### 6.2 后端模块

- **API 网关（apps/api-gateway）**：统一处理前端请求，转发至对应微服务，实现鉴权与限流
- **微服务（services/\*）**：
  - 认证服务：管理用户登录、注册与 JWT 鉴权
  - 用户服务：处理用户信息管理与权限控制
  - 产品服务：管理流程模板、任务节点配置
  - 订单服务：编排任务执行，监控流程进度

### 6.3 共享模块（packages）

- common：通用工具函数（如日志、加密、时间处理）
- proto：定义 gRPC 服务接口与消息结构
- config：统一管理项目配置，支持环境变量与 .env 文件加载

---

## 七、开发与部署流程

### 7.1 开发环境

- 前端：

  ```bash
  cd apps/web
  pnpm install
  pnpm dev
  ```

- 后端：

  ```bash
  cd services/auth-service
  go mod tidy
  go run cmd/main.go
  ```

- 调试工具：使用 Docker Compose 快速启动依赖服务（如数据库、Redis）

### 7.2 生产部署

- 容器化：为每个服务编写 Dockerfile，构建镜像
- Kubernetes 部署：通过 Helm Chart 定义资源清单，部署至 K8s 集群
- CI/CD：使用 GitHub Actions 实现自动化构建、测试与发布

---

## 八、配置管理

### 8.1 环境变量

- 后端：每个微服务根目录下放置 .env 文件，定义服务专属配置（如数据库连接、端口号）
- 前端：在 next.config.js 中通过 process.env 引用环境变量（如 API 地址）

### 8.2 配置加载

- Go 微服务：使用 viper 库，支持 .env、环境变量、配置文件多级加载
- Next.js：通过 next.config.js 与 .env.local 管理敏感信息

---

## 九、贡献指南

1. Fork 本仓库并创建新分支（如 feature/xxx、fix/xxx）
2. 保持代码风格统一，前端遵循 ESLint/Prettier，后端遵循 golangci-lint
3. 提交 PR 前请确保所有测试通过
4. PR 描述需清晰说明变更内容及影响范围

---

## 十、常见问题（FAQ）

- **Q:** 如何新增一个微服务？
  **A:** 参考 services/auth-service 目录结构，复制并修改 service 名称及相关配置。
- **Q:** 前端如何调用后端接口？
  **A:** 推荐使用 tRPC 或 REST，统一在 apps/web/services 目录下管理。
- **Q:** 如何本地调试数据库/Redis？
  **A:** 推荐使用 Docker Compose 启动依赖服务，配置见 infrastructure/docker。

---

## 十一、联系方式

- **作者/维护者：** （待补充）
- **邮箱：** （待补充）
- **Issues：** 欢迎通过 GitHub Issues 反馈问题与建议

---
