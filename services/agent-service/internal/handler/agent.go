package handler

import (
	"net/http"

	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
	"github.com/labstack/echo/v4"
)

// AgentHandler Agent 处理器
type AgentHandler struct {
	agentService service.AgentService
}

// NewAgentHandler 创建 Agent 处理器
func NewAgentHandler(agentService service.AgentService) *AgentHandler {
	return &AgentHandler{
		agentService: agentService,
	}
}

// Response 统一响应格式
type Response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

// successResponse 成功响应
func successResponse(data any) Response {
	return Response{
		Code:    0,
		Message: "success",
		Data:    data,
	}
}

// errorResponse 错误响应
func errorResponse(code int, message string) Response {
	return Response{
		Code:    code,
		Message: message,
	}
}

// getUserID 从上下文获取用户ID（简化版，后续从 JWT 中获取）
func getUserID(c echo.Context) string {
	// 从请求头获取用户ID（由 API Gateway 转发时设置）
	userID := c.Request().Header.Get("X-User-ID")
	if userID == "" {
		// 临时使用默认用户ID（开发环境）
		return "default_user"
	}
	return userID
}

// getUserName 从上下文获取用户名
func getUserName(c echo.Context) string {
	userName := c.Request().Header.Get("X-User-Name")
	if userName == "" {
		return "Default User"
	}
	return userName
}

// RegisterRoutes 注册 Agent 路由
func (h *AgentHandler) RegisterRoutes(e *echo.Echo) {
	g := e.Group("/api/agents")
	g.GET("", h.ListAgents)
	g.POST("", h.CreateAgent)
	g.GET("/:id", h.GetAgent)
	g.PUT("/:id", h.UpdateAgent)
	g.DELETE("/:id", h.DeleteAgent)
	g.GET("/default", h.GetDefaultAgent)
}

// CreateAgentRequest 创建 Agent 请求
type CreateAgentRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"required,min=1,max=500"`
	Type        string `json:"type" validate:"required,oneof=public private"`
}

// UpdateAgentRequest 更新 Agent 请求
type UpdateAgentRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"required,min=1,max=500"`
}

// ListAgents 获取 Agent 列表
func (h *AgentHandler) ListAgents(c echo.Context) error {
	userID := getUserID(c)
	agents, err := h.agentService.ListAgents(c.Request().Context(), userID)
	if err != nil {
		tlog.Warn("获取 Agent 列表失败", "error", err.Error(), "user_id", userID)
		return c.JSON(http.StatusInternalServerError, errorResponse(500, "获取 Agent 列表失败"))
	}
	return c.JSON(http.StatusOK, successResponse(agents))
}

// CreateAgent 创建新 Agent
func (h *AgentHandler) CreateAgent(c echo.Context) error {
	userID := getUserID(c)
	userName := getUserName(c)

	var req CreateAgentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "无效的请求格式"))
	}

	if req.Name == "" || req.Description == "" || req.Type == "" {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "名称、描述和类型不能为空"))
	}

	agentType := model.AgentType(req.Type)
	if agentType != model.AgentTypePublic && agentType != model.AgentTypePrivate {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "无效的 Agent 类型"))
	}

	agent, err := h.agentService.CreateAgent(
		c.Request().Context(),
		userID,
		userName,
		req.Name,
		req.Description,
		agentType,
	)
	if err != nil {
		tlog.Warn("创建 Agent 失败", "error", err.Error(), "user_id", userID)
		return c.JSON(http.StatusInternalServerError, errorResponse(500, "创建 Agent 失败: "+err.Error()))
	}

	tlog.Info("创建 Agent 成功", "agent_id", agent.ID, "agent_name", agent.Name, "user_id", userID)
	return c.JSON(http.StatusCreated, successResponse(agent))
}

// GetAgent 获取单个 Agent
func (h *AgentHandler) GetAgent(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "Agent ID 不能为空"))
	}

	agent, err := h.agentService.GetAgent(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, errorResponse(404, "Agent 不存在"))
	}

	return c.JSON(http.StatusOK, successResponse(agent))
}

// UpdateAgent 更新 Agent
func (h *AgentHandler) UpdateAgent(c echo.Context) error {
	id := c.Param("id")
	userID := getUserID(c)

	if id == "" {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "Agent ID 不能为空"))
	}

	var req UpdateAgentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "无效的请求格式"))
	}

	if req.Name == "" || req.Description == "" {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "名称和描述不能为空"))
	}

	agent, err := h.agentService.UpdateAgent(
		c.Request().Context(),
		id,
		userID,
		req.Name,
		req.Description,
	)
	if err != nil {
		tlog.Warn("更新 Agent 失败", "error", err.Error(), "agent_id", id, "user_id", userID)
		return c.JSON(http.StatusBadRequest, errorResponse(400, err.Error()))
	}

	tlog.Info("更新 Agent 成功", "agent_id", id, "user_id", userID)
	return c.JSON(http.StatusOK, successResponse(agent))
}

// DeleteAgent 删除 Agent
func (h *AgentHandler) DeleteAgent(c echo.Context) error {
	id := c.Param("id")
	userID := getUserID(c)

	if id == "" {
		return c.JSON(http.StatusBadRequest, errorResponse(400, "Agent ID 不能为空"))
	}

	err := h.agentService.DeleteAgent(c.Request().Context(), id, userID)
	if err != nil {
		tlog.Warn("删除 Agent 失败", "error", err.Error(), "agent_id", id, "user_id", userID)
		return c.JSON(http.StatusBadRequest, errorResponse(400, err.Error()))
	}

	tlog.Info("删除 Agent 成功", "agent_id", id, "user_id", userID)
	return c.JSON(http.StatusOK, successResponse(nil))
}

// GetDefaultAgent 获取默认 Agent
func (h *AgentHandler) GetDefaultAgent(c echo.Context) error {
	agent, err := h.agentService.GetDefaultAgent(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusNotFound, errorResponse(404, "默认 Agent 不存在"))
	}
	return c.JSON(http.StatusOK, successResponse(agent))
}
