# Auth Service

认证服务，提供用户登录、登出和信息同步功能。

> 本服务基于 Gin 框架实现，专注于高效的用户认证与鉴权。

## 环境配置

1. 复制环境变量模板文件：

```bash
cp env.example .env
```

2. 编辑 `.env` 文件，配置以下环境变量：

### 服务配置

- `PORT`: 服务端口号（默认：8080）
- `SERVICE_NAME`: 服务名称（默认：auth-service）

### 数据库配置

- `DB_HOST`: 数据库主机地址
- `DB_PORT`: 数据库端口号（默认：5432）
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称

### JWT 配置

- `JWT_SECRET`: JWT 密钥（请使用长且安全的密钥）

## 目录结构

```textplain
services/auth-service/
├── cmd/           # 启动入口
├── internal/      # 业务逻辑、模型、控制器等
├── docs/          # API 文档
├── go.mod
└── README.md
```

## 运行服务

1. 确保 PostgreSQL 数据库已启动并配置正确
2. 运行服务：

```bash
go run cmd/main.go
# 推荐使用 Makefile
make run
# 或从项目根目录统一入口：
pnpm run auth-service:run
```

## API 端点

- `POST /api/auth/signin` - 用户登录
- `POST /api/auth/signout` - 用户登出
- `POST /api/auth/sync` - 同步用户信息

## 功能特性

- **用户登录**: 支持 OAuth 登录，自动创建或更新用户信息
- **用户登出**: 安全的用户登出功能
- **信息同步**: 从 JWT token 同步最新用户信息到数据库
- **JWT 认证**: 基于 JWT 的无状态认证机制
- **自动迁移**: 自动创建数据库表结构

## 注意事项

- 请确保在生产环境中使用强密码和安全的 JWT 密钥
- 数据库连接使用 SSL 禁用模式，生产环境建议启用 SSL
- 服务会自动创建用户表结构
- 详细的 API 文档请参考 `docs/AUTH_API.md`
