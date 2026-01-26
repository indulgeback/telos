// Package tool 提供数据驱动的工具包装器
//
// DynamicToolWrapper 将数据库中的工具定义包装为 Eino BaseTool，
// 使得工具定义可以被动态加载和执行，而无需编写代码。
package tool

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/schema"
	"github.com/indulgeback/telos/services/agent-service/internal/model"
)

// DynamicToolWrapper 将数据库中的工具定义包装为 Eino BaseTool
//
// 实现 Eino 的 InvokableTool 接口，将工具调用转发给 GenericToolExecutor 执行。
type DynamicToolWrapper struct {
	tool     *model.Tool
	executor *GenericToolExecutor
	agentID  string
	userID   string
}

// NewDynamicToolWrapper 创建动态工具包装器
func NewDynamicToolWrapper(toolDef *model.Tool, executor *GenericToolExecutor) *DynamicToolWrapper {
	return &DynamicToolWrapper{
		tool:     toolDef,
		executor: executor,
	}
}

// SetContext 设置 Agent 和 User 上下文
func (w *DynamicToolWrapper) SetContext(agentID, userID string) *DynamicToolWrapper {
	w.agentID = agentID
	w.userID = userID
	return w
}

// Info 返回工具信息（Eino BaseTool 接口）
func (w *DynamicToolWrapper) Info(ctx context.Context) (*schema.ToolInfo, error) {
	// 创建必填参数的快速查找 map
	requiredMap := make(map[string]bool)
	for _, reqName := range w.tool.Parameters.Required {
		requiredMap[reqName] = true
	}

	// 将 JSON Schema 参数转换为 Eino ParameterInfo
	params := make(map[string]*schema.ParameterInfo)
	for name, param := range w.tool.Parameters.Properties {
		params[name] = &schema.ParameterInfo{
			Type:     schema.DataType(param.Type),
			Required: requiredMap[name], // 从 ParametersDef.Required 数组判断
			Desc:     param.Description,
			Enum:     param.Enum,
		}
	}

	return &schema.ToolInfo{
		Name:        w.tool.Name,
		Desc:        w.tool.Description,
		ParamsOneOf: schema.NewParamsOneOfByParams(params),
	}, nil
}

// InvokableRun 执行工具（Eino InvokableTool 接口）
func (w *DynamicToolWrapper) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
	// 解析参数
	var params map[string]any
	if err := json.Unmarshal([]byte(argumentsInJSON), &params); err != nil {
		return "", fmt.Errorf("解析参数失败: %w", err)
	}

	// 执行工具
	result, err := w.executor.Execute(ctx, &ExecuteRequest{
		Tool:       w.tool,
		Parameters: params,
		AgentID:    w.agentID,
		UserID:     w.userID,
	})

	if err != nil {
		return "", err
	}

	if !result.Success {
		return "", fmt.Errorf("工具执行失败: %s", result.ErrorMessage)
	}

	// 序列化结果
	resultJSON, err := json.Marshal(result.Data)
	if err != nil {
		return "", fmt.Errorf("序列化结果失败: %w", err)
	}

	return string(resultJSON), nil
}

// StreamableRun 流式执行
//
// 对于非流式工具，将同步执行的结果包装成流返回。
// ReAct Agent 在流式模式下会调用此方法。
func (w *DynamicToolWrapper) StreamableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (*schema.StreamReader[string], error) {
	// 记录工具调用（用于调试）
	fmt.Printf("[StreamableRun] 工具=%s 参数=%s\n", w.tool.Name, argumentsInJSON)

	// 先执行工具（同步）
	result, err := w.InvokableRun(ctx, argumentsInJSON, opts...)
	if err != nil {
		fmt.Printf("[StreamableRun] 工具执行失败: %v\n", err)
		return nil, err
	}

	fmt.Printf("[StreamableRun] 工具执行成功 结果=%s\n", result)

	// 使用 schema.Pipe 创建流 reader 和 writer
	reader, writer := schema.Pipe[string](1)

	// 在 goroutine 中发送结果并关闭 writer
	go func() {
		defer writer.Close()
		writer.Send(result, nil)
	}()

	return reader, nil
}
