package main

import (
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/indulgeback/telos/apps/api-gateway/internal/config"
	apimiddleware "github.com/indulgeback/telos/apps/api-gateway/internal/middleware"
	"github.com/indulgeback/telos/apps/api-gateway/internal/proxy"
	"github.com/indulgeback/telos/apps/api-gateway/internal/service"
)

func main() {
	// 加载网关配置
	cfg := config.LoadConfig()

	// 初始化服务发现和负载均衡
	lb := service.NewRoundRobinLoadBalancer()
	discovery := service.NewRegistryServiceDiscovery("http://localhost:8080", lb)

	// 初始化代理管理器
	proxyManager := proxy.NewProxyManager(discovery)

	// 加载路由配置
	routes := []proxy.RouteConfig{
		{
			Path:        "/api/auth",
			ServiceName: "auth-service",
			StripPrefix: true,
			Timeout:     10,
		},
		{
			Path:        "/api/user",
			ServiceName: "user-service",
			StripPrefix: true,
			Timeout:     10,
		},
		{
			Path:        "/api/workflow",
			ServiceName: "workflow-service",
			StripPrefix: true,
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
	apiGroup.Use(echo.WrapMiddleware(apimiddleware.AuthMiddleware(cfg)))

	// 所有API请求由代理管理器处理
	apiGroup.Any("/*", echo.WrapHandler(proxyManager))

	// 启动服务器
	port := cfg.Port
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("API Gateway 启动于 %s...", addr)
	if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
		log.Fatalf("启动失败: %v", err)
	}
}
