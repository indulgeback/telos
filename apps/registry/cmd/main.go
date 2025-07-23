package main

import (
	"log"

	"github.com/indulgeback/telos/apps/registry/internal/config"
	"github.com/indulgeback/telos/apps/registry/internal/handler"
	"github.com/indulgeback/telos/apps/registry/internal/service"

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
	e.POST("/register", h.RegisterService)
	e.DELETE("/unregister/:id", h.UnregisterService)
	e.GET("/services", h.ListServices)
	e.GET("/discover/:name", h.DiscoverService)
	e.GET("/health", h.HealthCheck)
	e.GET("/stats", h.GetServiceStats)

	log.Printf("Registry 启动于 :%s", cfg.Port)
	e.Logger.Fatal(e.Start(":" + cfg.Port))
}
