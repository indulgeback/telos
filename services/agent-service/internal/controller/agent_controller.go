package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
)

type AgentController struct {
	agentService service.AgentService
}

func NewAgentController(agentService service.AgentService) *AgentController {
	return &AgentController{
		agentService: agentService,
	}
}

// CreateAgentRequest 创建 Agent 请求
type CreateAgentRequest struct {
	Name        string                `json:"name" binding:"required"`
	Description string                `json:"description"`
	Type        model.AgentType       `json:"type" binding:"required"`
	Config      map[string]interface{} `json:"config"`
}

// UpdateAgentRequest 更新 Agent 请求
type UpdateAgentRequest struct {
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Type        model.AgentType       `json:"type"`
	Config      map[string]interface{} `json:"config"`
	Enabled     *bool                 `json:"enabled"`
}

// ChatRequest 对话请求
type ChatRequest struct {
	AgentID        string `json:"agent_id" binding:"required"`
	ConversationID string `json:"conversation_id"`
	Message        string `json:"message" binding:"required"`
}

// CreateConversationRequest 创建对话请求
type CreateConversationRequest struct {
	AgentID string `json:"agent_id" binding:"required"`
	UserID  string `json:"user_id"`
}

// CreateAgent 创建 Agent
func (c *AgentController) CreateAgent(ctx *gin.Context) {
	var req CreateAgentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		tlog.Error("Invalid request", "error", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	agent := &model.AgentConfig{
		Name:        req.Name,
		Description: req.Description,
		Type:        req.Type,
		Config:      req.Config,
		Enabled:     true,
	}

	if err := c.agentService.CreateAgent(ctx, agent); err != nil {
		tlog.Error("Failed to create agent", "error", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, agent)
}

// GetAgent 获取 Agent 详情
func (c *AgentController) GetAgent(ctx *gin.Context) {
	id := ctx.Param("id")
	agent, err := c.agentService.GetAgent(ctx, id)
	if err != nil {
		tlog.Error("Failed to get agent", "error", err)
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		return
	}

	ctx.JSON(http.StatusOK, agent)
}

// ListAgents 获取 Agent 列表
func (c *AgentController) ListAgents(ctx *gin.Context) {
	agents, err := c.agentService.ListAgents(ctx)
	if err != nil {
		tlog.Error("Failed to list agents", "error", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"agents": agents,
		"total":  len(agents),
	})
}

// UpdateAgent 更新 Agent
func (c *AgentController) UpdateAgent(ctx *gin.Context) {
	id := ctx.Param("id")
	var req UpdateAgentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	agent, err := c.agentService.GetAgent(ctx, id)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Agent not found"})
		return
	}

	if req.Name != "" {
		agent.Name = req.Name
	}
	if req.Description != "" {
		agent.Description = req.Description
	}
	if req.Type != "" {
		agent.Type = req.Type
	}
	if req.Config != nil {
		agent.Config = req.Config
	}
	if req.Enabled != nil {
		agent.Enabled = *req.Enabled
	}

	if err := c.agentService.UpdateAgent(ctx, agent); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, agent)
}

// DeleteAgent 删除 Agent
func (c *AgentController) DeleteAgent(ctx *gin.Context) {
	id := ctx.Param("id")
	if err := c.agentService.DeleteAgent(ctx, id); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Agent deleted successfully"})
}

// CreateConversation 创建对话
func (c *AgentController) CreateConversation(ctx *gin.Context) {
	var req CreateConversationRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	conv, err := c.agentService.CreateConversation(ctx, req.AgentID, req.UserID)
	if err != nil {
		tlog.Error("Failed to create conversation", "error", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusCreated, conv)
}

// Chat 对话
func (c *AgentController) Chat(ctx *gin.Context) {
	var req ChatRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := c.agentService.Chat(ctx, req.AgentID, req.ConversationID, req.Message)
	if err != nil {
		tlog.Error("Failed to chat", "error", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"response": response,
	})
}

// GetConversationHistory 获取对话历史
func (c *AgentController) GetConversationHistory(ctx *gin.Context) {
	conversationID := ctx.Param("id")
	messages, err := c.agentService.GetConversationHistory(ctx, conversationID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"messages": messages,
		"total":    len(messages),
	})
}

// GetAvailableTools 获取可用工具列表
func (c *AgentController) GetAvailableTools(ctx *gin.Context) {
	tools, err := c.agentService.GetAvailableTools(ctx)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"tools": tools,
		"total": len(tools),
	})
}

// ExecuteToolRequest 工具执行请求
type ExecuteToolRequest struct {
	Arguments string `json:"arguments"`
}

// ExecuteTool 直接执行工具
func (c *AgentController) ExecuteTool(ctx *gin.Context) {
	toolName := ctx.Param("tool_name")

	var req ExecuteToolRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := c.agentService.ExecuteTool(ctx, toolName, req.Arguments)
	if err != nil {
		tlog.Error("Failed to execute tool", "error", err, "tool", toolName)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"tool":   toolName,
		"result": result,
	})
}

// HealthCheck 健康检查
func HealthCheck(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "agent-service",
		"version": "1.0.0",
	})
}
