package tool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/schema"
)

// HTTPTool HTTP 调用工具
type HTTPTool struct {
	name        string
	description string
	client      *http.Client
}

// NewHTTPTool 创建 HTTP 工具
func NewHTTPTool() tool.InvokableTool {
	return &HTTPTool{
		name:        "http_call",
		description: "发送 HTTP 请求到指定的 URL，支持 GET 和 POST 方法",
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (t *HTTPTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
	return &schema.ToolInfo{
		Name: t.name,
		Desc: t.description,
		ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
			"url": {
				Type:     schema.String,
				Desc:     "请求的 URL 地址",
				Required: true,
			},
			"method": {
				Type:     schema.String,
				Desc:     "HTTP 方法 (GET 或 POST)",
				Required: false,
			},
			"body": {
				Type:     schema.Object,
				Desc:     "请求体 (JSON 对象)",
				Required: false,
			},
		}),
	}, nil
}

func (t *HTTPTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
	var params map[string]any
	if err := json.Unmarshal([]byte(argumentsInJSON), &params); err != nil {
		return "", fmt.Errorf("failed to parse arguments: %w", err)
	}

	url, ok := params["url"].(string)
	if !ok {
		return "", fmt.Errorf("url is required")
	}

	method := "GET"
	if m, ok := params["method"].(string); ok {
		method = m
	}

	var bodyReader io.Reader
	if b, ok := params["body"]; ok && b != nil {
		bodyBytes, err := json.Marshal(b)
		if err != nil {
			return "", fmt.Errorf("failed to marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := t.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	result := map[string]any{
		"status_code": resp.StatusCode,
		"body":        string(respBody),
	}

	resultJSON, _ := json.Marshal(result)
	return string(resultJSON), nil
}

// DatabaseTool 数据库查询工具 (简化示例)
type DatabaseTool struct {
	name        string
	description string
}

// NewDatabaseTool 创建数据库工具
func NewDatabaseTool() tool.InvokableTool {
	return &DatabaseTool{
		name:        "db_query",
		description: "执行数据库查询语句",
	}
}

func (t *DatabaseTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
	return &schema.ToolInfo{
		Name: t.name,
		Desc: t.description,
		ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
			"query": {
				Type:     schema.String,
				Desc:     "SQL 查询语句",
				Required: true,
			},
		}),
	}, nil
}

func (t *DatabaseTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
	var params map[string]any
	if err := json.Unmarshal([]byte(argumentsInJSON), &params); err != nil {
		return "", fmt.Errorf("failed to parse arguments: %w", err)
	}

	query, ok := params["query"].(string)
	if !ok {
		return "", fmt.Errorf("query is required")
	}

	// 实际实现应该连接数据库执行查询
	result := map[string]any{
		"query":  query,
		"result": "Database query execution is not implemented yet",
	}

	resultJSON, _ := json.Marshal(result)
	return string(resultJSON), nil
}
