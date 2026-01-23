// Package model 定义工具插件系统的数据模型
//
// 包含：
//   - ToolType: 工具类型（invokable/streamable）
//   - AuthType: 认证类型（bearer/api_key/basic/none）
//   - Tool: 工具定义模型
//   - EndpointConfig: HTTP 端点配置
//   - AuthConfig: 认证配置
//   - ParameterDef: 参数定义（JSON Schema 格式）
//   - ParametersDef: 参数定义容器
//   - ResponseTransform: 响应转换规则
//   - RateLimitConfig: 速率限制配置
//   - JSONB: PostgreSQL JSONB 类型
//   - StringArray: PostgreSQL TEXT[] 类型
package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// ToolType 工具类型，对应 Eino 的 InvokableTool 和 StreamableTool
type ToolType string

const (
	// ToolTypeInvokable 同步调用工具
	ToolTypeInvokable ToolType = "invokable"

	// ToolTypeStreamable 流式调用工具
	ToolTypeStreamable ToolType = "streamable"
)

// AuthType 认证类型
type AuthType string

const (
	// AuthTypeNone 无需认证
	AuthTypeNone AuthType = "none"

	// AuthTypeBearer Bearer Token 认证
	AuthTypeBearer AuthType = "bearer"

	// AuthTypeAPIKey API Key 认证
	AuthTypeAPIKey AuthType = "api_key"

	// AuthTypeBasic HTTP Basic 认证
	AuthTypeBasic AuthType = "basic"
)

// EndpointConfig HTTP 端点配置
type EndpointConfig struct {
	// URLTemplate URL 模板，支持 {param} 占位符
	// 例如: https://api.example.com/users/{userId}
	URLTemplate string `json:"url_template"`

	// Method HTTP 方法（GET, POST, PUT, DELETE 等）
	Method string `json:"method"`

	// Headers 请求头
	Headers map[string]string `json:"headers"`

	// BodyTemplate 请求体模板（仅 POST/PUT 等需要请求体的方法）
	// 使用 Go template 语法，例如: {"name": "{{.name}}", "value": {{.value}}}
	BodyTemplate string `json:"body_template,omitempty"`

	// Auth 认证配置
	Auth *AuthConfig `json:"auth,omitempty"`

	// Timeout 超时时间（秒）
	Timeout int `json:"timeout,omitempty"`
}

// AuthConfig 认证配置
type AuthConfig struct {
	// Type 认证类型
	Type AuthType `json:"type"`

	// TokenEnv Bearer Token 或 API Key 的环境变量名
	TokenEnv string `json:"token_env,omitempty"`

	// APIKey API Key 值（可选，如果不使用环境变量）
	APIKey string `json:"api_key,omitempty"`

	// Username Basic 认证用户名
	Username string `json:"username,omitempty"`

	// Password Basic 认证密码
	Password string `json:"password,omitempty"`
}

// ParameterDef 参数定义（JSON Schema 格式）
type ParameterDef struct {
	// Type 参数类型（string, number, boolean, object, array）
	Type string `json:"type"`

	// Description 参数描述
	Description string `json:"description,omitempty"`

	// Required 是否必填
	Required bool `json:"required"`

	// Default 默认值
	Default any `json:"default,omitempty"`

	// Enum 枚举值限制
	Enum []string `json:"enum,omitempty"`

	// Properties 嵌套对象属性（当 type 为 object 时使用）
	Properties map[string]*ParameterDef `json:"properties,omitempty"`
}

// ParametersDef 参数定义容器
type ParametersDef struct {
	// Type 类型，通常为 "object"
	Type string `json:"type"`

	// Properties 参数属性映射
	Properties map[string]*ParameterDef `json:"properties"`

	// Required 必填参数名称列表
	Required []string `json:"required,omitempty"`
}

// ResponseTransform 响应转换规则
type ResponseTransform struct {
	// Extract JSONPath 提取表达式
	// 例如: "$.data.items" 提取响应中的 data.items 字段
	Extract string `json:"extract,omitempty"`

	// Format 输出格式（text, json, markdown）
	Format string `json:"format,omitempty"`

	// WrapperText 包装文本（用于格式化输出）
	WrapperText string `json:"wrapper_text,omitempty"`
}

// RateLimitConfig 速率限制配置
type RateLimitConfig struct {
	// MaxRequests 最大请求数
	MaxRequests int `json:"max_requests"`

	// WindowSecs 时间窗口（秒）
	WindowSecs int `json:"window_secs"`
}

// Tool 工具模型
//
// Tool 表示一个可被 Agent 调用的外部工具。
// 工具定义存储为 JSON，包含 HTTP 端点配置、参数 schema、响应转换规则等。
type Tool struct {
	// ID 唯一标识符
	ID string `json:"id" gorm:"primaryKey;type:varchar(100)"`

	// Name 工具名称（唯一，用于 Eino 工具调用）
	Name string `json:"name" gorm:"type:varchar(100);not null;uniqueIndex"`

	// Type 工具类型（invokable/streamable）
	Type ToolType `json:"type" gorm:"type:varchar(20);not null;default:'invokable'"`

	// DisplayName 工具显示名称
	DisplayName string `json:"display_name" gorm:"type:varchar(200);not null"`

	// Description 工具描述
	Description string `json:"description" gorm:"type:text;not null"`

	// Category 工具分类（web, api, custom 等）
	Category string `json:"category" gorm:"type:varchar(50);default:'custom'"`

	// Endpoint HTTP 端点配置
	Endpoint EndpointConfig `json:"endpoint" gorm:"type:jsonb;not null;serializer:json"`

	// Parameters 参数定义（JSON Schema）
	Parameters ParametersDef `json:"parameters" gorm:"type:jsonb;not null;serializer:json"`

	// ResponseTransform 响应转换规则
	ResponseTransform ResponseTransform `json:"response_transform" gorm:"type:jsonb;serializer:json"`

	// RateLimit 速率限制配置
	RateLimit *RateLimitConfig `json:"rate_limit" gorm:"type:jsonb;serializer:json"`

	// Enabled 是否启用
	Enabled bool `json:"enabled" gorm:"default:true;index"`

	// Version 版本号
	Version string `json:"version" gorm:"type:varchar(20);default:'1.0.0'"`

	// Tags 标签
	Tags StringArray `json:"tags" gorm:"type:text[];serializer:json"`

	// CreatedAt 创建时间
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`

	// UpdatedAt 更新时间
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName 指定 GORM 使用的数据库表名
func (Tool) TableName() string {
	return "tools"
}

// JSONB 实现 PostgreSQL JSONB 类型
type JSONB map[string]any

// Value 实现 driver.Valuer 接口
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan 实现 sql.Scanner 接口
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to unmarshal JSONB value: %v", value)
	}
	return json.Unmarshal(bytes, j)
}

// StringArray 实现 PostgreSQL TEXT[] 类型
type StringArray []string

// Value 实现 driver.Valuer 接口
func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	if len(s) == 0 {
		return "{}", nil
	}
	return json.Marshal(s)
}

// Scan 实现 sql.Scanner 接口
func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}

	var str string
	switch v := value.(type) {
	case []byte:
		str = string(v)
	case string:
		str = v
	default:
		return fmt.Errorf("failed to scan StringArray: unsupported type %T", value)
	}

	// 处理 PostgreSQL 数组格式 {item1,item2}
	if len(str) >= 2 && str[0] == '{' && str[len(str)-1] == '}' {
		str = str[1 : len(str)-1]
		if str == "" {
			*s = []string{}
			return nil
		}
		// 简单处理，实际可能需要处理带引号的字符串
		*s = splitPostgresArray(str)
		return nil
	}

	// 尝试 JSON 解析
	return json.Unmarshal([]byte(str), s)
}

// splitPostgresArray 分割 PostgreSQL 数组字符串
func splitPostgresArray(s string) []string {
	var result []string
	var current strings.Builder
	var inQuotes bool

	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c == '"':
			inQuotes = !inQuotes
		case c == ',' && !inQuotes:
			result = append(result, current.String())
			current.Reset()
		default:
			current.WriteByte(c)
		}
	}
	result = append(result, current.String())

	return result
}
