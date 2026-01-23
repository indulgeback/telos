// Package service 提供工具插件系统的业务逻辑层实现
package service

import (
	"context"
	"sync"

	"github.com/cloudwego/eino/components/tool"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	toolpkg "github.com/indulgeback/telos/services/agent-service/internal/pkg/tool"
	"github.com/indulgeback/telos/services/agent-service/internal/repository"
)

// ToolService 定义工具服务接口
type ToolService interface {
	// ========== 工具管理 ==========

	// CreateTool 创建新工具
	CreateTool(ctx context.Context, tool *model.Tool) error

	// GetTool 获取工具详情
	GetTool(ctx context.Context, id string) (*model.Tool, error)

	// ListTools 获取工具列表
	ListTools(ctx context.Context, opts *repository.ListOptions) ([]*model.Tool, int64, error)

	// UpdateTool 更新工具
	UpdateTool(ctx context.Context, tool *model.Tool) error

	// DeleteTool 删除工具
	DeleteTool(ctx context.Context, id string) error

	// ========== Agent 工具关联 ==========

	// SetAgentTools 设置 Agent 的工具列表
	SetAgentTools(ctx context.Context, agentID string, toolIDs []string) error

	// GetAgentTools 获取 Agent 的工具关联列表
	GetAgentTools(ctx context.Context, agentID string) ([]*model.AgentTool, error)

	// ToggleAgentTool 切换 Agent 工具的启用状态
	ToggleAgentTool(ctx context.Context, agentID, toolID string, enabled bool) error

	// ========== Eino 集成 ==========

	// GetEinoToolsForAgent 获取 Agent 的 Eino 工具映射（用于 ChatService）
	GetEinoToolsForAgent(ctx context.Context, agentID string) (map[string]tool.BaseTool, error)
}

// toolService 是 ToolService 接口的具体实现
type toolService struct {
	toolRepo      repository.ToolRepository
	agentToolRepo repository.AgentToolRepository
	executionRepo repository.ToolExecutionRepository
	executor      *toolpkg.GenericToolExecutor

	// 缓存已创建的 DynamicToolWrapper
	mu       sync.RWMutex
	wrappers map[string]*toolpkg.DynamicToolWrapper
}

// NewToolService 创建工具服务实例
func NewToolService(
	toolRepo repository.ToolRepository,
	agentToolRepo repository.AgentToolRepository,
	executionRepo repository.ToolExecutionRepository,
) ToolService {
	return &toolService{
		toolRepo:      toolRepo,
		agentToolRepo: agentToolRepo,
		executionRepo: executionRepo,
		executor:      toolpkg.NewGenericToolExecutor(),
		wrappers:      make(map[string]*toolpkg.DynamicToolWrapper),
	}
}

// ========== 工具管理实现 ==========

// CreateTool 创建新工具
func (s *toolService) CreateTool(ctx context.Context, toolModel *model.Tool) error {
	return s.toolRepo.Create(ctx, toolModel)
}

// GetTool 获取工具详情
func (s *toolService) GetTool(ctx context.Context, id string) (*model.Tool, error) {
	return s.toolRepo.GetByID(ctx, id)
}

// ListTools 获取工具列表
func (s *toolService) ListTools(ctx context.Context, opts *repository.ListOptions) ([]*model.Tool, int64, error) {
	return s.toolRepo.List(ctx, opts)
}

// UpdateTool 更新工具
func (s *toolService) UpdateTool(ctx context.Context, toolModel *model.Tool) error {
	// 清除缓存
	s.mu.Lock()
	delete(s.wrappers, toolModel.ID)
	s.mu.Unlock()

	return s.toolRepo.Update(ctx, toolModel)
}

// DeleteTool 删除工具
func (s *toolService) DeleteTool(ctx context.Context, id string) error {
	// 清除缓存
	s.mu.Lock()
	delete(s.wrappers, id)
	s.mu.Unlock()

	return s.toolRepo.Delete(ctx, id)
}

// ========== Agent 工具关联实现 ==========

// SetAgentTools 设置 Agent 的工具列表
func (s *toolService) SetAgentTools(ctx context.Context, agentID string, toolIDs []string) error {
	return s.agentToolRepo.SetAgentTools(ctx, agentID, toolIDs)
}

// GetAgentTools 获取 Agent 的工具关联列表
func (s *toolService) GetAgentTools(ctx context.Context, agentID string) ([]*model.AgentTool, error) {
	return s.agentToolRepo.ListByAgent(ctx, agentID)
}

// ToggleAgentTool 切换 Agent 工具的启用状态
func (s *toolService) ToggleAgentTool(ctx context.Context, agentID, toolID string, enabled bool) error {
	// 如果禁用工具，清除缓存
	if !enabled {
		s.mu.Lock()
		delete(s.wrappers, toolID)
		s.mu.Unlock()
	}
	return s.agentToolRepo.Toggle(ctx, agentID, toolID, enabled)
}

// ========== Eino 集成实现 ==========

// GetEinoToolsForAgent 获取 Agent 的 Eino 工具映射
//
// 这是工具系统与 ChatService 集成的关键方法。
// 从数据库读取 Agent 配置的工具定义，然后动态创建 Eino BaseTool 实例。
func (s *toolService) GetEinoToolsForAgent(ctx context.Context, agentID string) (map[string]tool.BaseTool, error) {
	// 从数据库获取 Agent 的工具定义
	dbTools, err := s.agentToolRepo.GetEnabledToolsForAgent(ctx, agentID)
	if err != nil {
		return nil, err
	}

	result := make(map[string]tool.BaseTool)
	for _, dbTool := range dbTools {
		// 获取或创建包装器
		wrapper := s.getOrCreateWrapper(dbTool)
		result[dbTool.Name] = wrapper
	}

	return result, nil
}

// getOrCreateWrapper 获取或创建工具包装器
//
// 使用双重检查锁定模式确保并发安全。
func (s *toolService) getOrCreateWrapper(dbTool *model.Tool) *toolpkg.DynamicToolWrapper {
	s.mu.RLock()
	wrapper, exists := s.wrappers[dbTool.ID]
	s.mu.RUnlock()

	if exists {
		return wrapper
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// 再次检查（double-check locking）
	if wrapper, exists := s.wrappers[dbTool.ID]; exists {
		return wrapper
	}

	wrapper = toolpkg.NewDynamicToolWrapper(dbTool, s.executor)
	s.wrappers[dbTool.ID] = wrapper
	return wrapper
}
