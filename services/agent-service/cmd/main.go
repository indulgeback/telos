package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/indulgeback/telos/pkg/netutil"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/agent-service/internal/config"
	"github.com/indulgeback/telos/services/agent-service/internal/handler"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

// registerToRegistry 注册到服务注册中心
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
	logConfig := &tlog.Config{
		Level:       cfg.Log.Level,
		Format:      cfg.Log.Format,
		Output:      cfg.Log.Output,
		ServiceName: cfg.ServiceName,
		EnableColor: true,
		AddSource:   false,
	}
	tlog.Init(logConfig)

	tlog.Info("Agent Service 启动中...")
	tlog.Info("配置加载成功", "port", cfg.Port, "service_name", cfg.ServiceName)
	tlog.Info("DeepSeek 模型", "model", cfg.DeepSeek.Model)

	// 创建聊天服务
	chatService, err := service.NewChatService(service.ModelConfig{
		APIKey: cfg.DeepSeek.APIKey,
		Model:  cfg.DeepSeek.Model,
	})
	if err != nil {
		tlog.Error("创建聊天服务失败", "error", err)
		return
	}

	// 创建 Echo 实例
	e := echo.New()
	e.HideBanner = true

	// 中间件
	e.Use(middleware.Recover())
	// 注意：Gzip 中间件会破坏 SSE 流式传输，已禁用
	// e.Use(middleware.Gzip())
	e.Use(tlog.EchoMiddleware(tlog.WithService(cfg.ServiceName)))
	e.Use(tlog.EchoRequestIDMiddleware())

	// 创建处理器
	chatHandler := handler.NewChatHandler(chatService)

	// 路由注册
	e.GET("/health", chatHandler.HandleHealth)
	e.GET("/ready", chatHandler.HandleReadiness)
	e.GET("/info", chatHandler.HandleInfo)

	// 聊天 API
	e.POST("/api/agent", chatHandler.HandleChat)

	// 注册到服务注册中心（使用动态检测的IP地址）
	serviceAddr := netutil.GetServiceAddress()
	tlog.Info("检测到服务地址", "address", serviceAddr)
	registerToRegistry(cfg.ServiceName, serviceAddr, cfg.Port, cfg.RegistryURL)

	// 启动服务器
	addr := ":" + strconv.Itoa(cfg.Port)
	tlog.Info("服务器启动", "port", cfg.Port, "address", addr)

	if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
		tlog.Error("服务器启动失败", "error", err, "port", cfg.Port)
		return
	}

	// 等待退出信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	tlog.Info("正在关闭 Agent Service...")

	// 优雅关闭
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := e.Shutdown(ctx); err != nil {
		tlog.Error("服务器关闭失败", "error", err)
	}

	tlog.Info("Agent Service 已关闭")
}
