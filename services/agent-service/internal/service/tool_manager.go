package service

import (
	"context"
	"fmt"

	einotool "github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/schema"
	"github.com/indulgeback/telos/services/agent-service/pkg/eino/tool"
)

// ToolManager 工具管理器
type ToolManager struct {
	tools map[string]einotool.InvokableTool
}

// NewToolManager 创建工具管理器
func NewToolManager() *ToolManager {
	tm := &ToolManager{
		tools: make(map[string]einotool.InvokableTool),
	}

	// 注册内置工具
	tm.RegisterBuiltInTools()

	return tm
}

// RegisterTool 注册工具
func (tm *ToolManager) RegisterTool(name string, t einotool.InvokableTool) {
	tm.tools[name] = t
}

// GetTool 获取工具
func (tm *ToolManager) GetTool(name string) (einotool.InvokableTool, bool) {
	t, ok := tm.tools[name]
	return t, ok
}

// GetAllToolInfos 获取所有工具信息
func (tm *ToolManager) GetAllToolInfos(ctx context.Context) ([]*schema.ToolInfo, error) {
	infos := make([]*schema.ToolInfo, 0, len(tm.tools))
	for _, t := range tm.tools {
		info, err := t.Info(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to get tool info: %w", err)
		}
		infos = append(infos, info)
	}
	return infos, nil
}

// ExecuteTool 执行工具
func (tm *ToolManager) ExecuteTool(ctx context.Context, toolName string, arguments string, opts ...einotool.Option) (string, error) {
	t, ok := tm.tools[toolName]
	if !ok {
		return "", fmt.Errorf("tool not found: %s", toolName)
	}

	return t.InvokableRun(ctx, arguments, opts...)
}

// GetAllTools 获取所有工具实例（用于 react.NewAgent）
func (tm *ToolManager) GetAllTools() []einotool.InvokableTool {
	tools := make([]einotool.InvokableTool, 0, len(tm.tools))
	for _, t := range tm.tools {
		tools = append(tools, t)
	}
	return tools
}

// RegisterBuiltInTools 注册内置工具
func (tm *ToolManager) RegisterBuiltInTools() {
	// HTTP 调用工具
	tm.RegisterTool("http_call", tool.NewHTTPTool())

	// 计算器工具
	tm.RegisterTool("calculator", &tool.CalculatorTool{})

	// 天气工具 (示例)
	tm.RegisterTool("get_weather", &tool.WeatherTool{})
}
