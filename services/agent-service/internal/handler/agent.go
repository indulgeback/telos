// Package handler 提供 Agent Service 的 HTTP 处理器层实现
//
// 该层负责：
//   - 解析和验证 HTTP 请求
//   - 调用 Service 层处理业务逻辑
//   - 格式化并返回 HTTP 响应
//   - 用户身份识别（通过请求头）
//
// 使用 Gin 框架实现 RESTful API。
package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
)

// ========== 类型定义 ==========

// AgentHandler Agent 处理器
//
// 处理所有与 Agent 管理相关的 HTTP 请求。
type AgentHandler struct {
	agentService service.AgentService
}

// ========== 构造函数 ==========

// NewAgentHandler 创建 Agent 处理器实例
//
// 参数：
//   - agentService: Agent 服务实例
//
// 返回：
//   - *AgentHandler: 处理器实例
func NewAgentHandler(agentService service.AgentService) *AgentHandler {
	return &AgentHandler{
		agentService: agentService,
	}
}

// ========== 响应类型 ==========

// Response 统一响应格式
//
// 所有 API 响应都使用此格式，确保前端可以统一解析。
type Response struct {
	Code    int    `json:"code"`           // 业务状态码（0 表示成功）
	Message string `json:"message"`        // 响应消息
	Data    any    `json:"data,omitempty"` // 响应数据（可选）
}

// successResponse 创建成功响应
func successResponse(data any) Response {
	return Response{
		Code:    0,
		Message: "success",
		Data:    data,
	}
}

// errorResponse 创建错误响应
func errorResponse(code int, message string) Response {
	return Response{
		Code:    code,
		Message: message,
	}
}

// ========== 请求类型 ==========

// CreateAgentRequest 创建 Agent 请求
type CreateAgentRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`         // Agent 名称
	Description string `json:"description" binding:"required,min=1,max=500"` // Agent 描述
	Type        string `json:"type" binding:"required,oneof=public private"` // Agent 类型
}

// UpdateAgentRequest 更新 Agent 请求
type UpdateAgentRequest struct {
	Name        string `json:"name" binding:"required,min=1,max=100"`         // 新名称
	Description string `json:"description" binding:"required,min=1,max=500"` // 新描述
}

// ========== 辅助函数 ==========

// getUserID 从上下文获取用户 ID
//
// 当前实现：从 X-User-ID 请求头获取（由 API Gateway 转发时设置）
// 如果未设置，返回默认用户 ID（开发环境使用）
//
// 注意：生产环境应使用 JWT 验证用户身份
func getUserID(c *gin.Context) string {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		// 临时使用默认用户 ID（开发环境）
		return "default_user"
	}
	return userID
}

// getUserName 从上下文获取用户名
//
// 当前实现：从 X-User-Name 请求头获取
// 如果未设置，返回默认用户名
func getUserName(c *gin.Context) string {
	userName := c.GetHeader("X-User-Name")
	if userName == "" {
		return "Default User"
	}
	return userName
}

// ========== 路由注册 ==========

// RegisterRoutes 注册 Agent 相关路由
//
// 路由列表：
//   - GET    /api/agents        获取 Agent 列表
//   - POST   /api/agents        创建新 Agent
//   - GET    /api/agents/:id    获取单个 Agent
//   - PUT    /api/agents/:id    更新 Agent
//   - DELETE /api/agents/:id    删除 Agent
//   - GET    /api/agents/default 获取默认 Agent
func (h *AgentHandler) RegisterRoutes(r *gin.Engine) {
	g := r.Group("/api/agents")
	{
		g.GET("", h.ListAgents)
		g.POST("", h.CreateAgent)
		g.GET("/:id", h.GetAgent)
		g.PUT("/:id", h.UpdateAgent)
		g.DELETE("/:id", h.DeleteAgent)
		g.GET("/default", h.GetDefaultAgent)
	}
}

// ========== 处理器函数 ==========

// ListAgents 获取 Agent 列表
//
// 返回用户可见的所有 Agent，包括：
//   - 公开 Agent
//   - 系统 Agent
//   - 当前用户创建的私有 Agent
//
// Route: GET /api/agents
func (h *AgentHandler) ListAgents(c *gin.Context) {
	userID := getUserID(c)
	agents, err := h.agentService.ListAgents(c.Request.Context(), userID)
	if err != nil {
		tlog.Warn("获取 Agent 列表失败", "error", err.Error(), "user_id", userID)
		c.JSON(http.StatusInternalServerError, errorResponse(500, "获取 Agent 列表失败"))
		return
	}
	c.JSON(http.StatusOK, successResponse(agents))
}

// CreateAgent 创建新 Agent
//
// 请求体：
//   {
//     "name": "Agent 名称",
//     "description": "Agent 描述",
//     "type": "public" 或 "private"
//   }
//
// Route: POST /api/agents
func (h *AgentHandler) CreateAgent(c *gin.Context) {
	userID := getUserID(c)
	userName := getUserName(c)

	// 解析请求
	var req CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse(400, "无效的请求格式"))
		return
	}

	// 验证 Agent 类型
	agentType := model.AgentType(req.Type)
	if agentType != model.AgentTypePublic && agentType != model.AgentTypePrivate {
		c.JSON(http.StatusBadRequest, errorResponse(400, "无效的 Agent 类型"))
		return
	}

	// 调用服务层创建 Agent
	agent, err := h.agentService.CreateAgent(
		c.Request.Context(),
		userID,
		userName,
		req.Name,
		req.Description,
		agentType,
	)
	if err != nil {
		tlog.Warn("创建 Agent 失败", "error", err.Error(), "user_id", userID)
		c.JSON(http.StatusInternalServerError, errorResponse(500, "创建 Agent 失败: "+err.Error()))
		return
	}

	tlog.Info("创建 Agent 成功", "agent_id", agent.ID, "agent_name", agent.Name, "user_id", userID)
	c.JSON(http.StatusCreated, successResponse(agent))
}

// GetAgent 获取单个 Agent
//
// 路径参数：
//   - id: Agent ID
//
// Route: GET /api/agents/:id
func (h *AgentHandler) GetAgent(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, errorResponse(400, "Agent ID 不能为空"))
		return
	}

	agent, err := h.agentService.GetAgent(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, errorResponse(404, "Agent 不存在"))
		return
	}

	c.JSON(http.StatusOK, successResponse(agent))
}

// UpdateAgent 更新 Agent
//
// 只有 Agent 的创建者可以更新。系统 Agent 不能更新。
//
// 请求体：
//   {
//     "name": "新名称",
//     "description": "新描述"
//   }
//
// Route: PUT /api/agents/:id
func (h *AgentHandler) UpdateAgent(c *gin.Context) {
	id := c.Param("id")
	userID := getUserID(c)

	if id == "" {
		c.JSON(http.StatusBadRequest, errorResponse(400, "Agent ID 不能为空"))
		return
	}

	// 解析请求
	var req UpdateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse(400, "无效的请求格式"))
		return
	}

	// 调用服务层更新 Agent（包含权限检查）
	agent, err := h.agentService.UpdateAgent(
		c.Request.Context(),
		id,
		userID,
		req.Name,
		req.Description,
	)
	if err != nil {
		tlog.Warn("更新 Agent 失败", "error", err.Error(), "agent_id", id, "user_id", userID)
		c.JSON(http.StatusBadRequest, errorResponse(400, err.Error()))
		return
	}

	tlog.Info("更新 Agent 成功", "agent_id", id, "user_id", userID)
	c.JSON(http.StatusOK, successResponse(agent))
}

// DeleteAgent 删除 Agent
//
// 只有 Agent 的创建者可以删除。系统 Agent 不能删除。
// 执行软删除，数据仍保留在数据库中。
//
// Route: DELETE /api/agents/:id
func (h *AgentHandler) DeleteAgent(c *gin.Context) {
	id := c.Param("id")
	userID := getUserID(c)

	if id == "" {
		c.JSON(http.StatusBadRequest, errorResponse(400, "Agent ID 不能为空"))
		return
	}

	// 调用服务层删除 Agent（包含权限检查）
	err := h.agentService.DeleteAgent(c.Request.Context(), id, userID)
	if err != nil {
		tlog.Warn("删除 Agent 失败", "error", err.Error(), "agent_id", id, "user_id", userID)
		c.JSON(http.StatusBadRequest, errorResponse(400, err.Error()))
		return
	}

	tlog.Info("删除 Agent 成功", "agent_id", id, "user_id", userID)
	c.JSON(http.StatusOK, successResponse(nil))
}

// GetDefaultAgent 获取默认 Agent
//
// 返回系统内置的默认 Agent，用于用户未指定 Agent 时的回退。
//
// Route: GET /api/agents/default
func (h *AgentHandler) GetDefaultAgent(c *gin.Context) {
	agent, err := h.agentService.GetDefaultAgent(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, errorResponse(404, "默认 Agent 不存在"))
		return
	}
	c.JSON(http.StatusOK, successResponse(agent))
}
