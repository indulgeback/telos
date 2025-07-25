package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/user-service/internal/config"
	"github.com/indulgeback/telos/services/user-service/internal/controller"
)

func registerToRegistry(serviceName, address string, port int, registryURL string) {
	if registryURL == "" {
		tlog.Warn("未配置注册中心地址，跳过注册")
		return
	}

	serviceInfo := map[string]any{
		"name":    serviceName,
		"address": address,
		"port":    port,
		"tags":    []string{"api", serviceName},
		"meta":    map[string]string{"version": "1.0.0"},
	}

	body, _ := json.Marshal(serviceInfo)
	resp, err := http.Post(registryURL+"/api/register", "application/json", bytes.NewReader(body))
	if err != nil {
		tlog.Error("服务注册失败", "error", err, "registry_url", registryURL)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		tlog.Error("服务注册响应异常", "status_code", resp.StatusCode, "service", serviceName)
	} else {
		tlog.Info("服务注册成功", "service", serviceName, "address", address, "port", port)
	}
}

func main() {
	// 加载配置
	cfg := config.LoadConfig()

	// 初始化日志
	var logConfig *tlog.Config

	// 根据环境选择不同的日志配置
	if cfg.LogOutput == "file" || cfg.LogOutput == "rotating" {
		// 生产环境 - 文件日志
		logConfig = tlog.ProductionConfig(cfg.ServiceName, "/var/log/telos")
		logConfig.Level = cfg.LogLevel
		logConfig.Format = cfg.LogFormat
	} else {
		// 开发环境 - 控制台日志
		logConfig = &tlog.Config{
			Level:       cfg.LogLevel,
			Format:      cfg.LogFormat,
			Output:      cfg.LogOutput,
			ServiceName: cfg.ServiceName,
			EnableColor: true,
			AddSource:   false,
		}
	}

	tlog.Init(logConfig)

	tlog.Info("用户服务启动中...")
	tlog.Info("配置加载成功", "port", cfg.Port, "service_name", cfg.ServiceName)

	// 注册到服务注册中心
	registerToRegistry(cfg.ServiceName, "192.168.7.108", cfg.Port, cfg.RegistryURL)

	// 设置路由
	r := gin.Default()

	// 添加日志中间件
	r.Use(tlog.GinMiddleware(tlog.WithService(cfg.ServiceName)))
	r.Use(tlog.RequestIDMiddleware())

	r.GET("/ping", func(c *gin.Context) {
		tlog.Debug("Ping请求", "client_ip", c.ClientIP())
		c.JSON(200, gin.H{"message": "pong", "service": cfg.ServiceName})
	})
	r.GET("/health", controller.HealthCheck)

	// 启动服务器
	tlog.Info("服务器启动", "port", cfg.Port, "address", fmt.Sprintf(":%d", cfg.Port))
	if err := r.Run(":" + strconv.Itoa(cfg.Port)); err != nil {
		tlog.Error("服务器启动失败", "error", err, "port", cfg.Port)
	}
}
