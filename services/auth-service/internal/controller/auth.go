package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/auth-service/internal/middleware"
)

// AuthController 认证控制器
type AuthController struct{}

// NewAuthController 创建认证控制器实例
func NewAuthController() *AuthController {
	return &AuthController{}
}

// SignIn 用户登录记录
// POST /api/auth/signin
func (ac *AuthController) SignIn(c *gin.Context) {
	var loginData struct {
		ID          string `json:"id" binding:"required"`
		Email       string `json:"email"`
		Name        string `json:"name"`
		Image       string `json:"image"`
		Provider    string `json:"provider" binding:"required"`
		AccessToken string `json:"accessToken"`
	}

	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求数据格式错误: " + err.Error(),
		})
		return
	}

	// TODO: 记录登录日志到数据库
	// loginLog := &model.LoginLog{
	//     UserID:    loginData.ID,
	//     Provider:  loginData.Provider,
	//     IP:        c.ClientIP(),
	//     UserAgent: c.GetHeader("User-Agent"),
	//     LoginAt:   time.Now(),
	// }
	// loginService.Create(loginLog)

	// TODO: 更新用户最后登录时间
	// userService.UpdateLastLogin(loginData.ID, time.Now())

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":          loginData.ID,
				"email":       loginData.Email,
				"name":        loginData.Name,
				"image":       loginData.Image,
				"provider":    loginData.Provider,
				"lastLoginAt": time.Now(),
			},
		},
		"message": "登录记录成功",
	})
}

// SignOut 用户登出记录
// POST /api/auth/signout
func (ac *AuthController) SignOut(c *gin.Context) {
	var logoutData struct {
		UserID string `json:"userId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&logoutData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求数据格式错误: " + err.Error(),
		})
		return
	}

	// TODO: 记录登出日志
	// logoutLog := &model.LogoutLog{
	//     UserID:   logoutData.UserID,
	//     IP:       c.ClientIP(),
	//     LogoutAt: time.Now(),
	// }
	// logoutService.Create(logoutLog)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "登出记录成功",
	})
}

// RefreshToken 刷新访问令牌
// POST /api/auth/refresh
func (ac *AuthController) RefreshToken(c *gin.Context) {
	// 从上下文获取用户信息
	userID, userEmail, userName, userImage, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// TODO: 生成新的访问令牌
	// newToken := jwtService.GenerateToken(userID, userEmail)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":    userID,
				"email": userEmail,
				"name":  userName,
				"image": userImage,
			},
			"token":        "new_jwt_token_here",
			"refreshToken": "new_refresh_token_here",
			"expiresAt":    time.Now().Add(24 * time.Hour),
		},
		"message": "令牌刷新成功",
	})
}

// GetAuthStatus 获取认证状态
// GET /api/auth/status
func (ac *AuthController) GetAuthStatus(c *gin.Context) {
	// 从上下文获取用户信息
	userID, userEmail, userName, userImage, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"authenticated": true,
			"user": gin.H{
				"id":    userID,
				"email": userEmail,
				"name":  userName,
				"image": userImage,
			},
		},
	})
}

// GetLoginHistory 获取登录历史
// GET /api/auth/history
func (ac *AuthController) GetLoginHistory(c *gin.Context) {
	// 从上下文获取用户信息
	_, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// TODO: 从数据库查询登录历史
	// loginHistory := loginService.GetUserLoginHistory(userID, page, limit)

	// 模拟数据
	mockHistory := []gin.H{
		{
			"id":        "1",
			"provider":  "github",
			"ip":        "192.168.1.100",
			"userAgent": "Mozilla/5.0...",
			"loginAt":   time.Now().Add(-2 * time.Hour),
			"location":  "北京, 中国",
		},
		{
			"id":        "2",
			"provider":  "github",
			"ip":        "192.168.1.100",
			"userAgent": "Mozilla/5.0...",
			"loginAt":   time.Now().Add(-24 * time.Hour),
			"location":  "北京, 中国",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"history": mockHistory,
			"total":   len(mockHistory),
		},
		"message": "获取登录历史成功",
	})
}
