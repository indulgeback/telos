// Package service 提供聊天服务的业务逻辑层实现
//
// 该文件实现了与 DeepSeek AI 模型的集成，提供：
//   - 流式聊天（ChatStream）：实时返回生成内容
//   - 非流式聊天（Chat）：等待完整响应后返回
//   - 工具调用聊天（ChatStreamWithTools）：支持 AI Agent 调用外部工具
//
// 使用 Cloudwego Eino 框架进行模型调用，支持灵活的模型切换。
package service

import (
	"context"
	"fmt"
	"io"

	"github.com/cloudwego/eino-ext/components/model/deepseek"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/flow/agent/react"
	"github.com/cloudwego/eino/schema"
	"github.com/indulgeback/telos/pkg/tlog"
)

// ========== 类型定义 ==========

// ChatService 聊天服务
//
// 封装了与 AI 模型的交互逻辑，支持流式和非流式两种模式。
// 支持工具调用（Tool Calling），使 AI Agent 能够调用外部工具。
type ChatService struct {
	chatModel   model.ToolCallingChatModel // Eino 框架的聊天模型实例
	config      ModelConfig                // 模型配置
	toolService ToolService                // 工具服务（可选，用于工具调用）
}

// ModelConfig 模型配置
//
// 用于初始化聊天模型的必要参数。
type ModelConfig struct {
	APIKey string // DeepSeek API 密钥
	Model  string // 模型名称（如 deepseek-chat、deepseek-coder）
}

// Message 聊天消息
//
// 表示对话中的一条消息，包含角色和内容。
type Message struct {
	Role    string `json:"role"`    // 消息角色：system/user/assistant
	Content string `json:"content"` // 消息内容
}

// ========== 构造函数 ==========

// NewChatService 创建聊天服务实例
//
// 初始化 DeepSeek 聊天模型，需要提供有效的 API Key 和模型名称。
//
// 参数：
//   - config: 模型配置，包含 API Key 和模型名称
//
// 返回：
//   - *ChatService: 聊天服务实例
//   - error: 模型初始化失败时返回错误
func NewChatService(config ModelConfig) (*ChatService, error) {
	// 使用 Eino-ext 的 DeepSeek 组件创建聊天模型
	chatModel, err := deepseek.NewChatModel(context.Background(), &deepseek.ChatModelConfig{
		APIKey: config.APIKey,
		Model:  config.Model,
	})
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %w", err)
	}

	return &ChatService{
		chatModel: chatModel,
		config:    config,
	}, nil
}

// NewChatServiceWithTools 创建支持工具调用的聊天服务实例
//
// 与 NewChatService 类似，但附加了工具服务支持，
// 使 AI Agent 能够动态调用外部工具。
//
// 参数：
//   - config: 模型配置
//   - toolService: 工具服务实例
//
// 返回：
//   - *ChatService: 聊天服务实例
//   - error: 模型初始化失败时返回错误
func NewChatServiceWithTools(config ModelConfig, toolService ToolService) (*ChatService, error) {
	chatModel, err := deepseek.NewChatModel(context.Background(), &deepseek.ChatModelConfig{
		APIKey: config.APIKey,
		Model:  config.Model,
	})
	if err != nil {
		return nil, fmt.Errorf("创建聊天模型失败: %w", err)
	}

	return &ChatService{
		chatModel:   chatModel,
		config:      config,
		toolService: toolService,
	}, nil
}

// SetToolService 设置工具服务
//
// 允许在创建 ChatService 后动态设置工具服务。
//
// 参数：
//   - toolService: 工具服务实例
func (s *ChatService) SetToolService(toolService ToolService) {
	s.toolService = toolService
}

// ========== 流式聊天 ==========

// ChatStream 流式聊天
//
// 以流式方式调用 AI 模型，实时返回生成的内容。
// 适用于需要实时反馈的场景，如对话界面。
//
// 工作流程：
//   1. 将应用层消息转换为 Eino 消息格式
//   2. 调用模型的 Stream 方法
//   3. 逐块读取响应并通过通道发送
//   4. 处理完成或错误时关闭通道
//
// 参数：
//   - ctx: 请求上下文，支持取消操作
//   - messages: 对话消息历史（包含 system/user/assistant 消息）
//
// 返回：
//   - <-chan string: 内容通道，接收增量生成的文本
//   - <-chan error: 错误通道，接收异步错误
func (s *ChatService) ChatStream(ctx context.Context, messages []Message) (<-chan string, <-chan error) {
	contentChan := make(chan string)
	errChan := make(chan error, 1)

	// 在 goroutine 中执行流式调用
	go func() {
		defer close(contentChan)
		defer close(errChan)

		// ========== 1. 转换为 Eino 消息格式 ==========
		einoMessages := make([]*schema.Message, len(messages))
		for i, msg := range messages {
			var role schema.RoleType
			// 映射角色：system -> System, assistant -> Assistant, 其他 -> User
			switch msg.Role {
			case "system":
				role = schema.System
			case "assistant":
				role = schema.Assistant
			default:
				role = schema.User
			}
			einoMessages[i] = &schema.Message{
				Role:    role,
				Content: msg.Content,
			}
		}

		// ========== 2. 调用流式聊天 ==========
		streamReader, err := s.chatModel.Stream(ctx, einoMessages)
		if err != nil {
			errChan <- fmt.Errorf("调用聊天模型失败: %w", err)
			return
		}

		// ========== 3. 读取流式响应，发送增量内容 ==========
		for {
			chunk, err := streamReader.Recv()
			if err == io.EOF {
				// 流正常结束
				return
			}
			if err != nil {
				// 流式读取出错
				errChan <- fmt.Errorf("读取流式响应失败: %w", err)
				return
			}

			// 发送增量内容到通道
			if chunk.Content != "" {
				contentChan <- chunk.Content
			}
		}
	}()

	return contentChan, errChan
}

// ========== 非流式聊天 ==========

// Chat 非流式聊天
//
// 以同步方式调用 AI 模型，等待完整响应后返回。
// 适用于不需要实时反馈的场景，如后台处理。
//
// 参数：
//   - ctx: 请求上下文，支持取消操作
//   - messages: 对话消息历史
//
// 返回：
//   - string: 完整的 AI 响应内容
//   - error: 调用失败时返回错误
func (s *ChatService) Chat(ctx context.Context, messages []Message) (string, error) {
	// ========== 1. 转换为 Eino 消息格式 ==========
	einoMessages := make([]*schema.Message, len(messages))
	for i, msg := range messages {
		var role schema.RoleType
		// 映射角色：system -> System, assistant -> Assistant, 其他 -> User
		switch msg.Role {
		case "system":
			role = schema.System
		case "assistant":
			role = schema.Assistant
		default:
			role = schema.User
		}
		einoMessages[i] = &schema.Message{
			Role:    role,
			Content: msg.Content,
		}
	}

	// ========== 2. 调用聊天模型 ==========
	resp, err := s.chatModel.Generate(ctx, einoMessages)
	if err != nil {
		return "", fmt.Errorf("调用聊天模型失败: %w", err)
	}

	return resp.Content, nil
}

// ========== 工具调用聊天 ==========

// ChatRequestWithTools 带工具调用的聊天请求
type ChatRequestWithTools struct {
	AgentID      string   // Agent ID
	UserID       string   // 用户 ID
	Message      string   // 用户消息
	SystemPrompt string   // 系统提示词
}

// ChatStreamWithTools 支持 Tool Calling 的流式聊天
//
// 与 ChatStream 类似，但支持 AI Agent 动态调用外部工具。
// 根据指定的 Agent ID 从数据库加载其配置的工具，
// 然后使用 Eino 的 ReAct Agent 让 LLM 决定何时调用工具。
//
// 工作流程：
//   1. 根据 Agent ID 获取 Agent 配置的工具列表
//   2. 创建 ReAct Agent，绑定工具
//   3. 调用 Agent 的 Stream 方法
//   4. Agent 自动处理：LLM 决定 → 工具调用 → 结果反馈 → 最终响应
//
// 参数：
//   - ctx: 请求上下文
//   - req: 聊天请求（包含 Agent ID、用户 ID、消息）
//
// 返回：
//   - <-chan string: 内容通道，接收增量生成的文本
//   - <-chan error: 错误通道，接收异步错误
func (s *ChatService) ChatStreamWithTools(ctx context.Context, req ChatRequestWithTools) (<-chan string, <-chan error) {
	contentChan := make(chan string, 16)
	errChan := make(chan error, 1)

	go func() {
		defer close(contentChan)
		defer close(errChan)

		// 检查工具服务是否已设置
		if s.toolService == nil {
			errChan <- fmt.Errorf("工具服务未设置，请使用 SetToolService 或 NewChatServiceWithTools")
			return
		}

		// ========== 1. 获取 Agent 的工具 ==========
		einoTools, err := s.toolService.GetEinoToolsForAgent(ctx, req.AgentID)
		if err != nil {
			errChan <- fmt.Errorf("获取工具失败: %w", err)
			return
		}

		tlog.Info("获取到工具", "count", len(einoTools), "agentID", req.AgentID)

		// ========== 2. 构建初始消息 ==========
		messages := []*schema.Message{}

		// 添加系统提示词（如果有）
		if req.SystemPrompt != "" {
			messages = append(messages, &schema.Message{
				Role:    schema.System,
				Content: req.SystemPrompt,
			})
		}

		// 添加用户消息
		messages = append(messages, &schema.Message{
			Role:    schema.User,
			Content: req.Message,
		})

		// ========== 3. 如果有工具，使用 ReAct Agent ==========
		if len(einoTools) > 0 {
			// 将 map 转换为 slice
			tools := make([]tool.BaseTool, 0, len(einoTools))
			for _, t := range einoTools {
				tools = append(tools, t)
			}

			// 创建 ReAct Agent
			agentConfig := &react.AgentConfig{
				ToolCallingModel: s.chatModel,
				ToolsConfig: compose.ToolsNodeConfig{
					Tools: tools,
				},
				MaxStep: 10, // 最多执行 10 轮工具调用
			}

			agent, err := react.NewAgent(ctx, agentConfig)
			if err != nil {
				errChan <- fmt.Errorf("创建 ReAct Agent 失败: %w", err)
				return
			}

			tlog.Info("ReAct Agent 创建成功", "tools", len(tools), "agent_id", req.AgentID)

			// 使用 Generate 方法获取完整响应
			response, err := agent.Generate(ctx, messages)
			if err != nil {
				tlog.Error("调用 Agent 失败", "error", err.Error(), "agent_id", req.AgentID)
				errChan <- fmt.Errorf("调用 Agent 失败: %w", err)
				return
			}

			// 记录工具调用
			if len(response.ToolCalls) > 0 {
				for i, tc := range response.ToolCalls {
					tlog.Info("工具调用", "index", i, "name", tc.Function.Name, "agent_id", req.AgentID)
				}
			}

			// 将完整响应发送到通道
			if response.Content != "" {
				contentChan <- response.Content
			}
		} else {
			// 无工具时，使用普通流式聊天
			streamReader, err := s.chatModel.Stream(ctx, messages)
			if err != nil {
				errChan <- fmt.Errorf("调用聊天模型失败: %w", err)
				return
			}

			for {
				chunk, err := streamReader.Recv()
				if err == io.EOF {
					break
				}
				if err != nil {
					errChan <- fmt.Errorf("读取流式响应失败: %w", err)
					return
				}

				if chunk.Content != "" {
					contentChan <- chunk.Content
				}
			}
		}
	}()

	return contentChan, errChan
}
