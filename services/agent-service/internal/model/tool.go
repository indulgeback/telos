package model

import (
	"time"
)

// ToolType 工具类型
type ToolType string

const (
	ToolTypeBuiltin   ToolType = "builtin"   // 内置工具
	ToolTypeHTTP      ToolType = "http"      // HTTP 调用工具
	ToolTypeDB        ToolType = "db"        // 数据库查询工具
	ToolTypeWorkflow  ToolType = "workflow"  // 工作流工具
	ToolTypeCustom    ToolType = "custom"    // 自定义工具
)

// ToolDefinition 工具定义
type ToolDefinition struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;uniqueIndex"`
	Type        ToolType  `json:"type" gorm:"not null"`
	Description string    `json:"description" gorm:""`
	Schema      JSONMap   `json:"schema" gorm:"type:jsonb"` // JSON Schema
	Config      JSONMap   `json:"config" gorm:"type:jsonb"` // 工具配置 (endpoint, auth 等)
	Enabled     bool      `json:"enabled" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// ToolExecution 工具执行记录
type ToolExecution struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	ConversationID string    `json:"conversation_id" gorm:"index"`
	MessageID      string    `json:"message_id" gorm:"index"`
	ToolName       string    `json:"tool_name" gorm:"not null"`
	Input          JSONMap   `json:"input" gorm:"type:jsonb"`
	Output         JSONMap   `json:"output" gorm:"type:jsonb"`
	Error          string    `json:"error,omitempty" gorm:"type:text"`
	Duration       int64     `json:"duration" gorm:""` // 执行时长 (毫秒)
	CreatedAt      time.Time `json:"created_at"`
}

// TableName 指定表名
func (ToolDefinition) TableName() string {
	return "tool_definitions"
}

func (ToolExecution) TableName() string {
	return "tool_executions"
}
