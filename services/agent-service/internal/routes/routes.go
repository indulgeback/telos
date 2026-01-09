package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/agent-service/internal/controller"
)

// SetupRoutes 设置路由
func SetupRoutes(router *gin.Engine, agentController *controller.AgentController) {
	// 根路径健康检查（供 Consul 使用）
	router.GET("/health", controller.HealthCheck)

	// API 路由组
	api := router.Group("/api/agent")
	{
		// Agent 管理
		agents := api.Group("/agents")
		{
			agents.POST("", agentController.CreateAgent)           // 创建 Agent
			agents.GET("", agentController.ListAgents)             // 列表
			agents.GET("/:id", agentController.GetAgent)           // 详情
			agents.PUT("/:id", agentController.UpdateAgent)        // 更新
			agents.DELETE("/:id", agentController.DeleteAgent)     // 删除
		}

		// 对话管理
		conversations := api.Group("/conversations")
		{
			conversations.POST("", agentController.CreateConversation)            // 创建对话
			conversations.GET("/:id/history", agentController.GetConversationHistory) // 对话历史
		}

		// Chat
		api.POST("/chat", agentController.Chat) // 对话接口

		// Tools
		api.GET("/tools", agentController.GetAvailableTools) // 获取可用工具
		api.POST("/tools/:tool_name/execute", agentController.ExecuteTool) // 直接执行工具
	}

	// 服务信息
	api.GET("/info", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"service":     "Telos Agent Service",
			"version":     "1.0.0",
			"description": "可配置的 AI Agent 服务，基于字节跳动 Eino 框架",
			"endpoints": gin.H{
				"agents": gin.H{
					"create": "POST /api/agent/agents",
					"list":   "GET /api/agent/agents",
					"get":    "GET /api/agent/agents/:id",
					"update": "PUT /api/agent/agents/:id",
					"delete": "DELETE /api/agent/agents/:id",
				},
				"conversations": gin.H{
					"create":  "POST /api/agent/conversations",
					"history": "GET /api/agent/conversations/:id/history",
				},
				"chat":   "POST /api/agent/chat",
				"health": "GET /health",
			},
		})
	})
}
