# API Gateway

API Gateway 是微服务架构中的统一入口，负责请求路由、认证、限流等功能。

> 本服务基于 Echo 框架实现，专注于高性能 API 网关。

## 功能特性

- 基于 [Echo](https://echo.labstack.com/) 框架实现高性能 HTTP 服务
- 支持 JWT 鉴权（通过调用 auth-service 微服务）
- 反向代理，将 /api/\* 请求转发到后端服务
- 健康检查接口 `/ping`
- 支持服务发现与负载均衡（内存实现，便于扩展）
- CORS 跨域支持
- 请求日志记录
- 基于令牌桶的限流机制
- 路由配置化管理

## 依赖

- Go 1.19
- [Echo v4](https://github.com/labstack/echo)

## 环境变量

| 变量名              | 说明               | 默认值                           |
| ------------------- | ------------------ | -------------------------------- | -------------------------- | ----------------------------- | -------- | ---- |
| GATEWAY_PORT        | 网关监听端口       | 880                              |
| AUTH_SERVICE_URL    | 认证服务地址       | <http://localhost:5501S_ORIGINS> | 允许的跨域来源（逗号分隔） | <http://localhost:3000_LEVEL> | 日志级别 | info |
| RATE_LIMIT_REQUESTS | 限流请求数         | 10                               |
| RATE_LIMIT_WINDOW   | 限流时间窗口（秒） | 60                               |

## 目录结构

```textplain
apps/api-gateway/
├── cmd/           # 启动入口
├── internal/      # 配置、中间件、代理、服务发现
├── go.mod
└── README.md
```

## 启动方式

```bash
# 安装依赖
go mod tidy
# 启动服务（需先设置环境变量）
GATEWAY_PORT=880\
AUTH_SERVICE_URL=http://localhost:5501
CORS_ORIGINS=http://localhost:300 \
RATE_LIMIT_REQUESTS=100 \
RATE_LIMIT_WINDOW=60 \
go run cmd/main.go
# 推荐使用 Makefile
make run
# 或从项目根目录统一入口：
pnpm run api-gateway:run
```

## 主要接口说明

- `GET /ping`：健康检查，无需鉴权
- `ANY /api/*`：所有 API 请求，先鉴权再代理到后端服务

## 路由配置示例

```go
routes := []proxy.RouteConfig{
 [object Object]      Path:   /api/auth,       ServiceName: "auth-service",
        StripPrefix: true,
        Timeout:     10,
    },
    // 可以添加更多路由配置
}
```

## 代码示例

```go
// 注册服务发现与负载均衡
lb := service.NewRoundRobinLoadBalancer()
sd := service.NewMemoryServiceDiscovery(lb)
sd.Register("auth-service", http://localhost:5501)
addr, err := sd.Discover("auth-service")

// 使用代理管理器
proxyManager := proxy.NewProxyManager(sd)
proxyManager.LoadRoutes(routes)
```

## 中间件说明

- **AuthMiddleware**: 从请求头获取 Authorization token，调用 auth-service 验证
- **LoggingMiddleware**: 记录请求方法、路径、状态码和耗时
- **CORSMiddleware**: 处理跨域请求，支持预检请求
- **RateLimitMiddleware**: 基于令牌桶算法的限流，按客户端 IP 限流

## 扩展建议

- 可接入 etcd/consul 实现分布式服务发现
- 支持多服务路由、熔断、重试等高级功能
- 集成 Prometheus 监控指标
- 支持配置热更新

---

如有问题欢迎提 issue 或交流！
