# Telos Docker 部署指南

## 📋 概述

本指南详细说明如何使用 Docker 部署 Telos 智能工作流编排代理平台。

## 🏗️ 架构概览

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web 前端       │    │   移动端 Metro   │    │   API 网关       │
│   (Next.js)     │    │   (React Native) │    │   (Go Echo)     │
│   Port: 8800    │    │   Port: 8081     │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   认证服务       │    │   用户服务       │    │   工作流服务     │
│   (Go Gin)      │    │   (Go Gin)      │    │   (Go Gin)      │
│   Port: 8081    │    │   Port: 8082    │    │   Port: 8083    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Redis         │    │   服务注册中心   │
│   Port: 5432    │    │   Port: 6379    │    │   Port: 8090    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 快速开始

### 1. 环境准备

确保你的系统已安装：

- Docker (>= 20.10)
- Docker Compose (>= 2.0)
- Git

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd telos
```

### 3. 环境变量配置

复制环境变量模板：

```bash
cp apps/web/.env.example apps/web/.env.local
```

编辑 `apps/web/.env.local` 文件，设置必要的环境变量：

```env
# NextAuth 配置
AUTH_SECRET="your-auth-secret-here"
NEXTAUTH_URL="http://localhost:8800"

# GitHub OAuth 配置
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# API 配置
NEXT_PUBLIC_API_URL="http://localhost:8080"
```

### 4. 启动开发环境

```bash
# 启动开发环境基础服务（数据库、Redis、管理工具）
./scripts/docker-dev.sh up

# 查看服务状态
./scripts/docker-dev.sh status
```

### 5. 构建和部署生产环境

```bash
# 构建所有 Docker 镜像
./scripts/docker-build.sh

# 部署到生产环境
./scripts/docker-deploy.sh deploy
```

## 🛠️ 详细部署步骤

### 开发环境部署

开发环境只启动基础服务，应用服务在本地运行：

```bash
# 启动开发环境
./scripts/docker-dev.sh up

# 查看日志
./scripts/docker-dev.sh logs

# 停止开发环境
./scripts/docker-dev.sh down

# 清理开发环境数据
./scripts/docker-dev.sh clean
```

**开发环境服务访问地址：**

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- PgAdmin: `http://localhost:5050` (admin@telos.dev / admin123)
- Redis Commander: `http://localhost:8081`

### 生产环境部署

生产环境部署所有服务：

```bash
# 设置环境变量
export AUTH_SECRET="your-auth-secret"
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"
export DB_PASSWORD="your-db-password"

# 部署所有服务
./scripts/docker-deploy.sh deploy

# 查看部署状态
./scripts/docker-deploy.sh status

# 查看服务日志
./scripts/docker-deploy.sh logs

# 更新指定服务
./scripts/docker-deploy.sh update web

# 停止所有服务
./scripts/docker-deploy.sh stop
```

**生产环境服务访问地址：**

- Web 应用: `http://localhost:8800`
- API 网关: `http://localhost:8080`
- 服务注册中心: `http://localhost:8090`
- 认证服务: `http://localhost:8081`
- 用户服务: `http://localhost:8082`
- 工作流服务: `http://localhost:8083`

## 📦 Docker 镜像说明

### 前端应用镜像

- **telos-web**: Next.js Web 应用

  - 基于 Node.js 20 Alpine
  - 多阶段构建优化
  - 支持 standalone 输出

- **telos-mobile**: React Native Metro 服务器
  - 用于开发环境的 Metro 打包服务器
  - 支持热重载

### 后端服务镜像

所有 Go 服务都使用相同的构建模式：

- **telos-api-gateway**: API 网关服务
- **telos-registry**: 服务注册中心
- **telos-auth-service**: 认证服务
- **telos-user-service**: 用户管理服务
- **telos-workflow-service**: 工作流编排服务

特点：

- 基于 Go 1.24 Alpine
- 多阶段构建，最终镜像体积小
- 非 root 用户运行，安全性高
- 包含健康检查

## 🔧 配置说明

### Docker Compose 配置

项目包含两个 Docker Compose 文件：

1. **docker-compose.yml**: 生产环境配置

   - 包含所有应用服务
   - 配置服务依赖和健康检查
   - 使用环境变量管理配置

2. **docker-compose.dev.yml**: 开发环境配置
   - 只包含基础服务（数据库、Redis）
   - 包含管理工具（PgAdmin、Redis Commander）
   - 适合本地开发

### 环境变量

**必需的环境变量：**

```env
# 认证配置
AUTH_SECRET=your-auth-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# 数据库配置
DB_PASSWORD=your-db-password

# API 配置
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**可选的环境变量：**

```env
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=telos
DB_USER=telos

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379

# 服务端口配置
WEB_PORT=8800
API_GATEWAY_PORT=8080
REGISTRY_PORT=8090
AUTH_SERVICE_PORT=8081
USER_SERVICE_PORT=8082
WORKFLOW_SERVICE_PORT=8083
```

## 🔍 监控和日志

### 健康检查

所有服务都配置了健康检查：

```bash
# 检查所有服务状态
docker-compose ps

# 检查特定服务健康状态
docker inspect --format='{{.State.Health.Status}}' telos-web
```

### 日志管理

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f web

# 查看最近的日志
docker-compose logs --tail=100 auth-service
```

### 性能监控

可以集成以下监控工具：

- **Prometheus**: 指标收集
- **Grafana**: 可视化监控
- **Jaeger**: 分布式追踪
- **ELK Stack**: 日志分析

## 🚨 故障排除

### 常见问题

1. **服务启动失败**

   ```bash
   # 检查服务日志
   docker-compose logs service-name

   # 检查容器状态
   docker-compose ps
   ```

2. **数据库连接失败**

   ```bash
   # 检查数据库是否启动
   docker-compose ps postgres

   # 检查数据库日志
   docker-compose logs postgres
   ```

3. **端口冲突**

   ```bash
   # 检查端口占用
   lsof -i :8800

   # 修改 docker-compose.yml 中的端口映射
   ```

4. **镜像构建失败**

   ```bash
   # 清理 Docker 缓存
   docker system prune -a

   # 重新构建镜像
   ./scripts/docker-build.sh
   ```

### 调试技巧

1. **进入容器调试**

   ```bash
   # 进入运行中的容器
   docker-compose exec web sh

   # 运行临时容器
   docker run -it --rm telos-web:latest sh
   ```

2. **查看容器资源使用**

   ```bash
   # 查看资源使用情况
   docker stats

   # 查看特定容器资源
   docker stats telos-web
   ```

3. **网络调试**

   ```bash
   # 查看 Docker 网络
   docker network ls

   # 检查网络连接
   docker-compose exec web ping postgres
   ```

## 🔒 安全最佳实践

1. **环境变量管理**

   - 使用 `.env` 文件管理敏感信息
   - 生产环境使用密钥管理服务
   - 定期轮换密钥

2. **容器安全**

   - 使用非 root 用户运行容器
   - 定期更新基础镜像
   - 扫描镜像漏洞

3. **网络安全**

   - 使用内部网络隔离服务
   - 只暴露必要的端口
   - 配置防火墙规则

4. **数据安全**
   - 数据库数据持久化
   - 定期备份数据
   - 加密敏感数据

## 📈 性能优化

1. **镜像优化**

   - 使用多阶段构建
   - 优化 .dockerignore
   - 使用 Alpine 基础镜像

2. **资源限制**

   ```yaml
   services:
     web:
       deploy:
         resources:
           limits:
             cpus: "0.5"
             memory: 512M
           reservations:
             cpus: "0.25"
             memory: 256M
   ```

3. **缓存优化**
   - 合理使用 Redis 缓存
   - 配置 CDN
   - 启用 gzip 压缩

## 🔄 CI/CD 集成

建议的 CI/CD 流程：

1. **代码提交** → 触发构建
2. **运行测试** → 单元测试、集成测试
3. **构建镜像** → Docker 镜像构建
4. **推送镜像** → 推送到镜像仓库
5. **部署应用** → 自动部署到环境

示例 GitHub Actions 配置：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and Deploy
        run: |
          ./scripts/docker-build.sh
          ./scripts/docker-deploy.sh deploy
```

## 📚 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Next.js Docker 部署](https://nextjs.org/docs/deployment#docker-image)
- [Go Docker 最佳实践](https://docs.docker.com/language/golang/)

---

**更新日期**: 2025.7.29  
**版本**: v1.0.0  
**维护者**: Telos 开发团队
