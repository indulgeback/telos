// Package repository 提供 Agent 数据访问层的实现
//
// 该层负责与数据库交互，封装所有数据库操作。
// 使用 GORM 作为 ORM 框架，支持 PostgreSQL 数据库。
//
// 设计模式：
//   - 接口定义与实现分离，便于测试和替换
//   - 使用 context 支持请求级别的超时控制
//   - 软删除机制，数据可恢复
package repository

import (
	"context"
	"errors"
	"time"

	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"gorm.io/gorm"
)

// ========== 错误定义 ==========

// ErrAgentNotFound Agent 未找到错误
// 当查询的 Agent 在数据库中不存在时返回
var ErrAgentNotFound = errors.New("agent not found")

// ErrAgentAlreadyExists Agent 已存在错误
// 当尝试创建已存在的 Agent 时返回
var ErrAgentAlreadyExists = errors.New("agent already exists")

// ========== 接口定义 ==========

// AgentRepository 定义 Agent 数据访问接口
//
// 该接口抽象了所有 Agent 相关的数据库操作，遵循仓储模式（Repository Pattern）。
// 通过接口定义，可以方便地进行单元测试（使用 mock）和更换实现（如切换数据库）。
type AgentRepository interface {
	// Create 创建新的 Agent
	Create(ctx context.Context, agent *model.Agent) error

	// GetByID 根据 ID 获取单个 Agent
	GetByID(ctx context.Context, id string) (*model.Agent, error)

	// List 获取 Agent 列表
	// 返回公开 Agent、系统 Agent 和当前用户的私有 Agent
	List(ctx context.Context, userID string) ([]*model.Agent, error)

	// Update 更新 Agent 信息
	Update(ctx context.Context, agent *model.Agent) error

	// Delete 软删除 Agent（设置 deleted_at 时间戳）
	Delete(ctx context.Context, id string) error

	// GetDefault 获取系统默认 Agent
	GetDefault(ctx context.Context) (*model.Agent, error)

	// GetByOwnerID 获取指定用户创建的所有 Agent
	GetByOwnerID(ctx context.Context, ownerID string) ([]*model.Agent, error)
}

// ========== 实现 ==========

// agentRepository 是 AgentRepository 接口的具体实现
type agentRepository struct {
	db *gorm.DB // GORM 数据库实例
}

// NewAgentRepository 创建 AgentRepository 实例
//
// 参数：
//   - db: GORM 数据库实例
//
// 返回：
//   - AgentRepository: 仓储接口实例
func NewAgentRepository(db *gorm.DB) AgentRepository {
	return &agentRepository{db: db}
}

// Create 创建新的 Agent
//
// 将 Agent 实体插入到数据库中。GORM 会自动处理
// 创建时间和更新时间的设置。
//
// 参数：
//   - ctx: 请求上下文，用于超时控制
//   - agent: 待创建的 Agent 实体（必须包含 ID）
//
// 返回：
//   - error: 数据库操作失败时返回错误
func (r *agentRepository) Create(ctx context.Context, agent *model.Agent) error {
	return r.db.WithContext(ctx).Create(agent).Error
}

// GetByID 根据 ID 获取单个 Agent
//
// 参数：
//   - ctx: 请求上下文
//   - id: Agent 的唯一标识符
//
// 返回：
//   - *model.Agent: 找到的 Agent 实体
//   - error: Agent 不存在或其他数据库错误时返回
func (r *agentRepository) GetByID(ctx context.Context, id string) (*model.Agent, error) {
	var agent model.Agent
	// 查询条件：ID 匹配且未被软删除
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

// List 获取 Agent 列表
//
// 返回用户可见的所有 Agent，包括：
//   - 公开 Agent (AgentTypePublic)
//   - 系统 Agent (AgentTypeSystem)
//   - 当前用户创建的私有 Agent (AgentTypePrivate)
//
// 排序规则：
//   - 默认 Agent 排在最前
//   - 其他按创建时间倒序排列
//
// 参数：
//   - ctx: 请求上下文
//   - userID: 当前用户的 ID，用于过滤私有 Agent
//
// 返回：
//   - []*model.Agent: Agent 列表
//   - error: 数据库操作失败时返回
func (r *agentRepository) List(ctx context.Context, userID string) ([]*model.Agent, error) {
	var agents []*model.Agent
	// 查询条件：未删除 + (公开 OR 系统 OR 当前用户拥有)
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

// Update 更新 Agent 信息
//
// 使用 Save 方法更新整个 Agent 实体，GORM 会自动
// 更新 updated_at 时间戳。
//
// 参数：
//   - ctx: 请求上下文
//   - agent: 包含更新内容的 Agent 实体
//
// 返回：
//   - error: 数据库操作失败时返回
func (r *agentRepository) Update(ctx context.Context, agent *model.Agent) error {
	return r.db.WithContext(ctx).Save(agent).Error
}

// Delete 软删除 Agent
//
// 不真正删除数据库记录，而是设置 deleted_at 时间戳。
// 这样可以保留数据用于审计和恢复。
//
// 参数：
//   - ctx: 请求上下文
//   - id: 待删除的 Agent ID
//
// 返回：
//   - error: Agent 不存在或数据库操作失败时返回
func (r *agentRepository) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).
		Model(&model.Agent{}).
		Where("id = ?", id).
		Update("deleted_at", time.Now())
	if result.Error != nil {
		return result.Error
	}
	// 检查是否真正更新了记录
	if result.RowsAffected == 0 {
		return ErrAgentNotFound
	}
	return nil
}

// GetDefault 获取系统默认 Agent
//
// 默认 Agent 通过 is_default 标识，用于用户未指定 Agent 时的回退。
//
// 参数：
//   - ctx: 请求上下文
//
// 返回：
//   - *model.Agent: 默认 Agent 实体
//   - error: 默认 Agent 不存在时返回
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

// GetByOwnerID 获取指定用户创建的所有 Agent
//
// 仅返回指定用户作为创建者的 Agent，不包括公开和系统 Agent。
// 按创建时间倒序排列，最新创建的在前。
//
// 参数：
//   - ctx: 请求上下文
//   - ownerID: 用户 ID
//
// 返回：
//   - []*model.Agent: 该用户创建的 Agent 列表
//   - error: 数据库操作失败时返回
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
