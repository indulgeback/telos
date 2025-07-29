package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/auth-service/internal/middleware"
	"github.com/indulgeback/telos/services/auth-service/internal/model"
	"github.com/indulgeback/telos/services/auth-service/internal/repository"
)

// AuthAPIController 认证API控制器
type AuthAPIController struct {
	userRepo repository.UserRepository
}

// NewAuthAPIController 创建认证API控制器实例
func NewAuthAPIController(userRepo repository.UserRepository) *AuthAPIController {
	return &AuthAPIController{
		userRepo: userRepo,
	}
}

// SignIn 用户登录接口
// POST /api/auth/signin
func (ac *AuthAPIController) SignIn(c *gin.Context) {
	var loginData struct {
		ID          string `json:"id" binding:"required"`       // 用户ID
		Email       string `json:"email" binding:"required"`    // 用户邮箱
		Name        string `json:"name" binding:"required"`     // 用户姓名
		Image       string `json:"image"`                       // 用户头像
		Provider    string `json:"provider" binding:"required"` // 登录提供商
		AccessToken string `json:"accessToken"`                 // 访问令牌
	}

	if err := c.ShouldBindJSON(&loginData); err != nil {
		tlog.Warn("用户登录请求参数错误", "error", err.Error(), "client_ip", c.ClientIP())
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求数据格式错误: " + err.Error(),
		})
		return
	}

	tlog.Info("用户登录请求", "user_id", loginData.ID, "email", loginData.Email, "provider", loginData.Provider, "client_ip", c.ClientIP())

	// 检查用户是否存在，不存在则创建
	user, err := ac.userRepo.GetUserByEmail(loginData.Email)
	if err != nil {
		// 用户不存在，创建新用户
		newUser := &model.User{
			ID:        loginData.ID,
			Username:  loginData.Name,
			Email:     loginData.Email,
			Image:     loginData.Image,
			Provider:  loginData.Provider,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := ac.userRepo.CreateUser(newUser); err != nil {
			tlog.Error("创建用户失败", "error", err.Error(), "user_id", loginData.ID)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "用户创建失败",
			})
			return
		}

		user = newUser
		tlog.Info("新用户创建成功", "user_id", user.ID, "email", user.Email)
	} else {
		// 用户存在，更新用户信息
		user.Username = loginData.Name
		user.Email = loginData.Email
		user.Image = loginData.Image
		user.Provider = loginData.Provider
		now := time.Now()
		user.LastLoginAt = &now
		user.UpdatedAt = time.Now()

		if err := ac.userRepo.UpdateUser(user); err != nil {
			tlog.Warn("更新用户信息失败", "error", err.Error(), "user_id", user.ID)
		}
	}

	tlog.Info("用户登录成功", "user_id", user.ID, "email", user.Email, "provider", loginData.Provider)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":          user.ID,
				"email":       user.Email,
				"name":        user.Username,
				"image":       user.Image,
				"provider":    user.Provider,
				"lastLoginAt": user.LastLoginAt,
				"createdAt":   user.CreatedAt,
				"updatedAt":   user.UpdatedAt,
			},
		},
		"message": "登录成功",
	})
}

// SignOut 用户登出接口
// POST /api/auth/signout
func (ac *AuthAPIController) SignOut(c *gin.Context) {
	// 从JWT中间件获取用户信息
	userID, userEmail, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	tlog.Info("用户登出请求", "user_id", userID, "email", userEmail, "client_ip", c.ClientIP())

	tlog.Info("用户登出成功", "user_id", userID, "email", userEmail)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "登出成功",
	})
}

// SyncUser 同步用户信息接口
// POST /api/auth/sync
func (ac *AuthAPIController) SyncUser(c *gin.Context) {
	// 从JWT中间件获取用户信息
	userID, userEmail, userName, userImage, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	tlog.Info("用户信息同步请求", "user_id", userID, "email", userEmail, "client_ip", c.ClientIP())

	// 从数据库获取最新用户信息
	user, err := ac.userRepo.GetUserByID(userID)
	if err != nil {
		tlog.Error("获取用户信息失败", "error", err.Error(), "user_id", userID)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "用户不存在",
		})
		return
	}

	// 更新用户信息（从JWT token中获取的最新信息）
	updated := false
	if user.Username != userName && userName != "" {
		user.Username = userName
		updated = true
	}
	if user.Email != userEmail && userEmail != "" {
		user.Email = userEmail
		updated = true
	}
	if user.Image != userImage && userImage != "" {
		user.Image = userImage
		updated = true
	}

	if updated {
		user.UpdatedAt = time.Now()
		if err := ac.userRepo.UpdateUser(user); err != nil {
			tlog.Error("更新用户信息失败", "error", err.Error(), "user_id", userID)
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "用户信息更新失败",
			})
			return
		}
		tlog.Info("用户信息已更新", "user_id", userID, "email", userEmail)
	}

	tlog.Info("用户信息同步成功", "user_id", userID, "email", userEmail)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":          user.ID,
				"email":       user.Email,
				"name":        user.Username,
				"image":       user.Image,
				"provider":    user.Provider,
				"lastLoginAt": user.LastLoginAt,
				"createdAt":   user.CreatedAt,
				"updatedAt":   user.UpdatedAt,
			},
			"synced": updated,
		},
		"message": "用户信息同步成功",
	})
}

// HealthCheck 健康检查接口
// GET /api/health
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "健康检查成功",
	})
}
