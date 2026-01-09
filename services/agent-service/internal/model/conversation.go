package model

import (
	"time"
)

// Conversation 对话
type Conversation struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	AgentID     string    `json:"agent_id" gorm:"not null;index"`
	UserID      string    `json:"user_id" gorm:"index"`
	Title       string    `json:"title" gorm:""`
	Metadata    JSONMap   `json:"metadata" gorm:"type:jsonb"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// Message 消息
type Message struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	ConversationID string    `json:"conversation_id" gorm:"not null;index"`
	Role           string    `json:"role" gorm:"not null"` // user, assistant, system, tool
	Content        string    `json:"content" gorm:"type:text"`
	ToolCalls      JSONMap   `json:"tool_calls,omitempty" gorm:"type:jsonb"`
	ToolCallID     string    `json:"tool_call_id,omitempty" gorm:""`
	CreatedAt      time.Time `json:"created_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// TableName 指定表名
func (Conversation) TableName() string {
	return "conversations"
}

func (Message) TableName() string {
	return "messages"
}
