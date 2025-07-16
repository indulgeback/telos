package config

import "os"

// Config 结构体用于存储配置信息
type Config struct {
	Port           string
	AuthServiceURL string // 新增：auth-service 地址
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	// TODO: 实现从文件或环境变量加载配置
	return &Config{
		Port:           os.Getenv("GATEWAY_PORT"),
		AuthServiceURL: os.Getenv("AUTH_SERVICE_URL"),
	}
}
