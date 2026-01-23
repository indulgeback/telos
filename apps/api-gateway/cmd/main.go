package main

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/indulgeback/telos/apps/api-gateway/internal/config"
	apimiddleware "github.com/indulgeback/telos/apps/api-gateway/internal/middleware"
	"github.com/indulgeback/telos/apps/api-gateway/internal/proxy"
	"github.com/indulgeback/telos/apps/api-gateway/internal/service"
	"github.com/indulgeback/telos/pkg/tlog"
)

func main() {
	// 加载网关配置
	cfg := config.LoadConfig()

	// 初始化日志
	var logConfig *tlog.Config

	// 根据环境选择不同的日志配置
	if cfg.LogOutput == "file" || cfg.LogOutput == "rotating" {
		// 生产环境 - 文件日志
		logConfig = tlog.ProductionConfig("api-gateway", "/var/log/telos")
		logConfig.Level = cfg.LogLevel
		logConfig.Format = cfg.LogFormat
	} else {
		// 开发环境 - 控制台日志
		logConfig = &tlog.Config{
			Level:       cfg.LogLevel,
			Format:      cfg.LogFormat,
			Output:      cfg.LogOutput,
			ServiceName: "api-gateway",
			EnableColor: true,
			AddSource:   false,
		}
	}

	tlog.Init(logConfig)
	tlog.Info("API网关启动中...")

	// 初始化服务发现和负载均衡
	lb := service.NewRoundRobinLoadBalancer()
	discovery := service.NewRegistryServiceDiscovery(cfg.RegistryServiceURL, lb)

	// 初始化代理管理器
	proxyManager := proxy.NewProxyManager(discovery)

	// 加载路由配置
	routes := []proxy.RouteConfig{
		{
			Path:        "/api/auth",
			ServiceName: "auth-service",
			StripPrefix: false,
			Timeout:     10,
		},
		{
			Path:        "/api/user",
			ServiceName: "user-service",
			StripPrefix: false,
			Timeout:     10,
		},
		{
			Path:        "/api/workflow",
			ServiceName: "workflow-service",
			StripPrefix: false,
			Timeout:     10,
		},
		{
			Path:        "/api/agents",
			ServiceName: "agent-service",
			StripPrefix: false,
			Timeout:     10,
		},
		{
			Path:        "/api/agent",
			ServiceName: "agent-service",
			StripPrefix: false,
			Timeout:     60,
		},
		{
			// 工具管理 API - 列表、创建、详情、更新、删除
			Path:        "/api/tools",
			ServiceName: "agent-service",
			StripPrefix: false,
			Timeout:     10,
		},
	}
	proxyManager.LoadRoutes(routes)

	// 初始化 Echo 实例
	e := echo.New()

	// 添加内置中间件
	e.Use(middleware.Recover())
	e.Use(middleware.RequestID())
	e.Use(echo.WrapMiddleware(apimiddleware.LoggingMiddleware))
	e.Use(echo.WrapMiddleware(apimiddleware.CORSMiddleware(cfg.CORSOrigins)))

	// 添加限流中间件
	rateLimitWindow := time.Duration(cfg.RateLimitWindow) * time.Second
	e.Use(echo.WrapMiddleware(apimiddleware.RateLimitMiddleware(cfg.RateLimitRequests, rateLimitWindow)))

	// 健康检查路由，无需鉴权
	e.GET("/ping", func(c echo.Context) error {
		return c.String(http.StatusOK, "pong")
	})

	// 添加API路由组，需要鉴权
	apiGroup := e.Group("/api")
	// apiGroup.Use(echo.WrapMiddleware(apimiddleware.AuthMiddleware(cfg)))

	// 所有API请求由代理管理器处理
	// 使用自定义 EchoHandler 来支持流式响应（SSE）
	apiGroup.Any("/*", proxyManager.EchoHandler)

	// 启动服务器
	port := cfg.Port
	if port == "" {
		port = "8890"
	}
	addr := ":" + port

	tlog.Info("API网关启动", "address", addr, "port", port)
	if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
		tlog.Error("API网关启动失败", "error", err, "address", addr)
	}
}
