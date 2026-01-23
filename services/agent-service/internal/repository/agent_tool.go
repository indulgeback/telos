// Package repository 提供 AgentTool 关联数据访问层的实现
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"gorm.io/gorm"
)

// AgentToolRepository 定义 Agent 工具关联数据访问接口
type AgentToolRepository interface {
	// SetAgentTools 设置 Agent 的工具列表
	SetAgentTools(ctx context.Context, agentID string, toolIDs []string) error

	// ListByAgent 获取 Agent 的工具关联列表
	ListByAgent(ctx context.Context, agentID string) ([]*model.AgentTool, error)

	// GetEnabledToolsForAgent 获取 Agent 的已启用工具列表
	GetEnabledToolsForAgent(ctx context.Context, agentID string) ([]*model.Tool, error)

	// Remove 移除 Agent 的工具关联
	Remove(ctx context.Context, agentID, toolID string) error

	// Toggle 切换工具的启用状态
	Toggle(ctx context.Context, agentID, toolID string, enabled bool) error
}

// agentToolRepository 是 AgentToolRepository 接口的具体实现
type agentToolRepository struct {
	db *gorm.DB
}

// NewAgentToolRepository 创建 AgentToolRepository 实例
func NewAgentToolRepository(db *gorm.DB) AgentToolRepository {
	return &agentToolRepository{db: db}
}

// SetAgentTools 设置 Agent 的工具列表
//
// 在事务中执行：删除现有关联，然后创建新关联。
func (r *agentToolRepository) SetAgentTools(ctx context.Context, agentID string, toolIDs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 删除现有关联
		if err := tx.Where("agent_id = ?", agentID).Delete(&model.AgentTool{}).Error; err != nil {
			return err
		}

		// 创建新关联
		for _, toolID := range toolIDs {
			agentTool := &model.AgentTool{
				ID:      uuid.New().String(),
				AgentID: agentID,
				ToolID:  toolID,
				Enabled: true,
			}
			if err := tx.Create(agentTool).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ListByAgent 获取 Agent 的工具关联列表
func (r *agentToolRepository) ListByAgent(ctx context.Context, agentID string) ([]*model.AgentTool, error) {
	var agentTools []*model.AgentTool
	err := r.db.WithContext(ctx).
		Preload("Tool").
		Where("agent_id = ?", agentID).
		Find(&agentTools).Error
	return agentTools, err
}

// GetEnabledToolsForAgent 获取 Agent 的已启用工具列表
func (r *agentToolRepository) GetEnabledToolsForAgent(ctx context.Context, agentID string) ([]*model.Tool, error) {
	var tools []*model.Tool
	err := r.db.WithContext(ctx).
		Joins("JOIN agent_tools ON agent_tools.tool_id = tools.id").
		Where("agent_tools.agent_id = ? AND agent_tools.enabled = ? AND tools.enabled = ?",
			agentID, true, true).
		Find(&tools).Error
	return tools, err
}

// Remove 移除 Agent 的工具关联
func (r *agentToolRepository) Remove(ctx context.Context, agentID, toolID string) error {
	return r.db.WithContext(ctx).
		Where("agent_id = ? AND tool_id = ?", agentID, toolID).
		Delete(&model.AgentTool{}).Error
}

// Toggle 切换工具的启用状态
func (r *agentToolRepository) Toggle(ctx context.Context, agentID, toolID string, enabled bool) error {
	return r.db.WithContext(ctx).
		Model(&model.AgentTool{}).
		Where("agent_id = ? AND tool_id = ?", agentID, toolID).
		Update("enabled", enabled).Error
}
