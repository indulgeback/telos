package service

import (
	"context"
	"fmt"
	"io"

	"github.com/cloudwego/eino-ext/components/model/deepseek"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

// ChatService 聊天服务
type ChatService struct {
	chatModel model.ToolCallingChatModel
	config    ModelConfig
}

// ModelConfig 模型配置
type ModelConfig struct {
	APIKey string
	Model  string
}

// Message 聊天消息
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// NewChatService 创建聊天服务
func NewChatService(config ModelConfig) (*ChatService, error) {
	// 使用 Eino-ext 的 DeepSeek 组件
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

// ChatStream 流式聊天
func (s *ChatService) ChatStream(ctx context.Context, messages []Message) (<-chan string, <-chan error) {
	contentChan := make(chan string)
	errChan := make(chan error, 1)

	go func() {
		defer close(contentChan)
		defer close(errChan)

		// 转换为 Eino 消息格式
		einoMessages := make([]*schema.Message, len(messages))
		for i, msg := range messages {
			var role schema.RoleType
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

		// 调用流式聊天
		streamReader, err := s.chatModel.Stream(ctx, einoMessages)
		if err != nil {
			errChan <- fmt.Errorf("调用聊天模型失败: %w", err)
			return
		}

		// 读取流式响应，发送增量内容
		for {
			chunk, err := streamReader.Recv()
			if err == io.EOF {
				return
			}
			if err != nil {
				errChan <- fmt.Errorf("读取流式响应失败: %w", err)
				return
			}

			if chunk.Content != "" {
				// 发送增量内容
				contentChan <- chunk.Content
			}
		}
	}()

	return contentChan, errChan
}

// Chat 非流式聊天
func (s *ChatService) Chat(ctx context.Context, messages []Message) (string, error) {
	// 转换为 Eino 消息格式
	einoMessages := make([]*schema.Message, len(messages))
	for i, msg := range messages {
		var role schema.RoleType
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

	// 调用聊天模型
	resp, err := s.chatModel.Generate(ctx, einoMessages)
	if err != nil {
		return "", fmt.Errorf("调用聊天模型失败: %w", err)
	}

	return resp.Content, nil
}
