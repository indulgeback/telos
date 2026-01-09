package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// AgentType Agent 类型
type AgentType string

const (
	AgentTypeChain AgentType = "chain" // 链式 Agent
	AgentTypeReAct AgentType = "react" // ReAct Agent
	AgentTypeRAG   AgentType = "rag"   // RAG Agent
	AgentTypeGraph AgentType = "graph" // 自定义图 Agent
)

// LLMProvider LLM 提供商
type LLMProvider string

const (
	LLMProviderOpenAI LLMProvider = "openai"
	LLMProviderClaude LLMProvider = "claude"
	LLMProviderGemini LLMProvider = "gemini"
	LLMProviderArk    LLMProvider = "ark"    // 豆包
	LLMProviderOllama LLMProvider = "ollama"
)

// AgentConfig Agent 配置
type AgentConfig struct {
	ID          string         `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"not null"`
	Description string         `json:"description" gorm:""`
	Type        AgentType      `json:"type" gorm:"not null;default:'chain'"`
	Config      JSONMap        `json:"config" gorm:"type:jsonb"`
	Enabled     bool           `json:"enabled" gorm:"default:true"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   *time.Time     `json:"deleted_at,omitempty" gorm:"index"`
}

// ModelConfig 模型配置
type ModelConfig struct {
	Provider    LLMProvider `json:"provider"`
	Model       string      `json:"model"`
	APIKey      string      `json:"api_key,omitempty"`
	BaseURL     string      `json:"base_url,omitempty"`
	Temperature float64     `json:"temperature,omitempty"`
	MaxTokens   int         `json:"max_tokens,omitempty"`
}

// KnowledgeConfig 知识库配置
type KnowledgeConfig struct {
	Enabled   bool   `json:"enabled"`
	IndexName string `json:"index_name"`
	TopK      int    `json:"top_k,omitempty"`
}

// ToolConfig 工具配置
type ToolConfig struct {
	Name     string                 `json:"name"`
	Enabled  bool                   `json:"enabled"`
	Config   map[string]interface{} `json:"config,omitempty"`
}

// JSONMap 自定义 JSON 类型
type JSONMap map[string]interface{}

// Scan 实现 sql.Scanner 接口
func (j *JSONMap) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}

// Value 实现 driver.Valuer 接口
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// TableName 指定表名
func (AgentConfig) TableName() string {
	return "agents"
}
