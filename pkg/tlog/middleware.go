package tlog

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labstack/echo/v4"
)

// GinMiddleware 返回用于请求日志记录的Gin中间件
func GinMiddleware(logger *Logger) gin.HandlerFunc {
	if logger == nil {
		logger = Default()
	}

	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// 处理请求
		c.Next()

		// 计算请求持续时间
		duration := time.Since(start)

		// 构建完整路径（包含查询字符串）
		if raw != "" {
			path = path + "?" + raw
		}

		// 获取客户端IP
		clientIP := c.ClientIP()

		// 获取用户代理
		userAgent := c.Request.UserAgent()

		// 记录请求日志
		logger.LogRequest(
			c.Request.Method,
			path,
			userAgent,
			clientIP,
			c.Writer.Status(),
			duration,
		)
	}
}

// EchoMiddleware 返回用于请求日志记录的Echo中间件
func EchoMiddleware(logger *Logger) echo.MiddlewareFunc {
	if logger == nil {
		logger = Default()
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			req := c.Request()
			res := c.Response()

			// 处理请求
			err := next(c)

			// 计算请求持续时间
			duration := time.Since(start)

			// 获取客户端IP
			clientIP := c.RealIP()

			// 获取用户代理
			userAgent := req.UserAgent()

			// 构建完整路径（包含查询字符串）
			path := req.URL.Path
			if req.URL.RawQuery != "" {
				path = path + "?" + req.URL.RawQuery
			}

			// 记录请求日志
			logger.LogRequest(
				req.Method,
				path,
				userAgent,
				clientIP,
				res.Status,
				duration,
			)

			return err
		}
	}
}

// RequestIDMiddleware 为Gin添加请求ID到上下文的中间件
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// EchoRequestIDMiddleware 为Echo添加请求ID到上下文的中间件
func EchoRequestIDMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			requestID := c.Request().Header.Get("X-Request-ID")
			if requestID == "" {
				requestID = generateRequestID()
			}

			c.Set("request_id", requestID)
			c.Response().Header().Set("X-Request-ID", requestID)
			return next(c)
		}
	}
}

// generateRequestID 生成简单的请求ID
func generateRequestID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return time.Now().Format("20060102150405") + "-" + hex.EncodeToString(bytes)
}
