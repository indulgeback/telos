package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterWorkflowRoutes(r *gin.Engine) {
	workflows := r.Group("/api/v1/workflows")
	{
		workflows.GET("", getWorkflows)
		workflows.GET(":id", getWorkflowByID)
	}
}

func getWorkflows(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"workflows": []string{}})
}

func getWorkflowByID(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"workflow": id})
}

// HealthCheck 健康检查接口
func HealthCheck(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok"})
}
