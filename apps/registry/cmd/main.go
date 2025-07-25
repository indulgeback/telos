package main

import (
	"log"

	"github.com/indulgeback/telos/apps/registry/internal/config"
	"github.com/indulgeback/telos/apps/registry/internal/handler"
	"github.com/indulgeback/telos/apps/registry/internal/service"

	"github.com/fatih/color"
	"github.com/labstack/echo/v4"
)

func main() {
	cfg := config.LoadConfig()
	discovery, err := service.NewConsulServiceDiscovery(cfg)
	if err != nil {
		log.Fatalf("Consul 初始化失败: %v", err)
	}

	h := handler.NewRegistryHandler(discovery)
	e := echo.New()
	apiGroup := e.Group("/api")
	apiGroup.POST("/register", h.RegisterService)
	apiGroup.DELETE("/unregister/:id", h.UnregisterService)
	apiGroup.GET("/services", h.ListServiceNames)
	apiGroup.GET("/service", h.ListServiceInstances)
	apiGroup.GET("/health", h.HealthCheck)
	apiGroup.GET("/stats", h.GetServiceStats)

	color.New(color.FgGreen).Printf("Registry 启动于 :%s\n", cfg.Port)
	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
