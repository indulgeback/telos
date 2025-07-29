package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/auth-service/internal/middleware"
)

// ProtectedController 受保护的控制器示例
type ProtectedController struct{}

// NewProtectedController 创建受保护控制器实例
func NewProtectedController() *ProtectedController {
	return &ProtectedController{}
}

// GetUserProfile 获取用户资料（需要认证）
func (pc *ProtectedController) GetUserProfile(c *gin.Context) {
	// 从上下文获取用户信息
	userID, userEmail, userName, userImage, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// 返回用户资料
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":    userID,
				"email": userEmail,
				"name":  userName,
				"image": userImage,
			},
		},
		"message": "获取用户资料成功",
	})
}

// UpdateUserProfile 更新用户资料（需要写权限）
func (pc *ProtectedController) UpdateUserProfile(c *gin.Context) {
	// 从上下文获取用户信息
	userID, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	// 获取请求体
	var updateData struct {
		Name  string `json:"name"`
		Image string `json:"image"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求数据格式错误",
		})
		return
	}

	// TODO: 更新数据库中的用户信息
	// userService.UpdateProfile(userID, updateData)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":    userID,
				"name":  updateData.Name,
				"image": updateData.Image,
			},
		},
		"message": "用户资料更新成功",
	})
}

// DeleteUser 删除用户（需要删除权限）
func (pc *ProtectedController) DeleteUser(c *gin.Context) {
	// 从上下文获取用户信息
	userID, _, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	targetUserID := c.Param("id")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "用户 ID 不能为空",
		})
		return
	}

	// 用户只能删除自己的账户，除非是管理员
	if targetUserID != userID {
		// 检查是否是管理员
		userRole, _ := middleware.GetUserRole(c)
		if userRole != middleware.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "只能删除自己的账户",
			})
			return
		}
	}

	// TODO: 从数据库删除用户
	// userService.DeleteUser(targetUserID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "用户删除成功",
	})
}

// AdminOnly 仅管理员可访问的接口
func (pc *ProtectedController) AdminOnly(c *gin.Context) {
	// 从上下文获取用户信息
	userID, userEmail, _, _, exists := middleware.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户信息获取失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"message": "欢迎管理员",
			"admin": gin.H{
				"id":    userID,
				"email": userEmail,
			},
		},
	})
}
