// Package model 定义 Agent Service 的数据模型
//
// 包含：
//   - AgentType: Agent 类型枚举（公开/私有/系统）
//   - Agent: Agent 实体模型
//   - DefaultAgent: 系统默认 Agent 预设
package model

import "time"

// AgentType 定义 Agent 的可见性和访问权限类型
type AgentType string

const (
	// AgentTypePublic 公开 Agent
	// 所有用户都可以查看和使用
	AgentTypePublic AgentType = "public"

	// AgentTypePrivate 私有 Agent
	// 仅创建者可以使用
	AgentTypePrivate AgentType = "private"

	// AgentTypeSystem 系统 Agent
	// 内置的官方 Agent，不可编辑和删除
	AgentTypeSystem AgentType = "system"
)

// Agent 表示一个 AI Agent 实体
//
// Agent 是具有特定角色和行为的 AI 助手，通过系统提示词（SystemPrompt）
// 定义其性格和能力。支持三种类型：公开、私有和系统。
type Agent struct {
	// ID 唯一标识符（UUID 格式）
	ID string `json:"id" gorm:"primaryKey;type:varchar(36)"`

	// Name Agent 显示名称
	Name string `json:"name" gorm:"type:varchar(100);not null"`

	// Description Agent 功能描述
	Description string `json:"description" gorm:"type:text;not null"`

	// SystemPrompt 系统提示词，定义 Agent 的行为和角色
	SystemPrompt string `json:"system_prompt" gorm:"type:text;not null"`

	// Type Agent 类型（public/private/system）
	Type AgentType `json:"type" gorm:"type:varchar(20);not null;index"`

	// OwnerID 创建者的用户 ID
	OwnerID string `json:"owner_id" gorm:"type:varchar(36);index"`

	// OwnerName 创建者的用户名
	OwnerName string `json:"owner_name" gorm:"type:varchar(100)"`

	// IsDefault 是否为系统默认 Agent
	IsDefault bool `json:"is_default" gorm:"default:false;index"`

	// DeletedAt 软删除时间戳（GORM 软删除支持）
	DeletedAt *time.Time `json:"deleted_at" gorm:"index"`

	//CreatedAt 创建时间
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`

	// UpdatedAt 更新时间
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 指定 GORM 使用的数据库表名
func (Agent) TableName() string {
	return "agents"
}

// DefaultAgent 是系统预置的默认 Agent
//
// 该 Agent 在服务首次启动时自动创建，作为系统的通用 AI 助手。
// 用户在未选择特定 Agent 时，将使用此默认 Agent 进行对话。
var DefaultAgent = &Agent{
	ID:           "default_agent",
	Name:         "通用助手",
	Description:  "一个帮助用户解答各种问题的 AI 助手",
	SystemPrompt: "你是一个友好、专业的 AI 助手，可以帮助用户解答各种问题，提供建议和解决方案。",
	Type:         AgentTypeSystem,
	IsDefault:    true,
}
