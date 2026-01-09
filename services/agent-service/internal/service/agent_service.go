package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/flow/agent/react"
	einocompmodel "github.com/cloudwego/eino/components/model"
	einoschema "github.com/cloudwego/eino/schema"
	"github.com/google/uuid"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
	"github.com/indulgeback/telos/services/agent-service/internal/repository"
)

type AgentService interface {
	// Agent 管理
	CreateAgent(ctx context.Context, agent *model.AgentConfig) error
	GetAgent(ctx context.Context, id string) (*model.AgentConfig, error)
	ListAgents(ctx context.Context) ([]model.AgentConfig, error)
	UpdateAgent(ctx context.Context, agent *model.AgentConfig) error
	DeleteAgent(ctx context.Context, id string) error

	// 对话
	CreateConversation(ctx context.Context, agentID, userID string) (*model.Conversation, error)
	Chat(ctx context.Context, agentID, conversationID, userMessage string) (string, error)
	GetConversationHistory(ctx context.Context, conversationID string) ([]model.Message, error)

	// 工具管理
	GetAvailableTools(ctx context.Context) ([]*einoschema.ToolInfo, error)
	ExecuteTool(ctx context.Context, toolName, arguments string) (string, error)
}

type agentService struct {
	agentRepo            repository.AgentRepository
	convRepo             repository.ConversationRepository
	toolRepo             repository.ToolRepository
	chatModel            einocompmodel.ChatModel
	toolCallingModel     einocompmodel.ToolCallingChatModel
	toolMgr              *ToolManager
	config               serviceConfig
	reactAgent           *react.Agent
	reactAgentToolInfos  []*einoschema.ToolInfo
}

type serviceConfig struct {
	redisAddr     string
	redisPassword string
	redisDB       int
}

func NewAgentService(
	agentRepo repository.AgentRepository,
	convRepo repository.ConversationRepository,
	toolRepo repository.ToolRepository,
	chatModel einocompmodel.ChatModel,
	toolCallingModel einocompmodel.ToolCallingChatModel,
) AgentService {
	svc := &agentService{
		agentRepo:        agentRepo,
		convRepo:         convRepo,
		toolRepo:         toolRepo,
		chatModel:        chatModel,
		toolCallingModel: toolCallingModel,
		toolMgr:          NewToolManager(),
	}
	return svc
}

// initReactAgent 初始化 ReAct Agent（延迟初始化）
func (s *agentService) initReactAgent(ctx context.Context) error {
	if s.reactAgent != nil {
		return nil
	}

	// 获取所有工具信息
	toolInfos, err := s.toolMgr.GetAllToolInfos(ctx)
	if err != nil {
		return fmt.Errorf("failed to get tool infos: %w", err)
	}

	// 获取所有工具实例
	tools := s.toolMgr.GetAllTools()

	// 将工具绑定到模型
	boundModel, err := s.toolCallingModel.WithTools(toolInfos)
	if err != nil {
		return fmt.Errorf("failed to bind tools: %w", err)
	}

	// 将 InvokableTool 转换为 BaseTool
	baseTools := make([]tool.BaseTool, 0, len(tools))
	for _, t := range tools {
		baseTools = append(baseTools, t)
	}

	// 创建 ReAct Agent
	rAgent, err := react.NewAgent(ctx, &react.AgentConfig{
		ToolCallingModel: boundModel,
		ToolsConfig: compose.ToolsNodeConfig{
			Tools: baseTools,
		},
	})
	if err != nil {
		return fmt.Errorf("failed to create react agent: %w", err)
	}

	s.reactAgent = rAgent
	s.reactAgentToolInfos = toolInfos
	return nil
}

func (s *agentService) CreateAgent(ctx context.Context, agent *model.AgentConfig) error {
	return s.agentRepo.Create(ctx, agent)
}

func (s *agentService) GetAgent(ctx context.Context, id string) (*model.AgentConfig, error) {
	return s.agentRepo.GetByID(ctx, id)
}

func (s *agentService) ListAgents(ctx context.Context) ([]model.AgentConfig, error) {
	return s.agentRepo.List(ctx, false)
}

func (s *agentService) UpdateAgent(ctx context.Context, agent *model.AgentConfig) error {
	return s.agentRepo.Update(ctx, agent)
}

func (s *agentService) DeleteAgent(ctx context.Context, id string) error {
	return s.agentRepo.Delete(ctx, id)
}

func (s *agentService) CreateConversation(ctx context.Context, agentID, userID string) (*model.Conversation, error) {
	conv := &model.Conversation{
		ID:      uuid.New().String(),
		AgentID: agentID,
		UserID:  userID,
		Title:   "新对话",
	}
	if err := s.convRepo.Create(ctx, conv); err != nil {
		return nil, err
	}
	return conv, nil
}

func (s *agentService) Chat(ctx context.Context, agentID, conversationID, userMessage string) (string, error) {
	// 获取 Agent 配置
	agent, err := s.agentRepo.GetByID(ctx, agentID)
	if err != nil {
		return "", fmt.Errorf("failed to get agent: %w", err)
	}

	if !agent.Enabled {
		return "", fmt.Errorf("agent is disabled")
	}

	// 获取对话历史
	var history []model.Message
	if conversationID != "" {
		history, err = s.convRepo.GetMessages(ctx, conversationID, 10)
		if err != nil {
			return "", fmt.Errorf("failed to get conversation history: %w", err)
		}
	}

	// 根据Agent类型选择处理方式
	if agent.Type == model.AgentTypeReAct {
		return s.chatWithTools(ctx, agent, history, userMessage, conversationID)
	}

	// 默认简单对话
	return s.simpleChat(ctx, agent, history, userMessage, conversationID)
}

func (s *agentService) GetConversationHistory(ctx context.Context, conversationID string) ([]model.Message, error) {
	return s.convRepo.GetMessages(ctx, conversationID, 0)
}

// GetAvailableTools 获取可用工具列表
func (s *agentService) GetAvailableTools(ctx context.Context) ([]*einoschema.ToolInfo, error) {
	return s.toolMgr.GetAllToolInfos(ctx)
}

// ExecuteTool 直接执行工具
func (s *agentService) ExecuteTool(ctx context.Context, toolName, arguments string) (string, error) {
	return s.toolMgr.ExecuteTool(ctx, toolName, arguments)
}

// simpleChat 简单对话 (不使用工具)
func (s *agentService) simpleChat(ctx context.Context, agent *model.AgentConfig, history []model.Message, userMessage string, conversationID string) (string, error) {
	messages := s.buildMessages(agent, history, userMessage)

	response, err := s.chatModel.Generate(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}

	// 保存消息
	if conversationID != "" {
		s.saveMessages(ctx, conversationID, userMessage, response.Content)
	}

	return response.Content, nil
}

// chatWithTools 使用 Eino 官方 ReAct Agent 进行带工具的对话
func (s *agentService) chatWithTools(ctx context.Context, agent *model.AgentConfig, history []model.Message, userMessage string, conversationID string) (string, error) {
	// 初始化 ReAct Agent
	if err := s.initReactAgent(ctx); err != nil {
		return "", fmt.Errorf("failed to init react agent: %w", err)
	}

	// 构建消息
	messages := s.buildMessages(agent, history, userMessage)

	// 使用 ReAct Agent 的 Generate 方法（非流式，获取完整响应）
	msg, err := s.reactAgent.Generate(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("react agent generate failed: %w", err)
	}

	// 记录工具调用（用于调试）
	if len(msg.ToolCalls) > 0 {
		var toolCalls []string
		for _, tc := range msg.ToolCalls {
			toolCalls = append(toolCalls, fmt.Sprintf("%s(%s)", tc.Function.Name, tc.Function.Arguments))
		}
		fmt.Printf("[Tool Calls] %s\n", strings.Join(toolCalls, ", "))
	}

	result := msg.Content

	// 保存消息
	if conversationID != "" {
		s.saveMessages(ctx, conversationID, userMessage, result)
	}

	return result, nil
}

// saveMessages 保存用户消息和助手回复
func (s *agentService) saveMessages(ctx context.Context, conversationID, userMessage, assistantMessage string) {
	userMsg := &model.Message{
		ConversationID: conversationID,
		Role:           "user",
		Content:        userMessage,
	}
	s.convRepo.AddMessage(ctx, userMsg)

	assistantMsg := &model.Message{
		ConversationID: conversationID,
		Role:           "assistant",
		Content:        assistantMessage,
	}
	s.convRepo.AddMessage(ctx, assistantMsg)
}

// buildMessages 构建消息上下文
func (s *agentService) buildMessages(agent *model.AgentConfig, history []model.Message, userMessage string) []*einoschema.Message {
	messages := []*einoschema.Message{}

	// 添加系统提示
	if systemPrompt, ok := agent.Config["system_prompt"].(string); ok && systemPrompt != "" {
		messages = append(messages, &einoschema.Message{
			Role:    einoschema.System,
			Content: systemPrompt,
		})
	}

	// 添加历史消息
	for _, msg := range history {
		role := einoschema.User
		switch msg.Role {
		case "assistant":
			role = einoschema.Assistant
		case "system":
			role = einoschema.System
		}
		messages = append(messages, &einoschema.Message{
			Role:    role,
			Content: msg.Content,
		})
	}

	// 添加当前用户消息
	messages = append(messages, &einoschema.Message{
		Role:    einoschema.User,
		Content: userMessage,
	})

	return messages
}
