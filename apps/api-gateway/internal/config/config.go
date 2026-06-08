package config

import (
	"strings"

	"github.com/spf13/viper"
)

// Config 结构体用于存储配置信息
type Config struct {
	Port                  string
	RegistryServiceURL    string
	CORSOrigins           []string
	LogLevel              string
	RateLimitRequests     int
	RateLimitWindow       int
	BetterAuthBaseURL     string
	BetterAuthSessionPath string
	GatewayInternalSecret string
	AuthCacheTTLSeconds   int
	AuthClockSkewSeconds  int

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
		Port:                  viper.GetString("GATEWAY_PORT"),
		RegistryServiceURL:    viper.GetString("REGISTRY_SERVICE_URL"),
		LogLevel:              viper.GetString("LOG_LEVEL"),
		LogFormat:             viper.GetString("LOG_FORMAT"),
		LogOutput:             viper.GetString("LOG_OUTPUT"),
		RateLimitRequests:     viper.GetInt("RATE_LIMIT_REQUESTS"),
		RateLimitWindow:       viper.GetInt("RATE_LIMIT_WINDOW"),
		BetterAuthBaseURL:     viper.GetString("BETTER_AUTH_BASE_URL"),
		BetterAuthSessionPath: viper.GetString("BETTER_AUTH_SESSION_PATH"),
		GatewayInternalSecret: viper.GetString("GATEWAY_INTERNAL_SECRET"),
		AuthCacheTTLSeconds:   viper.GetInt("AUTH_CACHE_TTL_SECONDS"),
		AuthClockSkewSeconds:  viper.GetInt("AUTH_CLOCK_SKEW_SECONDS"),
	}

	if cfg.Port == "" {
		cfg.Port = "8890"
	}
	if cfg.RegistryServiceURL == "" {
		cfg.RegistryServiceURL = "http://localhost:8080"
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
	if cfg.BetterAuthBaseURL == "" {
		cfg.BetterAuthBaseURL = "http://localhost:8800"
	}
	if cfg.BetterAuthSessionPath == "" {
		cfg.BetterAuthSessionPath = "/api/auth/get-session"
	}
	if cfg.GatewayInternalSecret == "" {
		cfg.GatewayInternalSecret = "dev-gateway-internal-secret-change-me"
	}
	if cfg.AuthCacheTTLSeconds == 0 {
		cfg.AuthCacheTTLSeconds = 60
	}
	if cfg.AuthClockSkewSeconds == 0 {
		cfg.AuthClockSkewSeconds = 300
	}

	corsOrigins := viper.GetString("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "*"
	}
	cfg.CORSOrigins = strings.Split(corsOrigins, ",")
	for i, origin := range cfg.CORSOrigins {
		cfg.CORSOrigins[i] = strings.TrimSpace(origin)
	}

	return cfg
}
