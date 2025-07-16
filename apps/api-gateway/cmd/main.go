package main

import (
	"log"
	"net/http"

	"github.com/labstack/echo/v4"

	"api-gateway/internal/config"
	"api-gateway/internal/middleware"
	"api-gateway/internal/proxy"
)

func main() {
	cfg := config.LoadConfig() // 加载网关配置

	e := echo.New() // 初始化 Echo 实例

	// 健康检查路由，无需鉴权
	e.GET("/ping", func(c echo.Context) error {
		return c.String(200, "pong")
	})

	// 需要鉴权的 API 路由，所有 /api/* 请求先经过 AuthMiddleware，再由 ProxyHandler 代理转发
	e.Group("/api",
		echo.WrapMiddleware(middleware.AuthMiddleware),
	).Any("/*", echo.WrapHandler(http.HandlerFunc(proxy.ProxyHandler)))

	port := cfg.Port
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("API Gateway 启动于 %s...", addr)
	if err := e.Start(addr); err != nil {
		log.Fatalf("启动失败: %v", err)
	}
}
