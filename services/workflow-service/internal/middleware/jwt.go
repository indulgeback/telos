package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims JWT 声明结构
type JWTClaims struct {
	Sub   string `json:"sub"`   // 用户 ID
	Email string `json:"email"` // 用户邮箱
	Name  string `json:"name"`  // 用户姓名
	Image string `json:"image"` // 用户头像
	jwt.RegisteredClaims
}

// JWTMiddleware JWT 验证中间件
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从 Authorization header 获取 token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "缺少认证 token",
			})
			c.Abort()
			return
		}

		// 检查 Bearer 前缀
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "无效的 token 格式",
			})
			c.Abort()
			return
		}

		// 验证 JWT token
		claims, err := validateJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   fmt.Sprintf("token 验证失败: %v", err),
			})
			c.Abort()
			return
		}

		// 将用户信息存储到上下文中
		c.Set("user_id", claims.Sub)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("user_image", claims.Image)
		c.Set("user_claims", claims)

		c.Next()
	}
}

// validateJWT 验证 JWT token
func validateJWT(tokenString string) (*JWTClaims, error) {
	// 获取 JWT 密钥
	secret := os.Getenv("AUTH_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT 密钥未配置")
	}

	// 解析 token
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("意外的签名方法: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	// 验证 token 有效性
	if !token.Valid {
		return nil, fmt.Errorf("无效的 token")
	}

	// 获取声明
	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, fmt.Errorf("无法解析 token 声明")
	}

	// 检查过期时间
	if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, fmt.Errorf("token 已过期")
	}

	return claims, nil
}

// GetUserFromContext 从上下文中获取用户信息
func GetUserFromContext(c *gin.Context) (string, string, string, string, bool) {
	userID, exists1 := c.Get("user_id")
	userEmail, exists2 := c.Get("user_email")
	userName, exists3 := c.Get("user_name")
	userImage, exists4 := c.Get("user_image")

	if !exists1 || !exists2 || !exists3 || !exists4 {
		return "", "", "", "", false
	}

	return userID.(string), userEmail.(string), userName.(string), userImage.(string), true
}

// RequireAuth 需要认证的路由装饰器
func RequireAuth(handler gin.HandlerFunc) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		// 先执行 JWT 中间件
		JWTMiddleware()(c)

		// 如果中间件没有中止请求，继续执行处理器
		if !c.IsAborted() {
			handler(c)
		}
	})
}
