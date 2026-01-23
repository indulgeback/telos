// Package repository 提供 Tool 数据访问层的实现
package repository

import (
	"context"

	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"gorm.io/gorm"
)

// ToolRepository 定义 Tool 数据访问接口
type ToolRepository interface {
	// Create 创建新工具
	Create(ctx context.Context, tool *model.Tool) error

	// GetByID 根据 ID 获取工具
	GetByID(ctx context.Context, id string) (*model.Tool, error)

	// GetByName 根据名称获取工具
	GetByName(ctx context.Context, name string) (*model.Tool, error)

	// List 获取工具列表
	List(ctx context.Context, opts *ListOptions) ([]*model.Tool, int64, error)

	// GetForAgent 获取 Agent 配置的工具列表
	GetForAgent(ctx context.Context, agentID string) ([]*model.Tool, error)

	// Update 更新工具
	Update(ctx context.Context, tool *model.Tool) error

	// Delete 删除工具
	Delete(ctx context.Context, id string) error
}

// ListOptions 工具列表查询选项
type ListOptions struct {
	Category string
	Enabled  *bool
	Search   string
	Page     int
	PageSize int
}

// toolRepository 是 ToolRepository 接口的具体实现
type toolRepository struct {
	db *gorm.DB
}

// NewToolRepository 创建 ToolRepository 实例
func NewToolRepository(db *gorm.DB) ToolRepository {
	return &toolRepository{db: db}
}

// Create 创建新工具
func (r *toolRepository) Create(ctx context.Context, tool *model.Tool) error {
	return r.db.WithContext(ctx).Create(tool).Error
}

// GetByID 根据 ID 获取工具
func (r *toolRepository) GetByID(ctx context.Context, id string) (*model.Tool, error) {
	var tool model.Tool
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&tool).Error
	if err != nil {
		return nil, err
	}
	return &tool, nil
}

// GetByName 根据名称获取工具
func (r *toolRepository) GetByName(ctx context.Context, name string) (*model.Tool, error) {
	var tool model.Tool
	err := r.db.WithContext(ctx).
		Where("name = ?", name).
		First(&tool).Error
	if err != nil {
		return nil, err
	}
	return &tool, nil
}

// List 获取工具列表
func (r *toolRepository) List(ctx context.Context, opts *ListOptions) ([]*model.Tool, int64, error) {
	var tools []*model.Tool
	var total int64

	query := r.db.WithContext(ctx).Model(&model.Tool{})

	if opts != nil {
		if opts.Category != "" {
			query = query.Where("category = ?", opts.Category)
		}
		if opts.Enabled != nil {
			query = query.Where("enabled = ?", *opts.Enabled)
		}
		if opts.Search != "" {
			query = query.Where("name ILIKE ? OR display_name ILIKE ? OR description ILIKE ?",
				"%"+opts.Search+"%", "%"+opts.Search+"%", "%"+opts.Search+"%")
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if opts != nil && opts.PageSize > 0 {
		offset := (opts.Page - 1) * opts.PageSize
		query = query.Offset(offset).Limit(opts.PageSize)
	}

	err := query.Find(&tools).Error
	return tools, total, err
}

// GetForAgent 获取 Agent 配置的工具列表
func (r *toolRepository) GetForAgent(ctx context.Context, agentID string) ([]*model.Tool, error) {
	var tools []*model.Tool
	err := r.db.WithContext(ctx).
		Joins("JOIN agent_tools ON agent_tools.tool_id = tools.id").
		Where("agent_tools.agent_id = ? AND agent_tools.enabled = ? AND tools.enabled = ?",
			agentID, true, true).
		Find(&tools).Error
	return tools, err
}

// Update 更新工具
func (r *toolRepository) Update(ctx context.Context, tool *model.Tool) error {
	return r.db.WithContext(ctx).Save(tool).Error
}

// Delete 删除工具
func (r *toolRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.Tool{}, "id = ?", id).Error
}
