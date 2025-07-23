package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("Workflow Service 启动于 :%s...", port)
	r.Run(":" + port)
}
