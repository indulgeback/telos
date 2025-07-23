# Workflow Service

工作流服务，提供流程定义、任务流转等功能。

> 本服务基于 Gin 框架实现，专注于高效的工作流管理。

## 环境配置

1. 复制环境变量模板文件：

```bash
cp env.example .env
```

2. 编辑 `.env` 文件，配置以下环境变量：

### 服务配置

- `PORT`: 服务端口号（默认：8082）
- `SERVICE_NAME`: 服务名称（默认：workflow-service）

### 数据库配置

- `DB_HOST`: 数据库主机地址
- `DB_PORT`: 数据库端口号（默认：5432）
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_NAME`: 数据库名称

## 目录结构

```textplain
services/workflow-service/
├── cmd/           # 启动入口
├── internal/      # 业务逻辑、模型、控制器等
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
pnpm run workflow-service:run
```

## API 端点

- `GET /api/v1/workflows` - 获取工作流列表
- `GET /api/v1/workflows/:id` - 获取工作流详情

## 注意事项

- 请确保在生产环境中使用强密码和安全的数据库配置
- 数据库连接使用 SSL 禁用模式，生产环境建议启用 SSL
- 服务会自动创建工作流表结构
