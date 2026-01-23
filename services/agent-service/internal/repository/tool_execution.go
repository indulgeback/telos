// Package repository 提供 ToolExecution 数据访问层的实现
package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"gorm.io/gorm"
)

// ToolExecutionRepository 定义工具执行日志数据访问接口
type ToolExecutionRepository interface {
	// Create 创建执行日志
	Create(ctx context.Context, exec *model.ToolExecution) error

	// GetByAgent 获取 Agent 的执行日志
	GetByAgent(ctx context.Context, agentID string, limit int) ([]*model.ToolExecution, error)

	// GetStatsByTool 获取工具的统计信息
	GetStatsByTool(ctx context.Context, toolID string, days int) (*ToolStats, error)

	// GetRecentByUser 获取用户最近的执行日志
	GetRecentByUser(ctx context.Context, userID string, limit int) ([]*model.ToolExecution, error)
}

// ToolStats 工具统计信息
type ToolStats struct {
	TotalExecutions int
	SuccessCount    int
	FailureCount    int
	AvgDurationMs   int
}

// toolExecutionRepository 是 ToolExecutionRepository 接口的具体实现
type toolExecutionRepository struct {
	db *gorm.DB
}

// NewToolExecutionRepository 创建 ToolExecutionRepository 实例
func NewToolExecutionRepository(db *gorm.DB) ToolExecutionRepository {
	return &toolExecutionRepository{db: db}
}

// Create 创建执行日志
func (r *toolExecutionRepository) Create(ctx context.Context, exec *model.ToolExecution) error {
	if exec.ID == "" {
		exec.ID = uuid.New().String()
	}
	return r.db.WithContext(ctx).Create(exec).Error
}

// GetByAgent 获取 Agent 的执行日志
func (r *toolExecutionRepository) GetByAgent(ctx context.Context, agentID string, limit int) ([]*model.ToolExecution, error) {
	var executions []*model.ToolExecution
	err := r.db.WithContext(ctx).
		Where("agent_id = ?", agentID).
		Order("created_at DESC").
		Limit(limit).
		Find(&executions).Error
	return executions, err
}

// GetStatsByTool 获取工具的统计信息
func (r *toolExecutionRepository) GetStatsByTool(ctx context.Context, toolID string, days int) (*ToolStats, error) {
	since := time.Now().AddDate(0, 0, -days)

	var stats ToolStats
	var total, success int64

	// 总执行次数
	r.db.WithContext(ctx).
		Model(&model.ToolExecution{}).
		Where("tool_id = ? AND created_at >= ?", toolID, since).
		Count(&total)
	stats.TotalExecutions = int(total)

	// 成功次数
	r.db.WithContext(ctx).
		Model(&model.ToolExecution{}).
		Where("tool_id = ? AND created_at >= ? AND success = ?", toolID, since, true).
		Count(&success)
	stats.SuccessCount = int(success)

	stats.FailureCount = stats.TotalExecutions - stats.SuccessCount

	// 平均耗时
	r.db.WithContext(ctx).
		Model(&model.ToolExecution{}).
		Select("AVG(duration_ms)").
		Where("tool_id = ? AND created_at >= ? AND success = ?", toolID, since, true).
		Scan(&stats.AvgDurationMs)

	return &stats, nil
}

// GetRecentByUser 获取用户最近的执行日志
func (r *toolExecutionRepository) GetRecentByUser(ctx context.Context, userID string, limit int) ([]*model.ToolExecution, error) {
	var executions []*model.ToolExecution
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&executions).Error
	return executions, err
}
