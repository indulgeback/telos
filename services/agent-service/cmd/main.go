package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/indulgeback/telos/pkg/netutil"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/agent-service/internal/config"
	"github.com/indulgeback/telos/services/agent-service/internal/controller"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/repository"
	"github.com/indulgeback/telos/services/agent-service/internal/routes"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
	einomodel "github.com/indulgeback/telos/services/agent-service/pkg/eino/model"
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
	tlog.Info("Agent 服务启动中...")
	tlog.Info("配置加载成功", "port", cfg.Port, "service_name", cfg.ServiceName)

	// 注册到服务注册中心（使用动态检测的IP地址）
	serviceAddr := netutil.GetServiceAddress()
	tlog.Info("检测到服务地址", "address", serviceAddr)
	registerToRegistry(cfg.ServiceName, serviceAddr, cfg.Port, cfg.RegistryURL)

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

	// 自动迁移模型
	tlog.Info("执行数据库迁移...")
	if err := db.AutoMigrate(
		&model.AgentConfig{},
		&model.Conversation{},
		&model.Message{},
		&model.ToolDefinition{},
		&model.ToolExecution{},
	); err != nil {
		tlog.Error("数据库迁移失败", "error", err)
		return
	}
	tlog.Info("数据库迁移完成")

	// 连接 Redis
	tlog.Info("连接 Redis 中...", "addr", cfg.RedisAddr)
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		tlog.Warn("Redis 连接失败，向量检索功能将不可用", "error", err)
	} else {
		tlog.Info("Redis 连接成功")
	}

	// 初始化 Repository
	agentRepo := repository.NewAgentRepository(db)
	convRepo := repository.NewConversationRepository(db)
	toolRepo := repository.NewToolRepository(db)

	// 初始化 ChatModel
	tlog.Info("初始化 LLM 模型...", "provider", cfg.LLMProvider, "model", cfg.LLMModel)
	chatModel, err := einomodel.NewChatModel(context.Background(), cfg)
	if err != nil {
		tlog.Error("LLM 模型初始化失败", "error", err)
		return
	}
	tlog.Info("LLM 模型初始化成功")

	// 初始化 ToolCallingChatModel (用于 ReAct Agent)
	toolCallingModel, err := einomodel.NewToolCallingChatModel(context.Background(), cfg)
	if err != nil {
		tlog.Error("ToolCallingChatModel 初始化失败", "error", err)
		return
	}

	// 初始化 Service
	agentService := service.NewAgentService(agentRepo, convRepo, toolRepo, chatModel, toolCallingModel)

	// 初始化 Controller
	agentController := controller.NewAgentController(agentService)

	// 设置路由
	r := gin.Default()
	r.Use(tlog.GinMiddleware(tlog.WithService("Agent 服务")))
	r.Use(tlog.RequestIDMiddleware())

	routes.SetupRoutes(r, agentController)

	// 启动服务器
	tlog.Info("服务器启动", "port", cfg.Port, "address", fmt.Sprintf(":%d", cfg.Port))
	if err := r.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil && err != http.ErrServerClosed {
		tlog.Error("服务器启动失败", "error", err, "port", cfg.Port)
		return
	}
}
