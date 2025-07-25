package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/pkg/tlog"
)

func RegisterUserRoutes(r *gin.Engine) {
	users := r.Group("/api/v1/users")
	{
		users.GET("", getUsers)
		users.GET(":id", getUserByID)
	}
}

func getUsers(c *gin.Context) {
	tlog.Info("获取用户列表请求", "client_ip", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"users": []string{}, "service": "用户服务"})
}

func getUserByID(c *gin.Context) {
	id := c.Param("id")
	tlog.Info("获取用户详情请求", "user_id", id, "client_ip", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"user": id, "service": "用户服务"})
}

// HealthCheck 健康检查接口
func HealthCheck(c *gin.Context) {
	tlog.Debug("健康检查请求", "client_ip", c.ClientIP())
	c.JSON(200, gin.H{"status": "ok", "service": "用户服务"})
}
