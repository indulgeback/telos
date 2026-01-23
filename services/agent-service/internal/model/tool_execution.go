// Package model 定义工具执行日志模型
package model

import "time"

// ToolExecution 工具执行日志
//
// 记录每次工具调用的详细信息，包括输入参数、执行结果、
// 耗时等，用于调试、监控和统计分析。
type ToolExecution struct {
	// ID 唯一标识符
	ID string `json:"id" gorm:"primaryKey;type:varchar(36)"`

	// AgentID 关联的 Agent ID
	AgentID string `json:"agent_id" gorm:"type:varchar(36);index:idx_executions_agent,priority:1"`

	// UserID 发起请求的用户 ID
	UserID string `json:"user_id" gorm:"type:varchar(36);index:idx_executions_user"`

	// ToolID 被调用的工具 ID
	ToolID string `json:"tool_id" gorm:"type:varchar(100);index:idx_executions_tool"`

	// InputParams 输入参数
	InputParams JSONB `json:"input_params" gorm:"type:jsonb;serializer:json"`

	// Result 执行结果
	Result JSONB `json:"result" gorm:"type:jsonb;serializer:json"`

	// Success 是否执行成功
	Success bool `json:"success" gorm:"not null;index"`

	// ErrorMessage 错误信息（执行失败时记录）
	ErrorMessage string `json:"error_message" gorm:"type:text"`

	// DurationMs 执行耗时（毫秒）
	DurationMs int `json:"duration_ms"`

	// TokensUsed 消耗的 Token 数量（预留，暂未使用）
	TokensUsed int `json:"tokens_used"`

	// CreatedAt 创建时间
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;index:idx_executions_created,priority:1"`
}

// TableName 指定 GORM 使用的数据库表名
func (ToolExecution) TableName() string {
	return "tool_executions"
}
