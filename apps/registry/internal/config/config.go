package config

import (
	"os"
	"strconv"
)

// Config 注册中心配置结构体
type Config struct {
	ConsulAddress string // Consul 服务地址
	ConsulToken   string // Consul ACL Token
	ConsulDC      string // Consul 数据中心
	Port          string // 注册中心服务端口
	LogLevel      string // 日志级别
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	cfg := &Config{
		ConsulAddress: getEnvOrDefault("CONSUL_ADDRESS", "localhost:8500"),
		ConsulToken:   getEnvOrDefault("CONSUL_TOKEN", ""),
		ConsulDC:      getEnvOrDefault("CONSUL_DC", ""),
		Port:          getEnvOrDefault("REGISTRY_PORT", "8820"),
		LogLevel:      getEnvOrDefault("LOG_LEVEL", "info"),
	}

	return cfg
}

// getEnvOrDefault 获取环境变量或返回默认值
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsIntOrDefault 获取环境变量并转换为整数，失败则返回默认值
func getEnvAsIntOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
