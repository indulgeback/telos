// Package service 提供 Agent Service 的业务逻辑层实现
//
// 该层位于 Handler 和 Repository 之间，负责：
//   - 封装业务逻辑和规则
//   - 权限验证（如只有创建者可以编辑/删除自己的 Agent）
//   - 生成系统提示词
//   - 协调多个 Repository 的调用
package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/repository"
)

// ========== 接口定义 ==========

// AgentService 定义 Agent 服务的业务接口
//
// 该接口包含了 Agent 管理的所有业务操作，遵循依赖倒置原则。
type AgentService interface {
	// CreateAgent 创建新 Agent
	CreateAgent(ctx context.Context, userID, userName, name, description string, agentType model.AgentType) (*model.Agent, error)

	// GetAgent 获取单个 Agent
	GetAgent(ctx context.Context, id string) (*model.Agent, error)

	// ListAgents 获取 Agent 列表
	ListAgents(ctx context.Context, userID string) ([]*model.Agent, error)

	// UpdateAgent 更新 Agent
	UpdateAgent(ctx context.Context, id, userID, name, description string) (*model.Agent, error)

	// DeleteAgent 删除 Agent
	DeleteAgent(ctx context.Context, id, userID string) error

	// GetDefaultAgent 获取默认 Agent
	GetDefaultAgent(ctx context.Context) (*model.Agent, error)

	// GetAgentForChat 获取用于聊天的 Agent（包含权限检查）
	GetAgentForChat(ctx context.Context, agentID string) (*model.Agent, error)
}

// ========== 实现 ==========

// agentService 是 AgentService 接口的具体实现
type agentService struct {
	agentRepo   repository.AgentRepository
	chatService *ChatService
}

// NewAgentService 创建 AgentService 实例
//
// 参数：
//   - agentRepo: Agent 仓储实例，用于数据访问
//   - chatService: 聊天服务实例，用于生成系统提示词
//
// 返回：
//   - AgentService: 服务接口实例
func NewAgentService(agentRepo repository.AgentRepository, chatService *ChatService) AgentService {
	return &agentService{
		agentRepo:   agentRepo,
		chatService: chatService,
	}
}

// CreateAgent 创建新 Agent
//
// 业务逻辑：
//  1. 生成 UUID 作为 Agent ID
//  2. 根据类型生成对应的系统提示词
//  3. 保存到数据库
//
// 参数：
//   - ctx: 请求上下文
//   - userID: 创建者的用户 ID
//   - userName: 创建者的用户名
//   - name: Agent 名称
//   - description: Agent 描述
//   - agentType: Agent 类型（public/private）
//
// 返回：
//   - *model.Agent: 创建的 Agent 实体
//   - error: 创建失败时返回错误
func (s *agentService) CreateAgent(ctx context.Context, userID, userName, name, description string, agentType model.AgentType) (*model.Agent, error) {
	// 使用 LLM 生成更专业的系统提示词
	systemPrompt, err := s.generateSystemPromptWithLLM(ctx, name, description, agentType)
	if err != nil {
		// 如果 LLM 生成失败，回退到模板生成
		systemPrompt = s.buildSystemPrompt(name, description, agentType)
	}

	// 构建新 Agent
	agent := &model.Agent{
		ID:           uuid.New().String(), // 生成唯一 ID
		Name:         name,
		Description:  description,
		SystemPrompt: systemPrompt,
		Type:         agentType,
		OwnerID:      userID,
		OwnerName:    userName,
		IsDefault:    false,
	}

	// 保存到数据库
	if err := s.agentRepo.Create(ctx, agent); err != nil {
		return nil, fmt.Errorf("创建 Agent 失败: %w", err)
	}

	return agent, nil
}

// GetAgent 获取单个 Agent
//
// 参数：
//   - ctx: 请求上下文
//   - id: Agent ID
//
// 返回：
//   - *model.Agent: Agent 实体
//   - error: Agent 不存在时返回错误
func (s *agentService) GetAgent(ctx context.Context, id string) (*model.Agent, error) {
	agent, err := s.agentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("获取 Agent 失败: %w", err)
	}
	return agent, nil
}

// ListAgents 获取 Agent 列表
//
// 返回用户可见的所有 Agent，包括公开、系统和用户自己创建的私有 Agent。
//
// 参数：
//   - ctx: 请求上下文
//   - userID: 当前用户的 ID
//
// 返回：
//   - []*model.Agent: Agent 列表
//   - error: 查询失败时返回错误
func (s *agentService) ListAgents(ctx context.Context, userID string) ([]*model.Agent, error) {
	agents, err := s.agentRepo.List(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("获取 Agent 列表失败: %w", err)
	}
	return agents, nil
}

// UpdateAgent 更新 Agent
//
// 业务规则：
//   - 系统 Agent 不能编辑
//   - 只有创建者可以编辑自己的 Agent
//   - 不允许编辑系统提示词
//
// 参数：
//   - ctx: 请求上下文
//   - id: Agent ID
//   - userID: 当前用户的 ID（用于权限验证）
//   - name: 新的名称
//   - description: 新的描述
//
// 返回：
//   - *model.Agent: 更新后的 Agent
//   - error: 无权限或其他错误时返回
func (s *agentService) UpdateAgent(ctx context.Context, id, userID, name, description string) (*model.Agent, error) {
	// 先获取现有 Agent
	agent, err := s.agentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("Agent 不存在: %w", err)
	}

	// 权限检查：系统 Agent 不能编辑
	if agent.Type == model.AgentTypeSystem {
		return nil, fmt.Errorf("系统 Agent 不能编辑")
	}

	// 权限检查：只有创建者可以编辑
	if agent.OwnerID != userID {
		return nil, fmt.Errorf("无权编辑此 Agent")
	}

	// 更新允许修改的字段
	agent.Name = name
	agent.Description = description
	// 注意：不编辑 system_prompt，保持原有设定

	// 保存更新
	if err := s.agentRepo.Update(ctx, agent); err != nil {
		return nil, fmt.Errorf("更新 Agent 失败: %w", err)
	}

	return agent, nil
}

// DeleteAgent 删除 Agent
//
// 业务规则：
//   - 系统 Agent（包括默认 Agent）不能删除
//   - 只有创建者可以删除自己的 Agent
//   - 执行软删除，数据保留在数据库中
//
// 参数：
//   - ctx: 请求上下文
//   - id: Agent ID
//   - userID: 当前用户的 ID（用于权限验证）
//
// 返回：
//   - error: 无权限或其他错误时返回
func (s *agentService) DeleteAgent(ctx context.Context, id, userID string) error {
	// 先获取 Agent 进行权限检查
	agent, err := s.agentRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("Agent 不存在: %w", err)
	}

	// 权限检查：系统默认 Agent 不能删除
	if agent.IsDefault || agent.Type == model.AgentTypeSystem {
		return fmt.Errorf("系统 Agent 不能删除")
	}

	// 权限检查：只有创建者可以删除
	if agent.OwnerID != userID {
		return fmt.Errorf("无权删除此 Agent")
	}

	// 执行软删除
	if err := s.agentRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("删除 Agent 失败: %w", err)
	}

	return nil
}

// GetDefaultAgent 获取默认 Agent
//
// 默认 Agent 是系统内置的通用助手，当用户未指定 Agent 时使用。
//
// 参数：
//   - ctx: 请求上下文
//
// 返回：
//   - *model.Agent: 默认 Agent 实体
//   - error: 默认 Agent 不存在时返回
func (s *agentService) GetDefaultAgent(ctx context.Context) (*model.Agent, error) {
	agent, err := s.agentRepo.GetDefault(ctx)
	if err != nil {
		return nil, fmt.Errorf("获取默认 Agent 失败: %w", err)
	}
	return agent, nil
}

// GetAgentForChat 获取用于聊天的 Agent
//
// 此方法专门用于聊天场景，包含额外的权限检查：
//   - 系统和公开 Agent 可以被任何人使用
//   - 私有 Agent 的访问控制（当前允许所有，后续可加强）
//
// 参数：
//   - ctx: 请求上下文
//   - agentID: Agent ID
//
// 返回：
//   - *model.Agent: Agent 实体
//   - error: Agent 不存在时返回
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
	// TODO: 添加私有 Agent 的用户权限检查
	return agent, nil
}

// ========== 私有方法：系统提示词生成 ==========

// buildSystemPrompt 构建系统提示词
//
// 根据不同的 Agent 类型，生成具有特定风格和内容的系统提示词。
// 系统提示词定义了 AI 的角色、行为准则和回答风格。
//
// 参数：
//   - name: Agent 名称
//   - description: Agent 描述
//   - agentType: Agent 类型
//
// 返回：
//   - string: 生成的系统提示词
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

// buildSystemAgentPrompt 生成系统 Agent 的提示词
//
// 系统 Agent 是官方内置的，提示词强调专业性和权威性。
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

// buildPublicAgentPrompt 生成公开 Agent 的提示词
//
// 公开 Agent 可供所有用户使用，提示词强调服务质量和专业性。
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

// buildPrivateAgentPrompt 生成私有 Agent 的提示词
//
// 私有 Agent 是用户自定义的，提示词强调个性化和专注领域。
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

// buildDefaultPrompt 生成默认提示词模板
//
// 当类型不匹配时使用的通用模板。
func (s *agentService) buildDefaultPrompt(name, description string) string {
	return fmt.Sprintf(`# %s
%s

# 指导原则
- 保持专业和礼貌
- 提供有价值的回答
- 必要时请求更多信息`, name, description)
}

// generateSystemPromptWithLLM 使用 LLM 生成系统提示词
//
// 通过调用 AI 模型，根据用户提供的名称和描述，生成更专业、更完整的系统提示词。
// 这样可以避免简单的模板拼接，让 AI 根据具体需求生成更合适的提示词。
//
// 参数：
//   - ctx: 请求上下文
//   - name: Agent 名称
//   - description: Agent 描述
//   - agentType: Agent 类型
//
// 返回：
//   - string: LLM 生成的系统提示词
//   - error: LLM 调用失败时返回错误
func (s *agentService) generateSystemPromptWithLLM(ctx context.Context, name, description string, agentType model.AgentType) (string, error) {
	// 构建 Agent 类型的中文描述
	agentTypeDesc := "私有智能体"
	switch agentType {
	case model.AgentTypeSystem:
		agentTypeDesc = "系统内置智能体"
	case model.AgentTypePublic:
		agentTypeDesc = "公开智能体"
	case model.AgentTypePrivate:
		agentTypeDesc = "私有智能体"
	}

	// 构建用于生成系统提示词的提示词
	promptForPrompt := fmt.Sprintf(`你是一个专业的 AI 提示词工程师。请根据以下信息，为一个 AI Agent 生成高质量的系统提示词（System Prompt）。

Agent 信息：
- 名称：%s
- 描述：%s
- 类型：%s

要求：
1. 生成的系统提示词要结构清晰、内容专业
2. 应包含：角色设定、核心能力、行为准则、回答风格等部分
3. 使用 Markdown 格式组织
4. 直接输出生成的系统提示词，不要有任何额外说明
5. 使用描述使用的语言编写

请生成系统提示词：`, name, description, agentTypeDesc)

	// 调用 LLM 生成
	messages := []Message{
		{Role: "user", Content: promptForPrompt},
	}

	generatedPrompt, err := s.chatService.Chat(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("LLM 生成系统提示词失败: %w", err)
	}

	return generatedPrompt, nil
}
