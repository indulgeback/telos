package config

import (
	"os"
	"strconv"
	"strings"
)

// Config 结构体用于存储配置信息
type Config struct {
	Port              string
	AuthServiceURL    string
	CORSOrigins       []string
	LogLevel          string
	RateLimitRequests int
	RateLimitWindow   int
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	cfg := &Config{
		Port:              getEnvOrDefault("GATEWAY_PORT", "8080"),
		AuthServiceURL:    getEnvOrDefault("AUTH_SERVICE_URL", "http://localhost:5501"),
		LogLevel:          getEnvOrDefault("LOG_LEVEL", "info"),
		RateLimitRequests: getEnvAsIntOrDefault("RATE_LIMIT_REQUESTS", 100),
		RateLimitWindow:   getEnvAsIntOrDefault("RATE_LIMIT_WINDOW", 60),
	}

	// 解析 CORS 配置
	corsOrigins := getEnvOrDefault("CORS_ORIGINS", "http://localhost:3000")
	cfg.CORSOrigins = strings.Split(corsOrigins, ",")
	for i, origin := range cfg.CORSOrigins {
		cfg.CORSOrigins[i] = strings.TrimSpace(origin)
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
