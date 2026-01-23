// Package tool 提供数据驱动的工具执行能力
//
// 包含：
//   - GenericToolExecutor: 通用工具执行器
//   - ExecuteRequest: 执行请求
//   - ExecuteResult: 执行结果
package tool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"text/template"
	"time"

	"github.com/indulgeback/telos/services/agent-service/internal/model"
)

// GenericToolExecutor 通用工具执行器
//
// 根据数据库中的工具定义动态执行工具。支持：
//   - URL 模板替换（{param} 占位符）
//   - 请求体模板渲染
//   - 多种认证方式（Bearer Token, API Key, Basic Auth）
//   - 响应 JSONPath 提取和格式化
type GenericToolExecutor struct {
	httpClient *http.Client
}

// NewGenericToolExecutor 创建新的通用工具执行器
func NewGenericToolExecutor() *GenericToolExecutor {
	return &GenericToolExecutor{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ExecuteRequest 执行工具请求
type ExecuteRequest struct {
	Tool       *model.Tool
	Parameters map[string]any
	AgentID    string
	UserID     string
}

// ExecuteResult 执行结果
type ExecuteResult struct {
	Success      bool
	Data         any
	ErrorMessage string
	DurationMs   int
	StatusCode   int
}

// Execute 执行工具
func (e *GenericToolExecutor) Execute(ctx context.Context, req *ExecuteRequest) (*ExecuteResult, error) {
	startTime := time.Now()

	// 0. 检查是否为内部测试工具（internal://）
	if strings.HasPrefix(req.Tool.Endpoint.URLTemplate, "internal://") {
		return e.executeInternalTool(ctx, req)
	}

	// 1. 构建请求 URL
	fullURL, err := e.buildURL(req.Tool.Endpoint.URLTemplate, req.Parameters)
	if err != nil {
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("构建 URL 失败: %v", err),
		}, err
	}

	// 2. 构建请求体
	var bodyReader io.Reader
	if req.Tool.Endpoint.BodyTemplate != "" {
		bodyJSON, err := e.renderTemplate(req.Tool.Endpoint.BodyTemplate, req.Parameters)
		if err != nil {
			return &ExecuteResult{
				Success:      false,
				ErrorMessage: fmt.Sprintf("渲染请求体模板失败: %v", err),
			}, err
		}
		bodyReader = bytes.NewReader(bodyJSON)
	}

	// 3. 创建 HTTP 请求
	httpReq, err := http.NewRequestWithContext(ctx, req.Tool.Endpoint.Method, fullURL, bodyReader)
	if err != nil {
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("创建 HTTP 请求失败: %v", err),
		}, err
	}

	// 4. 设置请求头
	for key, value := range req.Tool.Endpoint.Headers {
		httpReq.Header.Set(key, value)
	}
	if bodyReader != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}

	// 5. 设置认证
	if req.Tool.Endpoint.Auth != nil {
		if err := e.setAuth(httpReq, req.Tool.Endpoint.Auth); err != nil {
			return &ExecuteResult{
				Success:      false,
				ErrorMessage: fmt.Sprintf("设置认证失败: %v", err),
			}, err
		}
	}

	// 6. 设置超时
	timeout := req.Tool.Endpoint.Timeout
	if timeout > 0 {
		ctx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
		defer cancel()
		httpReq = httpReq.WithContext(ctx)
	}

	// 7. 执行请求
	resp, err := e.httpClient.Do(httpReq)
	if err != nil {
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("HTTP 请求失败: %v", err),
		}, err
	}
	defer resp.Body.Close()

	// 8. 读取响应
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("读取响应失败: %v", err),
			StatusCode:   resp.StatusCode,
		}, err
	}

	// 9. 检查 HTTP 状态码
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("HTTP 错误: %d - %s", resp.StatusCode, string(respBody)),
			StatusCode:   resp.StatusCode,
		}, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	// 10. 解析响应
	var resultData any
	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "json") || strings.Contains(contentType, "application/json") {
		if err := json.Unmarshal(respBody, &resultData); err != nil {
			// JSON 解析失败，返回原始文本
			resultData = map[string]any{
				"content": string(respBody),
			}
		}
	} else {
		resultData = map[string]any{
			"content": string(respBody),
		}
	}

	// 11. 应用响应转换
	if req.Tool.ResponseTransform.Extract != "" {
		resultData = e.extractJSONPath(resultData, req.Tool.ResponseTransform.Extract)
	}

	duration := time.Since(startTime)
	return &ExecuteResult{
		Success:    true,
		Data:       resultData,
		DurationMs: int(duration.Milliseconds()),
		StatusCode: resp.StatusCode,
	}, nil
}

// buildURL 构建请求 URL，支持 {param} 占位符
func (e *GenericToolExecutor) buildURL(templateURL string, params map[string]any) (string, error) {
	urlStr := templateURL

	// 替换路径参数
	for key, value := range params {
		placeholder := fmt.Sprintf("{%s}", key)
		if strings.Contains(urlStr, placeholder) {
			urlStr = strings.ReplaceAll(urlStr, placeholder, fmt.Sprintf("%v", value))
		}
	}

	// 解析并添加查询参数
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return "", err
	}

	queryParams := parsedURL.Query()
	for key, value := range params {
		// 跳过已使用的路径参数
		placeholder := fmt.Sprintf("{%s}", key)
		if !strings.Contains(templateURL, placeholder) {
			queryParams.Set(key, fmt.Sprintf("%v", value))
		}
	}
	parsedURL.RawQuery = queryParams.Encode()

	return parsedURL.String(), nil
}

// renderTemplate 渲染模板
func (e *GenericToolExecutor) renderTemplate(tmpl string, data map[string]any) ([]byte, error) {
	t, err := template.New("body").Parse(tmpl)
	if err != nil {
		return nil, fmt.Errorf("解析模板失败: %w", err)
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return nil, fmt.Errorf("执行模板失败: %w", err)
	}

	return buf.Bytes(), nil
}

// setAuth 设置认证
func (e *GenericToolExecutor) setAuth(req *http.Request, auth *model.AuthConfig) error {
	switch auth.Type {
	case model.AuthTypeBearer:
		token := os.Getenv(auth.TokenEnv)
		if token == "" {
			return fmt.Errorf("未找到环境变量: %s", auth.TokenEnv)
		}
		req.Header.Set("Authorization", "Bearer "+token)

	case model.AuthTypeAPIKey:
		if auth.APIKey != "" {
			req.Header.Set("X-API-Key", auth.APIKey)
		} else if auth.TokenEnv != "" {
			key := os.Getenv(auth.TokenEnv)
			if key == "" {
				return fmt.Errorf("未找到环境变量: %s", auth.TokenEnv)
			}
			req.Header.Set("X-API-Key", key)
		}

	case model.AuthTypeBasic:
		if auth.Username != "" || auth.Password != "" {
			req.SetBasicAuth(auth.Username, auth.Password)
		}

	case model.AuthTypeNone:
		// 无认证
	}

	return nil
}

// extractJSONPath 从响应中提取数据（简化版 JSONPath）
func (e *GenericToolExecutor) extractJSONPath(data any, path string) any {
	if path == "$" || path == "" {
		return data
	}

	// 简化实现：支持 $.field.subfield 格式
	path = strings.TrimPrefix(path, "$.")
	parts := strings.Split(path, ".")

	current := data
	for _, part := range parts {
		if m, ok := current.(map[string]any); ok {
			current = m[part]
		} else {
			// 路径无效，返回原始数据
			return data
		}
	}

	return current
}

// executeInternalTool 执行内部测试工具（无需 API 调用）
func (e *GenericToolExecutor) executeInternalTool(ctx context.Context, req *ExecuteRequest) (*ExecuteResult, error) {
	// 提取工具名称（去掉 internal:// 前缀）
	toolPath := strings.TrimPrefix(req.Tool.Endpoint.URLTemplate, "internal://")

	switch toolPath {
	case "calculator":
		return e.executeCalculator(ctx, req)
	case "time":
		return e.executeGetCurrentTime(ctx, req)
	default:
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("未知的内部工具: %s", toolPath),
		}, fmt.Errorf("unknown internal tool: %s", toolPath)
	}
}

// executeCalculator 执行计算器工具
func (e *GenericToolExecutor) executeCalculator(ctx context.Context, req *ExecuteRequest) (*ExecuteResult, error) {
	startTime := time.Now()

	// 获取参数
	operation, _ := req.Parameters["operation"].(string)
	aVal, aOk := req.Parameters["a"].(float64)
	bVal, bOk := req.Parameters["b"].(float64)

	// 尝试从 int64 转换
	if !aOk {
		if intVal, ok := req.Parameters["a"].(int64); ok {
			aVal = float64(intVal)
			aOk = true
		}
	}
	if !bOk {
		if intVal, ok := req.Parameters["b"].(int64); ok {
			bVal = float64(intVal)
			bOk = true
		}
	}

	if !aOk || !bOk {
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: "参数 a 和 b 必须是数字",
		}, fmt.Errorf("invalid parameters")
	}

	// 执行计算
	var result float64
	var operationSymbol string

	switch operation {
	case "add":
		result = aVal + bVal
		operationSymbol = "+"
	case "subtract":
		result = aVal - bVal
		operationSymbol = "-"
	case "multiply":
		result = aVal * bVal
		operationSymbol = "×"
	case "divide":
		if bVal == 0 {
			return &ExecuteResult{
				Success:      false,
				ErrorMessage: "除数不能为零",
			}, fmt.Errorf("division by zero")
		}
		result = aVal / bVal
		operationSymbol = "÷"
	default:
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("未知的运算类型: %s", operation),
		}, fmt.Errorf("unknown operation: %s", operation)
	}

	duration := time.Since(startTime)

	return &ExecuteResult{
		Success: true,
		Data: map[string]any{
			"operation": operation,
			"formula":   fmt.Sprintf("%.2f %s %.2f = %.2f", aVal, operationSymbol, bVal, result),
			"a":         aVal,
			"b":         bVal,
			"result":    result,
		},
		DurationMs: int(duration.Milliseconds()),
	}, nil
}

// executeGetCurrentTime 执行获取当前时间工具
func (e *GenericToolExecutor) executeGetCurrentTime(ctx context.Context, req *ExecuteRequest) (*ExecuteResult, error) {
	startTime := time.Now()

	// 获取时区参数，默认 Asia/Shanghai
	timezone := "Asia/Shanghai"
	if tz, ok := req.Parameters["timezone"].(string); ok && tz != "" {
		timezone = tz
	}

	// 加载时区
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return &ExecuteResult{
			Success:      false,
			ErrorMessage: fmt.Sprintf("无效的时区: %s", timezone),
		}, err
	}

	// 获取当前时间
	now := time.Now().In(loc)

	duration := time.Since(startTime)

	return &ExecuteResult{
		Success: true,
		Data: map[string]any{
			"timezone":  timezone,
			"datetime":  now.Format("2006-01-02 15:04:05"),
			"date":      now.Format("2006-01-02"),
			"time":      now.Format("15:04:05"),
			"weekday":   now.Weekday().String(),
		},
		DurationMs: int(duration.Milliseconds()),
	}, nil
}
