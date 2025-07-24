# 流程编排智能体 Telos

[English Version](../README.md)

## 1. 项目简介

本项目致力于打造一个现代化、可扩展的流程编排智能体平台，支持自动化任务调度与管理。采用前后端分离、微服务架构，适合企业级自动化场景。

**项目亮点：**

- 前端基于 Next.js 15 + Shadcn UI，体验流畅
- 后端 Go 微服务，性能优越，易于扩展
- 支持 tRPC/gRPC，类型安全，服务间通信高效
- Monorepo 管理，统一依赖，便于协作
- 完善的容器化与 CI/CD 支持

---

## 2. 目录结构

```plaintext
telos/
├── apps/
│   ├── web/                # 前端 Web 应用 (Next.js 15 + Shadcn UI)
│   ├── api-gateway/        # API 网关 (Go Echo)
│   └── registry/           # 注册中心 (Go Echo)
├── services/               # 微服务层 (Go Gin)
│   ├── auth-service/
│   ├── user-service/
│   ├── workflow-service/
│   └── task-service/
├── packages/               # 共享包
├── infrastructure/         # 基础设施
├── tools/                  # 开发工具
└── package.json            # Monorepo 根配置
```

---

## 3. 技术选型

### 3.1 前端技术栈

- **Next.js 15**：利用 App Router 实现服务器组件与路由优化
- **Shadcn UI**：基于 Tailwind CSS 的组件库，快速构建响应式界面
- **TypeScript**：强类型语言提升代码稳定性与可维护性
- **tRPC**：实现前端与后端的类型安全 API 调用
- **Zustand**：轻量级状态管理库，处理复杂交互逻辑

### 3.2 后端技术栈

- **Go 语言**：高性能、原生支持并发，适合微服务架构
- **Echo**：注册中心（registry）和 API 网关（api-gateway）采用 Echo 框架实现，专注高性能、极简依赖
- **Gin**：业务微服务如 auth-service 采用 Gin 框架，开发效率高，生态丰富
- **gRPC**：基于 Protobuf 的高性能 RPC 框架，用于服务间通信
- **Consul**：服务注册与健康检查（见 apps/registry）
- **PostgreSQL**：关系型数据库，存储结构化数据
- **Redis**：缓存数据库，加速数据读取与任务队列处理

### 3.3 基础设施

- **Docker**：容器化部署，确保环境一致性
- **Kubernetes**：集群编排，实现自动化部署与扩缩容
- **Helm**：K8s 包管理器，简化应用部署流程
- **Prometheus + Grafana**：监控与可视化系统
- **Jaeger**：分布式追踪，定位服务调用链问题

---

## 4. 快速开始

### 4.1 前端启动

```bash
cd apps/web
pnpm install
pnpm dev
# 或统一入口
pnpm run web:dev
```

### 4.2 后端启动（以认证服务为例）

```bash
cd services/auth-service
go mod tidy
go run cmd/main.go
# 推荐使用 Makefile
make run
# 或统一入口
pnpm run auth-service:run
```

### 4.3 注册中心启动（基于 Consul 的服务发现）

```bash
cd apps/registry
make run
# 或 docker-compose up -d
# 或统一入口
pnpm run registry:run
```

### 4.4 API 网关启动

```bash
cd apps/api-gateway
GATEWAY_PORT=8080 AUTH_SERVICE_URL=http://localhost:8081 go run cmd/main.go
# 推荐使用 Makefile
make run
# 或统一入口
pnpm run api-gateway:run
```

### 4.5 一键启动所有服务（需 Docker Compose 支持）

```bash
docker-compose up -d
```

### 4.6 常用命令

- 前端构建：`pnpm build`
- 后端测试：`go test ./...`
- 格式化代码：`pnpm lint` 或 `golangci-lint run`
- 所有 Go 服务支持各自目录下 Makefile 的 build/run/test/clean 等命令
- 主服务可通过根目录 pnpm run service:dev 启动

---

## 5. 模块设计

### 5.1 前端模块（apps/web）

- App Router：按页面路由组织代码，支持动态路由与服务器端渲染
- 组件库：遵循原子设计原则，分为原子、分子、组织三级组件
- API 服务：通过 tRPC 或 REST 调用后端接口，集成 React Query 管理数据缓存

### 5.2 后端模块

- **API 网关（apps/api-gateway）**：统一处理前端请求，转发至对应微服务，实现鉴权、限流、CORS、服务发现（Consul）
- **注册中心（apps/registry）**：服务注册、注销、发现、健康检查，RESTful API（Consul 集成）
- **微服务（services/\*）**：
  - 认证服务：管理用户登录、注册与 JWT 鉴权
  - 用户服务：处理用户信息管理与权限控制
  - 产品服务：管理流程模板、任务节点配置
  - 订单服务：编排任务执行，监控流程进度

### 5.3 共享模块（packages）

- common：通用工具函数（如日志、加密、时间处理）
- proto：定义 gRPC 服务接口与消息结构
- config：统一管理项目配置，支持环境变量与 .env 文件加载

---

## 6. 开发与部署流程

### 6.1 开发环境

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

### 6.2 生产部署

- 容器化：为每个服务编写 Dockerfile，构建镜像
- Kubernetes 部署：通过 Helm Chart 定义资源清单，部署至 K8s 集群
- CI/CD：使用 GitHub Actions 实现自动化构建、测试与发布

---

## 7. 配置管理

### 7.1 环境变量

- 后端：每个微服务根目录下放置 .env 文件，定义服务专属配置（如数据库连接、端口号）
- 前端：在 next.config.js 中通过 process.env 引用环境变量（如 API 地址）

### 7.2 配置加载

- Go 微服务：使用 viper 库，支持 .env、环境变量、配置文件多级加载
- Next.js：通过 next.config.js 与 .env.local 管理敏感信息

---

## 8. 贡献指南

1. Fork 本仓库并创建新分支（如 feature/xxx、fix/xxx）
2. 保持代码风格统一，前端遵循 ESLint/Prettier，后端遵循 golangci-lint
3. 提交 PR 前请确保所有测试通过
4. PR 描述需清晰说明变更内容及影响范围

---

## 9. 提交规范

本项目使用 [Commitlint](https://commitlint.js.org/) 和 [Husky](https://typicode.github.io/husky/) 对提交信息进行校验，强制遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：

- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- style: 代码格式（不影响功能，例如空格、分号等）
- refactor: 代码重构（既不是修复 bug 也不是添加功能）
- perf: 性能优化
- test: 添加或修改测试
- chore: 构建过程或辅助工具的变动

**示例：**

```textplain
feat: 新增用户登录接口
fix: 修正 README 拼写错误
```

不符合规范的提交信息将被拒绝。

---

## 10. 常见问题（FAQ）

- **Q:** 如何新增一个微服务？
  **A:** 参考 services/auth-service 目录结构，复制并修改 service 名称及相关配置。
- **Q:** 前端如何调用后端接口？
  **A:** 推荐使用 tRPC 或 REST，统一在 apps/web/services 目录下管理。
- **Q:** 如何本地调试数据库/Redis？
  **A:** 推荐使用 Docker Compose 启动依赖服务，配置见 infrastructure/docker。

---

## 11. 联系方式

- **作者/维护者：** LeviLiu
- **邮箱：** <liuwenyu1937@outlook.com>
- **Issues：** 欢迎通过 GitHub Issues 反馈问题与建议

---

## 12. 开源许可证

本项目采用 **MIT 许可证** - 查看 [LICENSE](../LICENSE) 文件了解详情。

### 许可证概述

MIT 许可证是一个宽松的许可证，允许您：

- ✅ 将软件用于任何目的
- ✅ 修改和分发软件
- ✅ 用于商业项目
- ✅ 集成到专有软件中

唯一的要求是包含原始的版权和许可证声明。

详细的许可证信息和使用指南，请参阅 [LICENSE_zh.md](LICENSE_zh.md)。

---

**Telos 项目贡献者** - 版权所有 (c) 2024

---
