package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/auth-service/internal/controller"
	"github.com/indulgeback/telos/services/auth-service/internal/middleware"
)

// SetupProtectedRoutes 设置受保护的路由
func SetupProtectedRoutes(router *gin.Engine) {
	// 创建控制器实例
	protectedController := controller.NewProtectedController()

	// API v1 路由组
	v1 := router.Group("/api/v1")

	// 需要认证的路由组
	authenticated := v1.Group("/")
	authenticated.Use(middleware.JWTMiddleware()) // 应用 JWT 中间件
	{
		// 用户相关路由
		users := authenticated.Group("/users")
		{
			// 获取用户资料（需要认证）
			users.GET("/profile", protectedController.GetUserProfile)

			// 更新用户资料（需要写权限）
			users.PUT("/profile",
				middleware.RequirePermission(middleware.PermissionWrite),
				protectedController.UpdateUserProfile,
			)

			// 删除用户（需要删除权限）
			users.DELETE("/:id",
				middleware.RequirePermission(middleware.PermissionDelete),
				protectedController.DeleteUser,
			)
		}

		// 管理员路由组
		admin := authenticated.Group("/admin")
		admin.Use(middleware.RequireRole(middleware.RoleAdmin)) // 需要管理员角色
		{
			admin.GET("/dashboard", protectedController.AdminOnly)
			admin.GET("/users", protectedController.AdminOnly)
			admin.POST("/users", protectedController.AdminOnly)
		}

		// 工作流相关路由（示例）
		workflows := authenticated.Group("/workflows")
		{
			// 查看工作流（需要读权限）
			workflows.GET("/",
				middleware.RequirePermission(middleware.PermissionRead),
				func(c *gin.Context) {
					c.JSON(200, gin.H{"message": "工作流列表"})
				},
			)

			// 创建工作流（需要写权限）
			workflows.POST("/",
				middleware.RequirePermission(middleware.PermissionWrite),
				func(c *gin.Context) {
					c.JSON(200, gin.H{"message": "创建工作流"})
				},
			)

			// 删除工作流（需要删除权限）
			workflows.DELETE("/:id",
				middleware.RequirePermission(middleware.PermissionDelete),
				func(c *gin.Context) {
					c.JSON(200, gin.H{"message": "删除工作流"})
				},
			)
		}
	}

	// 公开路由（不需要认证）
	public := v1.Group("/public")
	{
		public.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "healthy",
				"service": "auth-service",
			})
		})

		public.GET("/info", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"service": "Telos Auth Service",
				"version": "1.0.0",
			})
		})
	}
}
