package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

// Config 服务配置
type Config struct {
	Port        int
	Env         string
	ServiceName string
	RegistryURL string
	DeepSeek    DeepSeekConfig
	Log         LogConfig
}

// DeepSeekConfig DeepSeek 配置
type DeepSeekConfig struct {
	APIKey string
	Model  string
}

// LogConfig 日志配置
type LogConfig struct {
	Level  string
	Format string
	Output string
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	_ = godotenv.Load()
	viper.AutomaticEnv()

	cfg := &Config{
		Port:        getEnvInt("PORT", 8895),
		Env:         getEnv("ENV", "development"),
		ServiceName: getEnv("SERVICE_NAME", "agent-service"),
		RegistryURL: getEnv("REGISTRY_URL", "http://localhost:8891"),
		DeepSeek: DeepSeekConfig{
			APIKey: getEnv("DEEPSEEK_API_KEY", ""),
			Model:  getEnv("DEEPSEEK_MODEL", "deepseek-chat"),
		},
		Log: LogConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "color"),
			Output: getEnv("LOG_OUTPUT", "stdout"),
		},
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		b, _ := strconv.ParseBool(val)
		return b
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		i, _ := strconv.Atoi(val)
		return i
	}
	return defaultVal
}
