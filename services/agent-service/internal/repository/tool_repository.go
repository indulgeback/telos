package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
)

type ToolRepository interface {
	Create(ctx context.Context, tool *model.ToolDefinition) error
	GetByID(ctx context.Context, id string) (*model.ToolDefinition, error)
	GetByName(ctx context.Context, name string) (*model.ToolDefinition, error)
	List(ctx context.Context, enabledOnly bool) ([]model.ToolDefinition, error)
	Update(ctx context.Context, tool *model.ToolDefinition) error
	Delete(ctx context.Context, id string) error

	// 工具执行记录
	LogExecution(ctx context.Context, exec *model.ToolExecution) error
	GetExecutions(ctx context.Context, conversationID string, limit int) ([]model.ToolExecution, error)
}

type toolRepository struct {
	db *gorm.DB
}

func NewToolRepository(db *gorm.DB) ToolRepository {
	return &toolRepository{db: db}
}

func (r *toolRepository) Create(ctx context.Context, tool *model.ToolDefinition) error {
	if tool.ID == "" {
		tool.ID = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(tool).Error
}

func (r *toolRepository) GetByID(ctx context.Context, id string) (*model.ToolDefinition, error) {
	var tool model.ToolDefinition
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&tool).Error
	if err != nil {
		return nil, err
	}
	return &tool, nil
}

func (r *toolRepository) GetByName(ctx context.Context, name string) (*model.ToolDefinition, error) {
	var tool model.ToolDefinition
	err := r.db.WithContext(ctx).Where("name = ?", name).First(&tool).Error
	if err != nil {
		return nil, err
	}
	return &tool, nil
}

func (r *toolRepository) List(ctx context.Context, enabledOnly bool) ([]model.ToolDefinition, error) {
	var tools []model.ToolDefinition
	query := r.db.WithContext(ctx)
	if enabledOnly {
		query = query.Where("enabled = ?", true)
	}
	err := query.Order("created_at DESC").Find(&tools).Error
	return tools, err
}

func (r *toolRepository) Update(ctx context.Context, tool *model.ToolDefinition) error {
	return r.db.WithContext(ctx).Save(tool).Error
}

func (r *toolRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.ToolDefinition{}, "id = ?", id).Error
}

func (r *toolRepository) LogExecution(ctx context.Context, exec *model.ToolExecution) error {
	if exec.ID == "" {
		exec.ID = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(exec).Error
}

func (r *toolRepository) GetExecutions(ctx context.Context, conversationID string, limit int) ([]model.ToolExecution, error) {
	var execs []model.ToolExecution
	query := r.db.WithContext(ctx).Where("conversation_id = ?", conversationID)
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Order("created_at DESC").Find(&execs).Error
	return execs, err
}
