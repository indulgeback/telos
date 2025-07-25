package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/indulgeback/telos/services/auth-service/internal/config"
	"github.com/indulgeback/telos/services/auth-service/internal/controller"
	"github.com/indulgeback/telos/services/auth-service/internal/model"
	"github.com/indulgeback/telos/services/auth-service/internal/repository"
	"github.com/indulgeback/telos/services/auth-service/internal/service"

	"github.com/fatih/color"
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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
	// 加载配置
	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	registerToRegistry(cfg.ServiceName, "192.168.7.108", cfg.Port, cfg.RegistryURL)

	// 连接数据库
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 自动迁移模型
	if err := db.AutoMigrate(&model.User{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// 初始化服务
	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo, cfg.JWTSecret, 24*time.Hour)

	// 设置路由
	r := gin.Default()
	authController := controller.NewAuthController(authService)

	api := r.Group("/api/v1")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authController.Register)
			auth.POST("/login", authController.Login)
		}
	}
	r.GET("/health", controller.HealthCheck)

	// 启动服务器
	color.New(color.FgGreen).Printf("Starting server on port %d\n", cfg.Port)
	if err := r.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}
