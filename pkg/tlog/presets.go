package tlog

import (
	"path/filepath"
	"time"
)

// 预设配置，方便快速使用

// DevelopmentConfig 开发环境配置
func DevelopmentConfig(serviceName string) *Config {
	return &Config{
		Level:       "debug",
		Format:      "color",
		Output:      "stdout",
		ServiceName: serviceName,
		EnableColor: true,
		AddSource:   true,
	}
}

// ProductionConfig 生产环境配置
func ProductionConfig(serviceName, logDir string) *Config {
	return &Config{
		Level:       "info",
		Format:      "json",
		Output:      "rotating",
		FilePath:    filepath.Join(logDir, serviceName+".log"),
		ServiceName: serviceName,
		EnableColor: false,
		AddSource:   false,
		Storage: &StorageConfig{
			MaxSize:    100,                 // 100MB
			MaxAge:     30 * 24 * time.Hour, // 30天
			MaxBackups: 30,                  // 30个备份
			Compress:   true,                // 启用压缩
			BufferSize: 8192,                // 8KB缓冲
			FlushTime:  3 * time.Second,     // 3秒刷新
		},
	}
}

// ElasticsearchConfig 创建Elasticsearch日志配置
func ElasticsearchLogConfig(serviceName, endpoint, index string) *Config {
	return &Config{
		Level:       "info",
		Format:      "json",
		Output:      "remote",
		ServiceName: serviceName,
		EnableColor: false,
		AddSource:   false,
		Remote: &RemoteConfig{
			Endpoint:    endpoint,
			Method:      "POST",
			BatchSize:   50,
			BatchTime:   5 * time.Second,
			Timeout:     10 * time.Second,
			RetryCount:  3,
			RetryDelay:  time.Second,
			BufferSize:  500,
			EnableAsync: true,
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
		},
	}
}

// LokiConfig 创建Loki日志配置
func LokiLogConfig(serviceName, endpoint string, labels map[string]string) *Config {
	if labels == nil {
		labels = make(map[string]string)
	}
	labels["service"] = serviceName

	return &Config{
		Level:       "info",
		Format:      "json",
		Output:      "remote",
		ServiceName: serviceName,
		EnableColor: false,
		AddSource:   false,
		Remote: &RemoteConfig{
			Endpoint:    endpoint + "/loki/api/v1/push",
			Method:      "POST",
			BatchSize:   100,
			BatchTime:   5 * time.Second,
			Timeout:     15 * time.Second,
			RetryCount:  3,
			RetryDelay:  2 * time.Second,
			BufferSize:  1000,
			EnableAsync: true,
			Headers: map[string]string{
				"Content-Type": "application/json",
			},
		},
	}
}

// HybridConfig 混合配置（本地+远程）
func HybridConfig(serviceName, logDir, remoteEndpoint string) *Config {
	// 主要使用本地轮转文件
	config := ProductionConfig(serviceName, logDir)

	// 添加远程备份（可以通过MultiWriter实现）
	config.Remote = &RemoteConfig{
		Endpoint:    remoteEndpoint,
		Method:      "POST",
		BatchSize:   20,
		BatchTime:   10 * time.Second,
		Timeout:     5 * time.Second,
		RetryCount:  2,
		RetryDelay:  time.Second,
		BufferSize:  200,
		EnableAsync: true,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}

	return config
}

// TestingConfig 测试环境配置
func TestingConfig(serviceName string) *Config {
	return &Config{
		Level:       "debug",
		Format:      "text",
		Output:      "stdout",
		ServiceName: serviceName,
		EnableColor: false,
		AddSource:   true,
	}
}

// HighPerformanceConfig 高性能配置（大缓冲区，异步写入）
func HighPerformanceConfig(serviceName, logDir string) *Config {
	return &Config{
		Level:       "info",
		Format:      "json",
		Output:      "rotating",
		FilePath:    filepath.Join(logDir, serviceName+".log"),
		ServiceName: serviceName,
		EnableColor: false,
		AddSource:   false,
		Storage: &StorageConfig{
			MaxSize:    500,                // 500MB
			MaxAge:     7 * 24 * time.Hour, // 7天
			MaxBackups: 14,                 // 14个备份
			Compress:   true,               // 启用压缩
			BufferSize: 32768,              // 32KB大缓冲区
			FlushTime:  10 * time.Second,   // 10秒刷新
		},
	}
}

// DebugConfig 调试配置（详细日志）
func DebugConfig(serviceName string) *Config {
	return &Config{
		Level:       "debug",
		Format:      "color",
		Output:      "stdout",
		ServiceName: serviceName,
		EnableColor: true,
		AddSource:   true,
	}
}

// MinimalConfig 最小配置（只输出错误）
func MinimalConfig(serviceName string) *Config {
	return &Config{
		Level:       "error",
		Format:      "json",
		Output:      "stdout",
		ServiceName: serviceName,
		EnableColor: false,
		AddSource:   false,
	}
}
