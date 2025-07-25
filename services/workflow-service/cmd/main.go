package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/fatih/color"
	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/workflow-service/internal/config"
	"github.com/indulgeback/telos/services/workflow-service/internal/controller"
)

func registerToRegistry(serviceName, address string, port int, registryURL string) {
	if registryURL == "" {
		color.New(color.FgYellow).Println("[WARN] 未配置注册中心地址，跳过注册")
		return
	}
	serviceInfo := map[string]interface{}{
		"name":    serviceName,
		"address": address,
		"port":    port,
		"tags":    []string{"api", serviceName},
		"meta":    map[string]string{"version": "1.0.0"},
	}
	body, _ := json.Marshal(serviceInfo)
	resp, err := http.Post(registryURL+"/register", "application/json", bytes.NewReader(body))
	if err != nil {
		color.New(color.FgRed).Printf("[ERROR] 服务注册失败: %v\n", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		color.New(color.FgRed).Printf("[ERROR] 服务注册响应码: %d\n", resp.StatusCode)
	} else {
		color.New(color.FgGreen).Printf("[INFO] 服务注册成功: %s\n", serviceName)
	}
}

func main() {
	cfg := config.LoadConfig()
	registerToRegistry(cfg.ServiceName, "192.168.7.108", cfg.Port, cfg.RegistryURL)
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})
	r.GET("/health", controller.HealthCheck)

	color.New(color.FgGreen).Printf("Workflow Service 启动于 :%d...\n", cfg.Port)
	r.Run(":" + strconv.Itoa(cfg.Port))
}
