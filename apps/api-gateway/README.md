# API Gateway

API Gateway 是微服务架构中的统一入口，负责请求路由、认证、限流等功能。

## 功能特性

- 基于 [Echo](https://echo.labstack.com/) 框架实现高性能 HTTP 服务
- 支持 JWT 鉴权（通过调用 auth-service 微服务）
- 反向代理，将 /api/\* 请求转发到后端服务
- 健康检查接口 `/ping`
- 支持服务发现与负载均衡（内存实现，便于扩展）

## 依赖

- Go 1.19+
- [Echo v4](https://github.com/labstack/echo)

## 环境变量

| 变量名           | 说明                    | 示例                    |
| ---------------- | ----------------------- | ----------------------- |
| GATEWAY_PORT     | 网关监听端口            | 8080                    |
| AUTH_SERVICE_URL | 认证服务地址（如 http） | <http://localhost:8081> |

## 启动方式

```bash
# 安装依赖
go mod tidy
# 启动服务（需先设置环境变量）
GATEWAY_PORT=8080 AUTH_SERVICE_URL=http://localhost:8081 go run cmd/main.go
```

## 目录结构

```
internal/
  config/      # 配置加载
  middleware/  # 鉴权中间件
  proxy/       # 反向代理
  service/     # 服务发现与负载均衡
cmd/
  main.go      # 启动入口
```

## 主要接口说明

- `GET /ping`：健康检查，无需鉴权
- `ANY /api/*`：所有 API 请求，先鉴权再代理到后端服务

## 代码示例

```go
// 注册服务发现与负载均衡
lb := service.NewRoundRobinLoadBalancer()
sd := service.NewMemoryServiceDiscovery(lb)
sd.Register("auth-service", "http://localhost:8081")
addr, err := sd.Discover("auth-service")
```

## 扩展建议

- 可接入 etcd/consul 实现分布式服务发现
- 支持多服务路由、限流、熔断等高级功能

---

如有问题欢迎提 issue 或交流！
