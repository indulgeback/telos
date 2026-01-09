package model

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino-ext/components/model/ark"
	"github.com/cloudwego/eino-ext/components/model/deepseek"
	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/indulgeback/telos/services/agent-service/internal/config"
)

// NewChatModel 创建 ChatModel 实例
func NewChatModel(ctx context.Context, cfg config.Config) (model.ChatModel, error) {
	switch cfg.LLMProvider {
	case "openai":
		return newOpenAIModel(ctx, cfg)
	case "ark":
		return newArkModel(ctx, cfg)
	case "deepseek":
		return newDeepSeekModel(ctx, cfg)
	default:
		return nil, fmt.Errorf("unsupported model provider: %s", cfg.LLMProvider)
	}
}

// NewToolCallingChatModel 创建支持工具调用的 ChatModel 实例
func NewToolCallingChatModel(ctx context.Context, cfg config.Config) (model.ToolCallingChatModel, error) {
	switch cfg.LLMProvider {
	case "openai":
		m, err := newOpenAIModel(ctx, cfg)
		if err != nil {
			return nil, err
		}
		// OpenAI 模型本身就是 ToolCallingChatModel
		if tcm, ok := m.(model.ToolCallingChatModel); ok {
			return tcm, nil
		}
		return nil, fmt.Errorf("openai model does not support tool calling")
	case "ark":
		m, err := newArkModel(ctx, cfg)
		if err != nil {
			return nil, err
		}
		if tcm, ok := m.(model.ToolCallingChatModel); ok {
			return tcm, nil
		}
		return nil, fmt.Errorf("ark model does not support tool calling")
	case "deepseek":
		m, err := newDeepSeekModel(ctx, cfg)
		if err != nil {
			return nil, err
		}
		if tcm, ok := m.(model.ToolCallingChatModel); ok {
			return tcm, nil
		}
		return nil, fmt.Errorf("deepseek model does not support tool calling")
	default:
		return nil, fmt.Errorf("unsupported model provider: %s", cfg.LLMProvider)
	}
}

func newOpenAIModel(ctx context.Context, cfg config.Config) (model.ChatModel, error) {
	return openai.NewChatModel(ctx, &openai.ChatModelConfig{
		APIKey: cfg.LLMAPIKey,
		Model:  cfg.LLMModel,
	})
}

func newArkModel(ctx context.Context, cfg config.Config) (model.ChatModel, error) {
	return ark.NewChatModel(ctx, &ark.ChatModelConfig{
		APIKey: cfg.LLMArkAPIKey,
		Model:  cfg.LLMModel,
	})
}

func newDeepSeekModel(ctx context.Context, cfg config.Config) (model.ChatModel, error) {
	return deepseek.NewChatModel(ctx, &deepseek.ChatModelConfig{
		APIKey: cfg.LLMAPIKey,
		Model:  cfg.LLMModel,
	})
}
