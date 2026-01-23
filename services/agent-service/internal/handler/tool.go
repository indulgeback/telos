// Package handler 提供工具插件系统的 HTTP 处理器
package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/repository"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
)

// ToolHandler 工具 HTTP 处理器
type ToolHandler struct {
	toolService service.ToolService
}

// NewToolHandler 创建工具处理器实例
func NewToolHandler(toolService service.ToolService) *ToolHandler {
	return &ToolHandler{
		toolService: toolService,
	}
}

// ListTools 列出所有工具
//
// GET /api/tools
// 查询参数：
//   - category: 工具分类（可选）
//   - enabled: 是否只返回启用的工具（可选）
//   - search: 搜索关键词（可选）
//   - page: 页码（可选，默认 1）
//   - page_size: 每页数量（可选，默认 20）
func (h *ToolHandler) ListTools(c *gin.Context) {
	category := c.Query("category")
	enabled := c.Query("enabled")
	search := c.Query("search")
	page := 1
	pageSize := 20

	// 解析分页参数
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil {
			page = p
		}
	}
	if pageSizeStr := c.Query("page_size"); pageSizeStr != "" {
		if ps, err := strconv.Atoi(pageSizeStr); err == nil {
			pageSize = ps
		}
	}

	opts := &repository.ListOptions{
		Category: category,
		Page:     page,
		PageSize: pageSize,
		Search:   search,
	}

	if enabled != "" {
		e := enabled == "true"
		opts.Enabled = &e
	}

	tools, total, err := h.toolService.ListTools(c.Request.Context(), opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tools": tools,
		"total": total,
		"page":  page,
		"page_size": pageSize,
	})
}

// GetTool 获取工具详情
//
// GET /api/tools/:id
func (h *ToolHandler) GetTool(c *gin.Context) {
	id := c.Param("id")

	tool, err := h.toolService.GetTool(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tool not found"})
		return
	}

	c.JSON(http.StatusOK, tool)
}

// CreateTool 创建新工具（管理员）
//
// POST /api/tools
func (h *ToolHandler) CreateTool(c *gin.Context) {
	var tool model.Tool
	if err := c.ShouldBindJSON(&tool); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.toolService.CreateTool(c.Request.Context(), &tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tool)
}

// UpdateTool 更新工具（管理员）
//
// PUT /api/tools/:id
func (h *ToolHandler) UpdateTool(c *gin.Context) {
	id := c.Param("id")

	var tool model.Tool
	if err := c.ShouldBindJSON(&tool); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tool.ID = id
	if err := h.toolService.UpdateTool(c.Request.Context(), &tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tool)
}

// DeleteTool 删除工具（管理员）
//
// DELETE /api/tools/:id
func (h *ToolHandler) DeleteTool(c *gin.Context) {
	id := c.Param("id")

	if err := h.toolService.DeleteTool(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetAgentTools 获取 Agent 的工具
//
// GET /api/agents/:id/tools
func (h *ToolHandler) GetAgentTools(c *gin.Context) {
	agentID := c.Param("id")

	tools, err := h.toolService.GetAgentTools(c.Request.Context(), agentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tools": tools})
}

// SetAgentTools 设置 Agent 的工具
//
// PUT /api/agents/:id/tools
// 请求体示例：
// {
//   "tool_ids": ["jina-reader", "jina-search"]
// }
func (h *ToolHandler) SetAgentTools(c *gin.Context) {
	agentID := c.Param("id")

	var req struct {
		ToolIDs []string `json:"tool_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.toolService.SetAgentTools(c.Request.Context(), agentID, req.ToolIDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tools updated successfully"})
}

// ToggleAgentTool 切换 Agent 工具的启用状态
//
// PATCH /api/agents/:id/tools/:tool_id/toggle
// 请求体示例：
// {
//   "enabled": true
// }
func (h *ToolHandler) ToggleAgentTool(c *gin.Context) {
	agentID := c.Param("id")
	toolID := c.Param("tool_id")

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.toolService.ToggleAgentTool(c.Request.Context(), agentID, toolID, req.Enabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Tool toggled successfully"})
}
