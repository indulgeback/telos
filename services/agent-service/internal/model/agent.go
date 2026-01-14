package model

import "time"

// AgentType 定义 Agent 类型
type AgentType string

const (
	AgentTypePublic  AgentType = "public"
	AgentTypePrivate AgentType = "private"
	AgentTypeSystem  AgentType = "system"
)

// Agent 表示一个 AI Agent
type Agent struct {
	ID            string     `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Name          string     `json:"name" gorm:"type:varchar(100);not null"`
	Description   string     `json:"description" gorm:"type:text;not null"`
	SystemPrompt  string     `json:"system_prompt" gorm:"type:text;not null"`
	Type          AgentType  `json:"type" gorm:"type:varchar(20);not null;index"`
	OwnerID       string     `json:"owner_id" gorm:"type:varchar(36);index"`
	OwnerName     string     `json:"owner_name" gorm:"type:varchar(100)"`
	IsDefault     bool       `json:"is_default" gorm:"default:false;index"`
	DeletedAt     *time.Time `json:"deleted_at" gorm:"index"`
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 指定表名
func (Agent) TableName() string {
	return "agents"
}

// DefaultAgent 是系统默认的 Agent
var DefaultAgent = &Agent{
	ID:           "default_agent",
	Name:         "通用助手",
	Description:  "一个帮助用户解答各种问题的 AI 助手",
	SystemPrompt: "你是一个友好、专业的 AI 助手，可以帮助用户解答各种问题，提供建议和解决方案。",
	Type:         AgentTypeSystem,
	IsDefault:    true,
}
