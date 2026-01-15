// Package service 提供聊天服务的业务逻辑层实现
//
// 该文件实现了与 DeepSeek AI 模型的集成，提供：
//   - 流式聊天（ChatStream）：实时返回生成内容
//   - 非流式聊天（Chat）：等待完整响应后返回
//
// 使用 Cloudwego Eino 框架进行模型调用，支持灵活的模型切换。
package service

import (
	"context"
	"fmt"
	"io"

	"github.com/cloudwego/eino-ext/components/model/deepseek"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

// ========== 类型定义 ==========

// ChatService 聊天服务
//
// 封装了与 AI 模型的交互逻辑，支持流式和非流式两种模式。
type ChatService struct {
	chatModel model.ToolCallingChatModel // Eino 框架的聊天模型实例
	config    ModelConfig                // 模型配置
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
