# Auth Service

认证服务，提供用户注册、登录和 JWT 认证功能。

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

## 运行服务

1. 确保 PostgreSQL 数据库已启动并配置正确
2. 运行服务：

```bash
go run cmd/main.go
```

## API 端点

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录

## 注意事项

- 请确保在生产环境中使用强密码和安全的 JWT 密钥
- 数据库连接使用 SSL 禁用模式，生产环境建议启用 SSL
- 服务会自动创建用户表结构
