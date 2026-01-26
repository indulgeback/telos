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
// 同时自动包含内置工具（计算器、时间），无需手动配置。
func (s *toolService) GetEinoToolsForAgent(ctx context.Context, agentID string) (map[string]tool.BaseTool, error) {
	result := make(map[string]tool.BaseTool)

	// ========== 1. 添加内置工具（所有 Agent 自动拥有） ==========
	builtinTools := s.getBuiltinToolDefinitions()
	for _, builtinTool := range builtinTools {
		wrapper := toolpkg.NewDynamicToolWrapper(builtinTool, s.executor)
		wrapper.SetContext(agentID, "")
		result[builtinTool.Name] = wrapper
	}

	// ========== 2. 从数据库获取 Agent 配置的工具 ==========
	dbTools, err := s.agentToolRepo.GetEnabledToolsForAgent(ctx, agentID)
	if err != nil {
		return result, nil // 返回至少包含内置工具的结果
	}

	for _, dbTool := range dbTools {
		// 跳过与内置工具同名的情况（数据库配置优先级低于内置）
		if _, exists := result[dbTool.Name]; exists {
			continue
		}
		// 获取或创建包装器
		wrapper := s.getOrCreateWrapper(dbTool)
		wrapper.SetContext(agentID, "")
		result[dbTool.Name] = wrapper
	}

	return result, nil
}

// getBuiltinToolDefinitions 获取内置工具定义
//
// 这些工具自动对所有 Agent 可用，无需数据库配置。
func (s *toolService) getBuiltinToolDefinitions() []*model.Tool {
	return []*model.Tool{
		{
			ID:          "builtin-calculator",
			Name:        "calculator",
			Type:        model.ToolTypeInvokable,
			DisplayName: "计算器",
			Description: "执行数学运算，支持加法、减法、乘法、除法。参数：operation（运算类型：add/subtract/multiply/divide）、a（第一个数字）、b（第二个数字）",
			Category:    "builtin",
			Endpoint: model.EndpointConfig{
				URLTemplate: "internal://calculator",
				Method:      "GET",
			},
			Parameters: model.ParametersDef{
				Type: "object",
				Properties: map[string]*model.ParameterDef{
					"operation": {
						Type:        "string",
						Description: "运算类型",
						Enum:        []string{"add", "subtract", "multiply", "divide"},
						Required:    true,
					},
					"a": {
						Type:        "number",
						Description: "第一个数字",
						Required:    true,
					},
					"b": {
						Type:        "number",
						Description: "第二个数字",
						Required:    true,
					},
				},
				Required: []string{"operation", "a", "b"},
			},
			Enabled: true,
		},
		{
			ID:          "builtin-time",
			Name:        "get_current_time",
			Type:        model.ToolTypeInvokable,
			DisplayName: "当前时间",
			Description: "获取指定时区的当前时间。参数：timezone（时区，如 Asia/Shanghai、America/New_York，默认为 Asia/Shanghai）",
			Category:    "builtin",
			Endpoint: model.EndpointConfig{
				URLTemplate: "internal://time",
				Method:      "GET",
			},
			Parameters: model.ParametersDef{
				Type: "object",
				Properties: map[string]*model.ParameterDef{
					"timezone": {
						Type:        "string",
						Description: "时区标识符，如 Asia/Shanghai、America/New_York、UTC 等",
						Required:    false,
					},
				},
				Required: []string{},
			},
			Enabled: true,
		},
	}
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
