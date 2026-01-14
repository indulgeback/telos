package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/repository"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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

// seedDefaultAgent 初始化默认 Agent
func seedDefaultAgent(db *gorm.DB, agentService service.AgentService) error {
	ctx := context.Background()

	// 检查是否已存在默认 Agent
	_, err := agentService.GetDefaultAgent(ctx)
	if err == nil {
		tlog.Info("默认 Agent 已存在，跳过初始化")
		return nil
	}

	// 创建默认 Agent
	defaultAgent := model.DefaultAgent
	if err := db.Create(defaultAgent).Error; err != nil {
		return fmt.Errorf("创建默认 Agent 失败: %w", err)
	}

	tlog.Info("默认 Agent 初始化成功", "agent_id", defaultAgent.ID, "agent_name", defaultAgent.Name)
	return nil
}

func main() {
	// 加载配置
	cfg, err := config.LoadConfig(".")
	if err != nil {
		fmt.Printf("配置加载失败: %v\n", err)
		return
	}

	// 初始化日志
	var logConfig *tlog.Config

	if cfg.LogOutput == "file" || cfg.LogOutput == "rotating" {
		logConfig = tlog.ProductionConfig(cfg.ServiceName, "/var/log/telos")
		logConfig.Level = cfg.LogLevel
		logConfig.Format = cfg.LogFormat
	} else {
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

	tlog.Info("Agent Service 启动中...")
	tlog.Info("配置加载成功", "port", cfg.Port, "service_name", cfg.ServiceName)

	// 连接数据库
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	tlog.Info("连接数据库中...", "host", cfg.DBHost, "port", cfg.DBPort, "database", cfg.DBName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		tlog.Error("数据库连接失败", "error", err)
		return
	}

	tlog.Info("数据库连接成功")

	// 检查并添加 system_prompt 列（如果不存在）
	if !db.Migrator().HasColumn(&model.Agent{}, "system_prompt") {
		tlog.Info("添加 system_prompt 列...")
		db.Exec("ALTER TABLE agents ADD COLUMN system_prompt TEXT")
		// 更新现有数据
		db.Exec("UPDATE agents SET system_prompt = '你是一个友好、专业的 AI 助手。' WHERE system_prompt IS NULL OR system_prompt = ''")
		// 设置为 NOT NULL
		db.Exec("ALTER TABLE agents ALTER COLUMN system_prompt SET NOT NULL")
	}

	// 自动迁移模型
	tlog.Info("执行数据库迁移...")
	if err := db.AutoMigrate(&model.Agent{}); err != nil {
		tlog.Error("数据库迁移失败", "error", err)
		return
	}
	tlog.Info("数据库迁移完成")

	// 初始化 Repository
	agentRepo := repository.NewAgentRepository(db)

	// 初始化 Service
	agentService := service.NewAgentService(agentRepo)

	// 初始化默认 Agent
	if err := seedDefaultAgent(db, agentService); err != nil {
		tlog.Warn("初始化默认 Agent 失败", "error", err)
	}

	// 创建聊天服务
	chatService, err := service.NewChatService(service.ModelConfig{
		APIKey: cfg.DeepSeekAPIKey,
		Model:  cfg.DeepSeekModel,
	})
	if err != nil {
		tlog.Error("创建聊天服务失败", "error", err)
		return
	}
	tlog.Info("DeepSeek 模型", "model", cfg.DeepSeekModel)

	// 创建 Echo 实例
	e := echo.New()
	e.HideBanner = true

	// 中间件
	e.Use(middleware.Recover())
	e.Use(tlog.EchoMiddleware(tlog.WithService(cfg.ServiceName)))
	e.Use(tlog.EchoRequestIDMiddleware())

	// 创建处理器
	chatHandler := handler.NewChatHandler(chatService, agentService)
	agentHandler := handler.NewAgentHandler(agentService)

	// 路由注册
	e.GET("/health", chatHandler.HandleHealth)
	e.GET("/ready", chatHandler.HandleReadiness)
	e.GET("/info", chatHandler.HandleInfo)

	// 聊天 API
	e.POST("/api/agent", chatHandler.HandleChat)

	// Agent 管理 API
	agentHandler.RegisterRoutes(e)

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

	// 关闭数据库连接
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.Close()
	}

	tlog.Info("Agent Service 已关闭")
}
