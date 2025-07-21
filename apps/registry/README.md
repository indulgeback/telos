# Registry - 基于 Consul 的服务注册中心

基于 Consul 实现的微服务注册中心，提供服务的注册、注销、发现和健康检查功能。

> 本服务基于 Echo 框架实现，专注于高性能服务注册与发现。

## 功能特性

- 🔍 **服务发现**: 基于 Consul 的分布式服务发现
- 📝 **服务注册**: 支持服务实例的注册和注销
- 🏥 **健康检查**: 自动健康检查，自动清理不健康实例
- 🔄 **服务监听**: 支持服务变化监听和回调
- 🌐 **RESTful API**: 提供完整的 HTTP API 接口
- ⚡ **高性能**: 基于 Echo 框架的高性能 HTTP 服务

## 环境变量配置

| 变量名           | 说明             | 默认值           |
| ---------------- | ---------------- | ---------------- |
| `CONSUL_ADDRESS` | Consul 服务地址  | `localhost:8500` |
| `CONSUL_TOKEN`   | Consul ACL Token | ``               |
| `CONSUL_DC`      | Consul 数据中心  | ``               |
| `REGISTRY_PORT`  | 注册中心服务端口 | `8820`           |
| `LOG_LEVEL`      | 日志级别         | `info`           |

## 目录结构

```textplain
apps/registry/
├── cmd/           # 主程序入口
├── internal/      # 配置、服务发现、处理器
├── go.mod
└── README.md
```

## API 接口

### 1. 注册服务

```http
POST /register
Content-Type: application/json
{
  "id": "auth-service-1",
  "name": "auth-service",
  "address": "localhost",
  "port": 8081,
  "tags": ["api", "auth"],
  "meta": {
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### 2. 注销服务

```http
DELETE /unregister/{service-id}
```

### 3. 获取服务列表

```http
GET /services?name={service-name}
```

### 4. 发现服务

```http
GET /discover/{service-name}
```

### 5. 健康检查

```http
GET /health
```

### 6. 服务统计

```http
GET /stats
```

## 启动方式

```bash
# 安装依赖
go mod tidy
# 启动服务
go run cmd/main.go
# 或设置环境变量启动
CONSUL_ADDRESS=localhost:8500 \
REGISTRY_PORT=8820 \
go run cmd/main.go
# 推荐使用 Makefile
make run
# 或从项目根目录统一入口：
pnpm run registry:run
```

## 使用示例

### 注册服务

```bash
curl -X POST http://localhost:8820/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "auth-service",
    "address": "localhost",
    "port": 8081,
    "tags": ["api", "auth"]
  }'
```

### 查询服务

```bash
curl http://localhost:8820/services?name=auth-service
```

### 发现服务

```bash
curl http://localhost:8820/discover/auth-service
```

## 与 API Gateway 集成

在 API Gateway 中，可以将内存服务发现替换为 Consul 服务发现：

```go
// 在 api-gateway 中使用 Consul 服务发现
cfg := config.LoadConfig()
discovery, err := service.NewConsulServiceDiscovery(cfg)
if err != nil {
    log.Fatalf("Consul 初始化失败: %v", err)
}
// 使用 discovery 进行服务发现
instance, err := discovery.Discover("auth-service")
if err != nil {
    // 处理错误
}
```

## 扩展建议

- 🔐 **权限控制**: 添加 API 认证和授权
- 📊 **监控指标**: 集成 Prometheus 监控
- 📝 **API 文档**: 添加 Swagger 文档
- 🔄 **配置热更新**: 支持配置动态更新
- 🚀 **集群模式**: 支持多实例部署

## 依赖

- Go 1.19+
- [Consul](https://www.consul.io/) - 服务发现和配置管理
- [Echo v4](https://echo.labstack.com/) - HTTP 框架

---

如有问题欢迎提 issue 或交流！
