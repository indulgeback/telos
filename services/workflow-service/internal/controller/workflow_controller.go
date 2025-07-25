package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/pkg/tlog"
)

func RegisterWorkflowRoutes(r *gin.Engine) {
	workflows := r.Group("/api/v1/workflows")
	{
		workflows.GET("", getWorkflows)
		workflows.GET(":id", getWorkflowByID)
	}
}

func getWorkflows(c *gin.Context) {
	tlog.Info("获取工作流列表请求", "client_ip", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"workflows": []string{}, "service": "工作流服务"})
}

func getWorkflowByID(c *gin.Context) {
	id := c.Param("id")
	tlog.Info("获取工作流详情请求", "workflow_id", id, "client_ip", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"workflow": id, "service": "工作流服务"})
}

// HealthCheck 健康检查接口
func HealthCheck(c *gin.Context) {
	tlog.Debug("健康检查请求", "client_ip", c.ClientIP())
	c.JSON(200, gin.H{"status": "ok", "service": "工作流服务"})
}
