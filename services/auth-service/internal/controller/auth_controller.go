package controller

import (
	"net/http"
	"time"

	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/auth-service/internal/service"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	authService service.AuthService
}

func NewAuthController(authService service.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

func (c *AuthController) Register(ctx *gin.Context) {
	var request struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		tlog.Warn("用户注册请求参数错误", "error", err.Error(), "client_ip", ctx.ClientIP())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tlog.Info("用户注册请求", "username", request.Username, "email", request.Email, "client_ip", ctx.ClientIP())

	user, err := c.authService.RegisterUser(ctx, request.Username, request.Email, request.Password)
	if err != nil {
		tlog.Error("用户注册失败", "error", err.Error(), "username", request.Username, "email", request.Email)
		ctx.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	tlog.Info("用户注册成功", "user_id", user.ID, "username", user.Username, "email", user.Email)

	ctx.JSON(http.StatusCreated, gin.H{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"createdAt": user.CreatedAt,
	})
}

func (c *AuthController) Login(ctx *gin.Context) {
	var request struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := ctx.ShouldBindJSON(&request); err != nil {
		tlog.Warn("用户登录请求参数错误", "error", err.Error(), "client_ip", ctx.ClientIP())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tlog.Info("用户登录请求", "email", request.Email, "client_ip", ctx.ClientIP())

	token, err := c.authService.LoginUser(ctx, request.Email, request.Password)
	if err != nil {
		tlog.Warn("用户登录失败", "error", err.Error(), "email", request.Email, "client_ip", ctx.ClientIP())
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	tlog.Info("用户登录成功", "email", request.Email, "client_ip", ctx.ClientIP())

	ctx.JSON(http.StatusOK, gin.H{
		"token":   token,
		"expires": time.Now().Add(24 * time.Hour).Unix(),
	})
}

// HealthCheck 健康检查接口
func HealthCheck(c *gin.Context) {
	tlog.Debug("健康检查请求", "client_ip", c.ClientIP())
	c.JSON(200, gin.H{"status": "ok", "service": "认证服务"})
}
