package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// UserRole 用户角色枚举
type UserRole string

const (
	RoleAdmin     UserRole = "admin"
	RoleUser      UserRole = "user"
	RoleGuest     UserRole = "guest"
	RoleModerator UserRole = "moderator"
)

// Permission 权限枚举
type Permission string

const (
	PermissionRead   Permission = "read"
	PermissionWrite  Permission = "write"
	PermissionDelete Permission = "delete"
	PermissionAdmin  Permission = "admin"
)

// RolePermissions 角色权限映射
var RolePermissions = map[UserRole][]Permission{
	RoleAdmin: {
		PermissionRead,
		PermissionWrite,
		PermissionDelete,
		PermissionAdmin,
	},
	RoleModerator: {
		PermissionRead,
		PermissionWrite,
	},
	RoleUser: {
		PermissionRead,
		PermissionWrite,
	},
	RoleGuest: {
		PermissionRead,
	},
}

// RequirePermission 需要特定权限的中间件
func RequirePermission(permission Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户信息
		userID, _, _, _, exists := GetUserFromContext(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "用户未认证",
			})
			c.Abort()
			return
		}

		// 获取用户角色（这里应该从数据库查询）
		userRole := getUserRole(userID)

		// 检查权限
		if !hasPermission(userRole, permission) {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "权限不足",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireRole 需要特定角色的中间件
func RequireRole(role UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户信息
		userID, _, _, _, exists := GetUserFromContext(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "用户未认证",
			})
			c.Abort()
			return
		}

		// 获取用户角色
		userRole := getUserRole(userID)

		// 检查角色
		if userRole != role && userRole != RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "角色权限不足",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// hasPermission 检查角色是否有特定权限
func hasPermission(role UserRole, permission Permission) bool {
	permissions, exists := RolePermissions[role]
	if !exists {
		return false
	}

	for _, p := range permissions {
		if p == permission {
			return true
		}
	}

	return false
}

// getUserRole 获取用户角色（示例实现，实际应该从数据库查询）
func getUserRole(userID string) UserRole {
	// TODO: 从数据库查询用户角色
	// 这里返回默认角色作为示例

	// 示例逻辑：管理员用户 ID 列表
	adminUsers := []string{"admin_user_id", "github_admin_123"}
	for _, adminID := range adminUsers {
		if userID == adminID {
			return RoleAdmin
		}
	}

	// 默认返回普通用户角色
	return RoleUser
}

// SetUserRole 设置用户角色到上下文（可选）
func SetUserRole(c *gin.Context, role UserRole) {
	c.Set("user_role", role)
}

// GetUserRole 从上下文获取用户角色
func GetUserRole(c *gin.Context) (UserRole, bool) {
	role, exists := c.Get("user_role")
	if !exists {
		return RoleGuest, false
	}
	return role.(UserRole), true
}
