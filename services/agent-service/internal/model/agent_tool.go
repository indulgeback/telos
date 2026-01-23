// Package model 定义 Agent 与工具的关联模型
package model

import "time"

// AgentTool 表示 Agent 与工具的关联关系
//
// 一个 Agent 可以配置多个工具，每个工具可以被多个 Agent 使用。
// 支持覆盖工具的默认配置。
type AgentTool struct {
	// ID 唯一标识符
	ID string `json:"id" gorm:"primaryKey;type:varchar(36)"`

	// AgentID 关联的 Agent ID
	AgentID string `json:"agent_id" gorm:"type:varchar(36);not null;index:idx_agent_tools_agent,priority:1"`

	// ToolID 关联的工具 ID
	ToolID string `json:"tool_id" gorm:"type:varchar(100);not null;index:idx_agent_tools_tool,priority:1"`

	// Enabled 是否启用该工具
	Enabled bool `json:"enabled" gorm:"default:true"`

	// Config 覆盖工具的默认配置（可选）
	// 例如：覆盖 API Key、超时时间等
	Config JSONB `json:"config" gorm:"type:jsonb;serializer:json"`

	// CreatedAt 创建时间
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`

	// UpdatedAt 更新时间
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// 关联
	// Tool 关联的工具定义
	Tool Tool `gorm:"foreignKey:ToolID;references:ID"`
}

// TableName 指定 GORM 使用的数据库表名
func (AgentTool) TableName() string {
	return "agent_tools"
}
