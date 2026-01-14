package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
)

var (
	ErrAgentNotFound      = errors.New("agent not found")
	ErrAgentAlreadyExists = errors.New("agent already exists")
)

// AgentRepository 定义 Agent 数据访问接口
type AgentRepository interface {
	Create(ctx context.Context, agent *model.Agent) error
	GetByID(ctx context.Context, id string) (*model.Agent, error)
	List(ctx context.Context, userID string) ([]*model.Agent, error)
	Update(ctx context.Context, agent *model.Agent) error
	Delete(ctx context.Context, id string) error
	GetDefault(ctx context.Context) (*model.Agent, error)
	GetByOwnerID(ctx context.Context, ownerID string) ([]*model.Agent, error)
}

type agentRepository struct {
	db *gorm.DB
}

// NewAgentRepository 创建 AgentRepository 实例
func NewAgentRepository(db *gorm.DB) AgentRepository {
	return &agentRepository{db: db}
}

func (r *agentRepository) Create(ctx context.Context, agent *model.Agent) error {
	return r.db.WithContext(ctx).Create(agent).Error
}

func (r *agentRepository) GetByID(ctx context.Context, id string) (*model.Agent, error) {
	var agent model.Agent
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&agent).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAgentNotFound
		}
		return nil, err
	}
	return &agent, nil
}

func (r *agentRepository) List(ctx context.Context, userID string) ([]*model.Agent, error) {
	var agents []*model.Agent
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Where("(type = ? OR type = ? OR owner_id = ?)",
			model.AgentTypePublic, model.AgentTypeSystem, userID).
		Order("is_default DESC, created_at DESC").
		Find(&agents).Error
	if err != nil {
		return nil, err
	}
	return agents, nil
}

func (r *agentRepository) Update(ctx context.Context, agent *model.Agent) error {
	return r.db.WithContext(ctx).Save(agent).Error
}

func (r *agentRepository) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).
		Model(&model.Agent{}).
		Where("id = ?", id).
		Update("deleted_at", time.Now())
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAgentNotFound
	}
	return nil
}

func (r *agentRepository) GetDefault(ctx context.Context) (*model.Agent, error) {
	var agent model.Agent
	err := r.db.WithContext(ctx).
		Where("is_default = ? AND deleted_at IS NULL", true).
		First(&agent).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAgentNotFound
		}
		return nil, err
	}
	return &agent, nil
}

func (r *agentRepository) GetByOwnerID(ctx context.Context, ownerID string) ([]*model.Agent, error) {
	var agents []*model.Agent
	err := r.db.WithContext(ctx).
		Where("owner_id = ? AND deleted_at IS NULL", ownerID).
		Order("created_at DESC").
		Find(&agents).Error
	if err != nil {
		return nil, err
	}
	return agents, nil
}
