package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/repository"
)

// AgentService Agent 服务接口
type AgentService interface {
	CreateAgent(ctx context.Context, userID, userName, name, description string, agentType model.AgentType) (*model.Agent, error)
	GetAgent(ctx context.Context, id string) (*model.Agent, error)
	ListAgents(ctx context.Context, userID string) ([]*model.Agent, error)
	UpdateAgent(ctx context.Context, id, userID, name, description string) (*model.Agent, error)
	DeleteAgent(ctx context.Context, id, userID string) error
	GetDefaultAgent(ctx context.Context) (*model.Agent, error)
	GetAgentForChat(ctx context.Context, agentID string) (*model.Agent, error)
}

type agentService struct {
	agentRepo repository.AgentRepository
}

// NewAgentService 创建 AgentService 实例
func NewAgentService(agentRepo repository.AgentRepository) AgentService {
	return &agentService{
		agentRepo: agentRepo,
	}
}

// CreateAgent 创建新 Agent
func (s *agentService) CreateAgent(ctx context.Context, userID, userName, name, description string, agentType model.AgentType) (*model.Agent, error) {
	agent := &model.Agent{
		ID:           uuid.New().String(),
		Name:         name,
		Description:  description,
		SystemPrompt: s.buildSystemPrompt(name, description, agentType),
		Type:         agentType,
		OwnerID:      userID,
		OwnerName:    userName,
		IsDefault:    false,
	}

	if err := s.agentRepo.Create(ctx, agent); err != nil {
		return nil, fmt.Errorf("创建 Agent 失败: %w", err)
	}

	return agent, nil
}

// GetAgent 获取单个 Agent
func (s *agentService) GetAgent(ctx context.Context, id string) (*model.Agent, error) {
	agent, err := s.agentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("获取 Agent 失败: %w", err)
	}
	return agent, nil
}

// ListAgents 获取 Agent 列表
func (s *agentService) ListAgents(ctx context.Context, userID string) ([]*model.Agent, error) {
	agents, err := s.agentRepo.List(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("获取 Agent 列表失败: %w", err)
	}
	return agents, nil
}

// UpdateAgent 更新 Agent
func (s *agentService) UpdateAgent(ctx context.Context, id, userID, name, description string) (*model.Agent, error) {
	agent, err := s.agentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("Agent 不存在: %w", err)
	}

	// 只有创建者可以编辑
	if agent.Type == model.AgentTypeSystem {
		return nil, fmt.Errorf("系统 Agent 不能编辑")
	}

	if agent.OwnerID != userID {
		return nil, fmt.Errorf("无权编辑此 Agent")
	}

	agent.Name = name
	agent.Description = description
	// 不允许编辑 system_prompt

	if err := s.agentRepo.Update(ctx, agent); err != nil {
		return nil, fmt.Errorf("更新 Agent 失败: %w", err)
	}

	return agent, nil
}

// DeleteAgent 删除 Agent
func (s *agentService) DeleteAgent(ctx context.Context, id, userID string) error {
	agent, err := s.agentRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("Agent 不存在: %w", err)
	}

	// 系统默认 Agent 不能删除
	if agent.IsDefault || agent.Type == model.AgentTypeSystem {
		return fmt.Errorf("系统 Agent 不能删除")
	}

	// 只有创建者可以删除
	if agent.OwnerID != userID {
		return fmt.Errorf("无权删除此 Agent")
	}

	if err := s.agentRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("删除 Agent 失败: %w", err)
	}

	return nil
}

// GetDefaultAgent 获取默认 Agent
func (s *agentService) GetDefaultAgent(ctx context.Context) (*model.Agent, error) {
	agent, err := s.agentRepo.GetDefault(ctx)
	if err != nil {
		return nil, fmt.Errorf("获取默认 Agent 失败: %w", err)
	}
	return agent, nil
}

// GetAgentForChat 获取用于聊天的 Agent（检查权限）
func (s *agentService) GetAgentForChat(ctx context.Context, agentID string) (*model.Agent, error) {
	agent, err := s.agentRepo.GetByID(ctx, agentID)
	if err != nil {
		return nil, fmt.Errorf("Agent 不存在: %w", err)
	}

	// 系统和公开 Agent 可以使用
	if agent.Type == model.AgentTypeSystem || agent.Type == model.AgentTypePublic {
		return agent, nil
	}

	// 私有 Agent 暂时允许使用（后续需要添加用户认证检查）
	return agent, nil
}

// buildSystemPrompt 构建系统提示词
func (s *agentService) buildSystemPrompt(name, description string, agentType model.AgentType) string {
	// 根据类型选择基础模板
	var basePrompt string

	switch agentType {
	case model.AgentTypeSystem:
		basePrompt = s.buildSystemAgentPrompt(name, description)
	case model.AgentTypePublic:
		basePrompt = s.buildPublicAgentPrompt(name, description)
	case model.AgentTypePrivate:
		basePrompt = s.buildPrivateAgentPrompt(name, description)
	default:
		basePrompt = s.buildDefaultPrompt(name, description)
	}

	return basePrompt
}

// buildSystemAgentPrompt 系统智能体提示词
func (s *agentService) buildSystemAgentPrompt(name, description string) string {
	return fmt.Sprintf(`# 角色设定
你是 %s，%s

# 核心能力
- 专业解答用户问题
- 提供准确的建议和解决方案
- 保持友好、专业的沟通态度

# 回答准则
1. 回答要准确、简洁、有条理
2. 不确定的内容要诚实告知
3. 可以主动询问细节以提供更好的帮助
4. 使用 Markdown 格式组织回答`, name, description)
}

// buildPublicAgentPrompt 公开智能体提示词
func (s *agentService) buildPublicAgentPrompt(name, description string) string {
	return fmt.Sprintf(`# 你的身份
名称：%s
角色：%s

# 任务目标
你是一个专业的 AI 助手，专注于为用户提供高质量的服务。

# 行为规范
- 保持专业、友好的态度
- 根据用户问题提供有针对性的回答
- 回答结构清晰，重点突出
- 必要时使用列表、代码块等格式增强可读性`, name, description)
}

// buildPrivateAgentPrompt 私有智能体提示词
func (s *agentService) buildPrivateAgentPrompt(name, description string) string {
	return fmt.Sprintf(`# 角色定义
你是名为 "%s" 的专属 AI 助手。

# 职责描述
%s

# 工作方式
1. 深入理解用户需求
2. 提供个性化的解决方案
3. 保持耐心和细致
4. 可以主动追问以更好地帮助用户

# 注意事项
- 这是一个私有智能体，专注于特定领域
- 遇到超出范围的问题，请礼貌说明`, name, description)
}

// buildDefaultPrompt 默认提示词模板
func (s *agentService) buildDefaultPrompt(name, description string) string {
	return fmt.Sprintf(`# %s
%s

# 指导原则
- 保持专业和礼貌
- 提供有价值的回答
- 必要时请求更多信息`, name, description)
}
