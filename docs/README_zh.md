# Telos：智能工作流编排代理平台

[English Version](../README.md)

## 1. 项目简介

Telos 是一个智能工作流编排代理平台，专为企业级自动化场景设计。该系统通过现代微服务架构实现自动化任务调度、管理和执行。

**项目亮点：**

- **Next.js 15** 前端，采用 App Router 和 React 19 并发特性
- **Go 微服务** 后端，高性能且易于扩展
- **服务发现** 内置注册中心和健康检查
- **多语言支持** 国际化前端支持 18 种语言
- **可视化工作流构建器** 基于 React Flow 组件
- **单体仓库管理** 统一依赖，简化开发流程
- **统一日志系统** 自定义 tlog 包，为所有服务提供结构化日志

---

## 2. 目录结构

```plaintext
telos/
├── apps/                   # 应用层
│   ├── web/               # Next.js 前端应用
│   ├── mobile/            # React Native 移动应用
│   ├── api-gateway/       # API 网关 (Go Echo)
│   └── registry/          # 服务注册中心 (Go Echo)
├── services/              # 微服务层
│   ├── auth-service/      # 认证服务 (Go Gin)
│   ├── user-service/      # 用户管理服务 (Go Gin)
│   └── workflow-service/  # 工作流编排服务 (Go Gin)
├── docs/                  # 文档
├── pkg/                   # 共享 Go 包
├── node_modules/          # 根依赖
└── package.json           # 单体仓库配置
```

---

## 3. 技术选型

### 3.1 前端技术栈

#### Web 应用 (Next.js)

- **Next.js 15**：使用 App Router 的服务端组件和 SSR
- **React 19**：最新的 React 并发特性
- **TypeScript**：全应用严格类型检查
- **Tailwind CSS 4**：实用优先的 CSS 框架
- **Shadcn UI**：基于 Radix UI 原语构建的组件库
- **Next-intl**：支持 18 种语言的国际化
- **React Flow**：可视化工作流构建器组件
- **Zustand**：轻量级状态管理
- **React Hook Form + Zod**：表单处理与验证

#### 移动应用 (React Native)

- **React Native 0.80.2**：跨平台移动开发
- **React 19**：最新的 React 并发特性
- **TypeScript**：全应用严格类型检查
- **Metro**：React Native 的 JavaScript 打包工具
- **Jest**：测试框架，集成 React Native 测试工具
- **ESLint + Prettier**：代码格式化和检查

### 3.2 后端技术栈

- **Go 1.24.4**：高性能后端服务
- **Gin**：微服务业务逻辑的 Web 框架
- **Echo**：API 网关和注册中心的轻量级框架
- **GORM**：数据库 ORM 操作
- **Viper**：支持 .env 的配置管理
- **JWT**：身份验证和授权
- **PostgreSQL**：主数据库
- **Redis**：缓存和会话存储

### 3.3 基础设施与工具

- **Docker**：所有服务的容器化
- **Air**：Go 开发热重载
- **Husky**：代码质量的 Git 钩子
- **Commitlint**：约定式提交规范
- **ESLint + Prettier**：代码格式化和检查
- **golangci-lint**：Go 代码质量检查

---

## 4. 快速开始

### 4.1 前端开发

```bash
# Web 开发
pnpm web:dev                    # 在 8800 端口启动开发服务器
pnpm --filter ./apps/web dev    # 替代开发命令

# 构建与部署
pnpm --filter ./apps/web build  # 生产构建
pnpm --filter ./apps/web start  # 启动生产服务器

# 代码质量
pnpm --filter ./apps/web lint      # ESLint 检查
pnpm --filter ./apps/web lint:fix  # 自动修复检查问题
pnpm --filter ./apps/web format    # Prettier 格式化

# 移动开发
pnpm --filter ./apps/mobile start    # 启动 Metro 打包器
pnpm --filter ./apps/mobile android  # 在 Android 上运行
pnpm --filter ./apps/mobile ios      # 在 iOS 上运行
pnpm --filter ./apps/mobile test     # 运行移动端测试
pnpm --filter ./apps/mobile lint     # 移动端 ESLint 检查
```

### 4.2 后端服务

每个 Go 服务都支持这些 Makefile 命令：

```bash
# 开发
make dev        # 使用 Air 热重载
make run        # 标准 go run
make build      # 构建二进制文件到 bin/

# 代码质量
make fmt        # 使用 go fmt 格式化代码
make lint       # 运行 golangci-lint
make test       # 运行所有测试

# 依赖管理
make deps       # go mod tidy + download

# Docker
make docker-build  # 构建 Docker 镜像
make docker-run    # 使用 docker-compose 运行
make docker-stop   # 停止容器

# 清理
make clean      # 删除构建产物
```

### 4.3 单体仓库命令（从根目录）

```bash
# 特定服务开发
pnpm auth-service:dev      # 启动认证服务热重载
pnpm user-service:dev      # 启动用户服务热重载
pnpm workflow-service:dev  # 启动工作流服务热重载
pnpm api-gateway:dev       # 启动 API 网关热重载
pnpm registry:dev          # 启动服务注册中心热重载

# 移动开发
pnpm mobile:start          # 启动 Metro 打包器
pnpm mobile:android        # 在 Android 上运行
pnpm mobile:ios            # 在 iOS 上运行

# Git 钩子
pnpm prepare              # 安装 Husky 钩子
```

### 4.4 开发工作流

1. **环境设置**：每个服务都有 `.env` 文件进行配置
2. **热重载**：Go 服务使用 `make dev`，前端使用 `pnpm web:dev`
3. **代码质量**：预提交钩子强制执行检查和约定式提交
4. **测试**：在服务目录中运行 `make test`
5. **Docker**：使用 `docker-compose up -d` 进行全栈开发

---

## 5. 模块设计

### 5.1 前端模块

#### Web 应用（apps/web）

- App Router：按页面路由组织代码，支持动态路由与服务器端渲染
- 组件库：遵循原子设计原则，分为原子、分子、组织三级组件
- API 服务：通过 tRPC 或 REST 调用后端接口，集成 React Query 管理数据缓存

#### 移动应用（apps/mobile）

- 跨平台移动应用，支持 iOS 和 Android
- 原生导航和平台特定的 UI 组件
- 与 Web 应用共享业务逻辑
- 离线优先架构，支持本地数据同步

### 5.2 后端模块

- **API 网关（apps/api-gateway）**：统一处理前端请求，转发至对应微服务，实现鉴权、限流、CORS、服务发现
- **注册中心（apps/registry）**：服务注册、注销、发现、健康检查，提供 RESTful API
- **微服务（services/\*）**：
  - **认证服务**：用户认证、注册和 JWT 令牌管理
  - **用户服务**：用户档案管理和权限控制
  - **工作流服务**：工作流编排、任务执行和进度监控

### 5.3 共享模块（pkg）

- **tlog**：统一的结构化日志包，支持：
  - 多种输出格式（JSON、文本、彩色控制台）
  - 日志级别和过滤
  - Gin 中间件集成
  - 请求 ID 追踪
  - 生产和开发环境预设
  - 文件轮转和远程日志功能

---

## 6. 开发与部署流程

### 6.1 开发环境

- Web 前端：

  ```bash
  cd apps/web
  pnpm install
  pnpm dev
  ```

- 移动前端：

  ```bash
  cd apps/mobile
  pnpm install
  pnpm start    # 启动 Metro 打包器
  pnpm android  # 在 Android 上运行（另开终端）
  pnpm ios      # 在 iOS 上运行（另开终端）
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

- **后端**：每个微服务根目录下的 `.env` 文件定义服务专属配置：

  - `PORT`：服务端口号
  - `SERVICE_NAME`：服务标识符，用于日志和注册
  - `REGISTRY_URL`：服务注册中心端点（如 `http://localhost:8891`）
  - `DB_*`：数据库连接参数
  - `JWT_SECRET`：身份验证密钥
  - `LOG_*`：日志配置（级别、格式、输出）

- **前端**：在 `next.config.js` 中通过 `process.env` 引用环境变量

### 7.2 配置加载

- **Go 微服务**：使用 Viper 库，支持 .env、环境变量、配置文件多级加载
- **Next.js**：通过 `next.config.js` 与 `.env.local` 管理敏感信息

### 7.3 服务注册

所有微服务在启动时自动向服务注册中心注册：

- **注册端点**：`/api/register`（不是 `/register`）
- **服务信息**：包含名称、地址、端口、标签和元数据
- **健康检查**：内置健康检查端点 `/health`

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

## 10. 故障排除

### 10.1 服务注册问题

如果微服务无法注册到注册中心，检查以下几点：

1. **注册中心是否启动**：确保注册中心在 `8891` 端口运行
2. **注册路径是否正确**：微服务应该向 `/api/register` 发送请求，而不是 `/register`
3. **网络连接**：检查 `REGISTRY_URL` 配置是否正确
4. **日志输出**：查看服务启动日志中的注册状态信息

### 10.2 数据库连接问题

1. **检查数据库服务**：确保 PostgreSQL 在指定端口运行
2. **验证连接参数**：检查 `.env` 文件中的 `DB_*` 配置
3. **权限问题**：确保数据库用户有足够的权限

### 10.3 端口冲突

各服务的默认端口：

- 前端 (web): `8800`
- API 网关 (api-gateway): `8890`
- 注册中心 (registry): `8891`
- 认证服务 (auth-service): `8892`
- 用户服务 (user-service): `8893`
- 工作流服务 (workflow-service): `8894`

## 11. 常见问题（FAQ）

- **Q:** 如何新增一个微服务？
  **A:** 参考 services/auth-service 目录结构，复制并修改 service 名称及相关配置。
- **Q:** 前端如何调用后端接口？
  **A:** 推荐使用 tRPC 或 REST，统一在 apps/web/services 目录下管理。
- **Q:** 如何本地调试数据库/Redis？
  **A:** 推荐使用 Docker Compose 启动依赖服务，配置见 infrastructure/docker。
- **Q:** 服务注册失败怎么办？
  **A:** 检查注册中心是否启动，确认注册路径为 `/api/register`，查看服务日志获取详细错误信息。

---

## 12. 联系方式

- **作者/维护者：** LeviLiu
- **邮箱：** <liuwenyu1937@outlook.com>
- **Issues：** 欢迎通过 GitHub Issues 反馈问题与建议

---

## 13. 开源许可证

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
