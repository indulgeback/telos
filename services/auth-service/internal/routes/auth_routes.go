package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/auth-service/internal/controller"
	"github.com/indulgeback/telos/services/auth-service/internal/middleware"
	"github.com/indulgeback/telos/services/auth-service/internal/repository"
)

// SetupAuthRoutes 设置认证相关路由
func SetupAuthRoutes(router *gin.Engine, userRepo repository.UserRepository) {
	// 创建认证API控制器实例
	authAPIController := controller.NewAuthAPIController(userRepo)

	// API v1 路由组
	v1 := router.Group("/api/v1")

	// 认证路由组
	auth := v1.Group("/auth")
	{
		// 公开路由（不需要认证）
		auth.POST("/signin", authAPIController.SignIn) // 用户登录

		// 需要认证的路由
		authenticated := auth.Group("/")
		authenticated.Use(middleware.JWTMiddleware()) // 应用 JWT 中间件
		{
			authenticated.POST("/signout", authAPIController.SignOut)      // 用户登出
			authenticated.POST("/sync", authAPIController.SyncUser)        // 同步用户信息
			authenticated.GET("/profile", authAPIController.GetProfile)    // 获取用户资料
			authenticated.POST("/refresh", authAPIController.RefreshToken) // 刷新令牌
			authenticated.GET("/status", authAPIController.GetAuthStatus)  // 获取认证状态
		}
	}

	// 健康检查路由
	v1.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "auth-service",
			"version": "1.0.0",
		})
	})

	// 服务信息路由
	v1.GET("/info", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"service":     "Telos Auth Service",
			"version":     "1.0.0",
			"description": "认证服务，提供用户登录、登出和信息同步功能",
			"endpoints": gin.H{
				"auth": gin.H{
					"signin":  "POST /api/v1/auth/signin",
					"signout": "POST /api/v1/auth/signout",
					"sync":    "POST /api/v1/auth/sync",
					"profile": "GET /api/v1/auth/profile",
					"refresh": "POST /api/v1/auth/refresh",
					"status":  "GET /api/v1/auth/status",
				},
				"health": "GET /api/v1/health",
				"info":   "GET /api/v1/info",
			},
		})
	})
}
