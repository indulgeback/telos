package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(r *gin.Engine) {
	users := r.Group("/api/v1/users")
	{
		users.GET("", getUsers)
		users.GET(":id", getUserByID)
	}
}

func getUsers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"users": []string{}})
}

func getUserByID(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"user": id})
}
