package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
)

type AgentRepository interface {
	Create(ctx context.Context, agent *model.AgentConfig) error
	GetByID(ctx context.Context, id string) (*model.AgentConfig, error)
	List(ctx context.Context, enabledOnly bool) ([]model.AgentConfig, error)
	Update(ctx context.Context, agent *model.AgentConfig) error
	Delete(ctx context.Context, id string) error
}

type agentRepository struct {
	db *gorm.DB
}

func NewAgentRepository(db *gorm.DB) AgentRepository {
	return &agentRepository{db: db}
}

func (r *agentRepository) Create(ctx context.Context, agent *model.AgentConfig) error {
	if agent.ID == "" {
		agent.ID = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(agent).Error
}

func (r *agentRepository) GetByID(ctx context.Context, id string) (*model.AgentConfig, error) {
	var agent model.AgentConfig
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&agent).Error
	if err != nil {
		return nil, err
	}
	return &agent, nil
}

func (r *agentRepository) List(ctx context.Context, enabledOnly bool) ([]model.AgentConfig, error) {
	var agents []model.AgentConfig
	query := r.db.WithContext(ctx)
	if enabledOnly {
		query = query.Where("enabled = ?", true)
	}
	err := query.Order("created_at DESC").Find(&agents).Error
	return agents, err
}

func (r *agentRepository) Update(ctx context.Context, agent *model.AgentConfig) error {
	return r.db.WithContext(ctx).Save(agent).Error
}

func (r *agentRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.AgentConfig{}, "id = ?", id).Error
}
