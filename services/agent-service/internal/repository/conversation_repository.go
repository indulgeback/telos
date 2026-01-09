package repository

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
)

type ConversationRepository interface {
	Create(ctx context.Context, conv *model.Conversation) error
	GetByID(ctx context.Context, id string) (*model.Conversation, error)
	GetByAgentAndUser(ctx context.Context, agentID, userID string, limit int) ([]model.Conversation, error)
	Update(ctx context.Context, conv *model.Conversation) error
	Delete(ctx context.Context, id string) error

	// 消息操作
	AddMessage(ctx context.Context, msg *model.Message) error
	GetMessages(ctx context.Context, conversationID string, limit int) ([]model.Message, error)
}

type conversationRepository struct {
	db *gorm.DB
}

func NewConversationRepository(db *gorm.DB) ConversationRepository {
	return &conversationRepository{db: db}
}

func (r *conversationRepository) Create(ctx context.Context, conv *model.Conversation) error {
	if conv.ID == "" {
		conv.ID = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(conv).Error
}

func (r *conversationRepository) GetByID(ctx context.Context, id string) (*model.Conversation, error) {
	var conv model.Conversation
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&conv).Error
	if err != nil {
		return nil, err
	}
	return &conv, nil
}

func (r *conversationRepository) GetByAgentAndUser(ctx context.Context, agentID, userID string, limit int) ([]model.Conversation, error) {
	var convs []model.Conversation
	query := r.db.WithContext(ctx).Where("agent_id = ?", agentID)
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Order("updated_at DESC").Find(&convs).Error
	return convs, err
}

func (r *conversationRepository) Update(ctx context.Context, conv *model.Conversation) error {
	return r.db.WithContext(ctx).Save(conv).Error
}

func (r *conversationRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&model.Conversation{}, "id = ?", id).Error
}

func (r *conversationRepository) AddMessage(ctx context.Context, msg *model.Message) error {
	if msg.ID == "" {
		msg.ID = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(msg).Error
}

func (r *conversationRepository) GetMessages(ctx context.Context, conversationID string, limit int) ([]model.Message, error) {
	var msgs []model.Message
	query := r.db.WithContext(ctx).Where("conversation_id = ?", conversationID)
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Order("created_at ASC").Find(&msgs).Error
	return msgs, err
}
