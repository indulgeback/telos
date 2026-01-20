// Package main 提供 Agent Service 的应用程序入口点
//
// Agent Service 是一个 AI Agent 管理和聊天服务，提供以下功能：
//   - Agent 的 CRUD 管理（创建、读取、更新、删除）
//   - 基于 DeepSeek 模型的流式聊天服务
//   - 支持公开、私有和系统三种 Agent 类型
//   - 服务注册与发现
//   - 优雅关闭和健康检查
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
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"           // PostgreSQL 驱动
	"gorm.io/driver/postgres"       // GORM PostgreSQL 方言
	"gorm.io/gorm"                  // GORM ORM
)

// registerToRegistry 将服务注册到服务注册中心
//
// 参数：
//   - serviceName: 服务名称（如 "agent-service"）
//   - address: 服务监听的 IP 地址
//   - port: 服务监听的端口号
//   - registryURL: 注册中心的 URL（为空时跳过注册）
func registerToRegistry(serviceName, address string, port int, registryURL string) {
	if registryURL == "" {
		tlog.Warn("未配置注册中心地址，跳过注册")
		return
	}

	// 构建服务注册信息
	serviceInfo := map[string]any{
		"name":    serviceName,
		"address": address,
		"port":    port,
		"tags":    []string{"api", serviceName},
		"meta":    map[string]string{"version": "1.0.0"},
	}

	// 发送注册请求到注册中心
	body, err := json.Marshal(serviceInfo)
	if err != nil {
		tlog.Error("服务注册信息序列化失败", "error", err)
		return
	}
	resp, err := http.Post(registryURL+"/api/register", "application/json", bytes.NewReader(body))
	if err != nil {
		tlog.Error("服务注册失败", "error", err, "registry_url", registryURL)
		return
	}
	defer resp.Body.Close()

	// 检查注册响应
	if resp.StatusCode != 200 {
		tlog.Error("服务注册响应异常", "status_code", resp.StatusCode, "service", serviceName)
	} else {
		tlog.Info("服务注册成功", "service", serviceName, "address", address, "port", port)
	}
}

// seedDefaultAgent 初始化系统默认 Agent
//
// 该函数检查数据库中是否已存在默认 Agent，如果不存在则创建。
// 默认 Agent 是系统内置的通用 AI 助手，所有用户都可以使用。
//
// 参数：
//   - db: GORM 数据库实例
//   - agentService: Agent 服务实例，用于检查默认 Agent 是否存在
//
// 返回：
//   - error: 初始化失败时返回错误
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

// main 是 Agent Service 的主入口函数
//
// 执行流程：
//  1. 加载配置（从 .env 文件或环境变量）
//  2. 初始化日志系统
//  3. 连接数据库并执行迁移
//  4. 初始化 Repository 和 Service 层
//  5. 创建默认 Agent（如不存在）
//  6. 初始化聊天服务（DeepSeek 模型）
//  7. 配置 HTTP 路由和中间件
//  8. 注册到服务注册中心
//  9. 启动 HTTP 服务器
// 10. 等待退出信号并优雅关闭
func main() {
	// ========== 1. 加载配置 ==========
	cfg, err := config.LoadConfig(".")
	if err != nil {
		fmt.Printf("配置加载失败: %v\n", err)
		return
	}

	// ========== 2. 初始化日志 ==========
	var logConfig *tlog.Config

	// 根据输出类型选择日志配置
	if cfg.LogOutput == "file" || cfg.LogOutput == "rotating" {
		// 生产环境：输出到文件
		logConfig = tlog.ProductionConfig(cfg.ServiceName, "/var/log/telos")
		logConfig.Level = cfg.LogLevel
		logConfig.Format = cfg.LogFormat
	} else {
		// 开发环境：输出到控制台
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

	// ========== 3. 连接数据库 ==========
	// 构建 PostgreSQL DSN (Data Source Name)
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	tlog.Info("连接数据库中...", "host", cfg.DBHost, "port", cfg.DBPort, "database", cfg.DBName)

	// 使用 GORM 连接 PostgreSQL
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		tlog.Error("数据库连接失败", "error", err)
		return
	}

	tlog.Info("数据库连接成功")

	// ========== 4. 数据库迁移 ==========
	// 检查并添加 system_prompt 列（向后兼容旧版本）
	if !db.Migrator().HasColumn(&model.Agent{}, "system_prompt") {
		tlog.Info("添加 system_prompt 列...")

		if err := db.Exec("ALTER TABLE agents ADD COLUMN system_prompt TEXT").Error; err != nil {
			tlog.Error("添加 system_prompt 列失败", "error", err)
			return
		}

		// 更新现有数据
		if err := db.Exec("UPDATE agents SET system_prompt = '你是一个友好、专业的 AI 助手。' WHERE system_prompt IS NULL OR system_prompt = ''").Error; err != nil {
			tlog.Error("更新 system_prompt 数据失败", "error", err)
			return
		}

		// 设置为 NOT NULL
		if err := db.Exec("ALTER TABLE agents ALTER COLUMN system_prompt SET NOT NULL").Error; err != nil {
			tlog.Error("设置 system_prompt NOT NULL 约束失败", "error", err)
			return
		}
	}

	// 自动迁移模型（创建表、添加缺失的列等）
	tlog.Info("执行数据库迁移...")
	if err := db.AutoMigrate(&model.Agent{}); err != nil {
		tlog.Error("数据库迁移失败", "error", err)
		return
	}
	tlog.Info("数据库迁移完成")

	// ========== 5. 初始化 Repository 层 ==========
	agentRepo := repository.NewAgentRepository(db)

	// ========== 6. 创建聊天服务 ==========
	// 使用 DeepSeek API 作为底层模型
	// 需要在 AgentService 之前创建，因为 AgentService 需要用它生成系统提示词
	chatService, err := service.NewChatService(service.ModelConfig{
		APIKey: cfg.DeepSeekAPIKey,
		Model:  cfg.DeepSeekModel,
	})
	if err != nil {
		tlog.Error("创建聊天服务失败", "error", err)
		return
	}
	tlog.Info("DeepSeek 模型", "model", cfg.DeepSeekModel)

	// ========== 7. 初始化 Service 层 ==========
	// agentService 需要 chatService 来生成系统提示词
	agentService := service.NewAgentService(agentRepo, chatService)

	// ========== 8. 初始化默认 Agent ==========
	if err := seedDefaultAgent(db, agentService); err != nil {
		tlog.Warn("初始化默认 Agent 失败", "error", err)
	}

	// ========== 9. 创建 HTTP 服务器 ==========
	// 设置 Gin 为 release 模式（生产环境）或 debug 模式
	if cfg.LogOutput == "file" || cfg.LogOutput == "rotating" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// 配置中间件
	r.Use(gin.Recovery())                              // 恢复 panic
	r.Use(tlog.GinMiddleware(tlog.WithService(cfg.ServiceName))) // 日志记录
	r.Use(tlog.RequestIDMiddleware())                  // 请求 ID

	// ========== 10. 创建处理器 ==========
	chatHandler := handler.NewChatHandler(chatService, agentService)
	agentHandler := handler.NewAgentHandler(agentService)

	// ========== 11. 注册路由 ==========
	// 健康检查和服务信息
	r.GET("/health", chatHandler.HandleHealth)
	r.GET("/ready", chatHandler.HandleReadiness)
	r.GET("/info", chatHandler.HandleInfo)

	// 聊天 API（流式响应）
	r.POST("/api/agent", chatHandler.HandleChat)

	// Agent 管理 API（CRUD）
	agentHandler.RegisterRoutes(r)

	// ========== 12. 注册到服务注册中心 ==========
	// 使用动态检测的 IP 地址（支持 Docker 容器环境）
	serviceAddr := netutil.GetServiceAddress()
	tlog.Info("检测到服务地址", "address", serviceAddr)
	registerToRegistry(cfg.ServiceName, serviceAddr, cfg.Port, cfg.RegistryURL)

	// ========== 13. 启动 HTTP 服务器 ==========
	addr := ":" + strconv.Itoa(cfg.Port)
	tlog.Info("服务器启动", "port", cfg.Port, "address", addr)

	// 创建 HTTP 服务器（支持优雅关闭）
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	// 在 goroutine 中启动服务器
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			tlog.Error("服务器启动失败", "error", err, "port", cfg.Port)
		}
	}()

	// ========== 14. 优雅关闭 ==========
	// 等待退出信号（Ctrl+C 或 SIGTERM）
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	tlog.Info("正在关闭 Agent Service...")

	// 设置关闭超时
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 关闭 HTTP 服务器
	if err := srv.Shutdown(ctx); err != nil {
		tlog.Error("服务器关闭失败", "error", err)
	}

	// 关闭数据库连接
	if sqlDB, err := db.DB(); err == nil {
		sqlDB.Close()
	}

	tlog.Info("Agent Service 已关闭")
}
