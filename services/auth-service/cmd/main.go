package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/auth-service/internal/config"
	"github.com/indulgeback/telos/services/auth-service/internal/controller"
	"github.com/indulgeback/telos/services/auth-service/internal/model"
	"github.com/indulgeback/telos/services/auth-service/internal/repository"
	"github.com/indulgeback/telos/services/auth-service/internal/routes"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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

	tlog.Info("认证服务启动中...")
	tlog.Info("配置加载成功", "port", cfg.Port, "service_name", cfg.ServiceName)

	// 注册到服务注册中心
	registerToRegistry(cfg.ServiceName, "192.168.7.108", cfg.Port, cfg.RegistryURL)

	// 连接数据库
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	tlog.Info("连接数据库中...", "host", cfg.DBHost, "port", cfg.DBPort, "database", cfg.DBName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		tlog.Error("数据库连接失败", "error", err, "dsn", dsn)
		return
	}

	tlog.Info("数据库连接成功")

	// 自动迁移模型
	tlog.Info("执行数据库迁移...")
	if err := db.AutoMigrate(&model.User{}); err != nil {
		tlog.Error("数据库迁移失败", "error", err)
		return
	}
	tlog.Info("数据库迁移完成")

	// 初始化服务
	userRepo := repository.NewUserRepository(db)

	// 设置路由
	r := gin.Default()

	// 添加日志中间件
	r.Use(tlog.GinMiddleware(tlog.WithService("认证服务")))
	r.Use(tlog.RequestIDMiddleware())

	// 设置认证API路由
	routes.SetupAuthRoutes(r, userRepo)

	r.GET("/health", controller.HealthCheck)

	// 启动服务器
	tlog.Info("服务器启动", "port", cfg.Port, "address", fmt.Sprintf(":%d", cfg.Port))
	if err := r.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil && err != http.ErrServerClosed {
		tlog.Error("服务器启动失败", "error", err, "port", cfg.Port)
		return
	}
}
