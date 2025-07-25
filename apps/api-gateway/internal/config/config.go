package config

import (
	"strings"

	"github.com/spf13/viper"
)

// Config 结构体用于存储配置信息
type Config struct {
	Port               string
	RegistryServiceURL string
	AuthServiceURL     string
	CORSOrigins        []string
	LogLevel           string
	RateLimitRequests  int
	RateLimitWindow    int

	// 日志配置
	LogFormat string
	LogOutput string
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	_ = viper.ReadInConfig() // 忽略找不到文件的错误
	viper.AutomaticEnv()

	cfg := &Config{
		Port:               viper.GetString("GATEWAY_PORT"),
		RegistryServiceURL: viper.GetString("REGISTRY_SERVICE_URL"),
		AuthServiceURL:     viper.GetString("AUTH_SERVICE_URL"),
		LogLevel:           viper.GetString("LOG_LEVEL"),
		LogFormat:          viper.GetString("LOG_FORMAT"),
		LogOutput:          viper.GetString("LOG_OUTPUT"),
		RateLimitRequests:  viper.GetInt("RATE_LIMIT_REQUESTS"),
		RateLimitWindow:    viper.GetInt("RATE_LIMIT_WINDOW"),
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.RegistryServiceURL == "" {
		cfg.RegistryServiceURL = "http://localhost:8080"
	}
	if cfg.AuthServiceURL == "" {
		cfg.AuthServiceURL = "http://localhost:5501"
	}
	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}
	if cfg.LogFormat == "" {
		cfg.LogFormat = "color"
	}
	if cfg.LogOutput == "" {
		cfg.LogOutput = "stdout"
	}
	if cfg.RateLimitRequests == 0 {
		cfg.RateLimitRequests = 100
	}
	if cfg.RateLimitWindow == 0 {
		cfg.RateLimitWindow = 60
	}

	corsOrigins := viper.GetString("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:3000"
	}
	cfg.CORSOrigins = strings.Split(corsOrigins, ",")
	for i, origin := range cfg.CORSOrigins {
		cfg.CORSOrigins[i] = strings.TrimSpace(origin)
	}

	return cfg
}
