package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

// Config 服务配置
type Config struct {
	// 服务配置
	Port        int    `mapstructure:"PORT"`
	ServiceName string `mapstructure:"SERVICE_NAME"`
	RegistryURL string `mapstructure:"REGISTRY_URL"`

	// 数据库配置
	DBHost     string `mapstructure:"DB_HOST"`
	DBPort     int    `mapstructure:"DB_PORT"`
	DBUser     string `mapstructure:"DB_USER"`
	DBPassword string `mapstructure:"DB_PASSWORD"`
	DBName     string `mapstructure:"DB_NAME"`

	// Redis 配置
	RedisAddr     string `mapstructure:"REDIS_ADDR"`
	RedisPassword string `mapstructure:"REDIS_PASSWORD"`
	RedisDB       int    `mapstructure:"REDIS_DB"`

	// LLM 模型配置
	LLMProvider     string `mapstructure:"LLM_PROVIDER"`     // openai, claude, ark, ollama
	LLMAPIKey       string `mapstructure:"LLM_API_KEY"`
	LLMModel        string `mapstructure:"LLM_MODEL"`
	LLMBaseURL      string `mapstructure:"LLM_BASE_URL"`      // 自定义 API 地址
	LLMArkAPIKey    string `mapstructure:"LLM_ARK_API_KEY"`   // 豆包 Ark API Key
	LLMArkEndpoint  string `mapstructure:"LLM_ARK_ENDPOINT"` // 豆包 Ark Endpoint

	// 日志配置
	LogLevel  string `mapstructure:"LOG_LEVEL"`
	LogFormat string `mapstructure:"LOG_FORMAT"`
	LogOutput string `mapstructure:"LOG_OUTPUT"`
}

// LoadConfig 加载配置
func LoadConfig(path string) (config Config, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AutomaticEnv()

	// 绑定环境变量
	bindEnvs()

	// 尝试读取配置文件
	if err = viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			loadFromEnv(&config)
		} else {
			loadFromEnv(&config)
		}
	} else {
		if err = viper.Unmarshal(&config); err != nil {
			loadFromEnv(&config)
		}
	}

	// 设置默认值
	setDefaults(&config)

	return config, nil
}

func bindEnvs() {
	envVars := []string{
		"PORT", "SERVICE_NAME", "REGISTRY_URL",
		"DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME",
		"REDIS_ADDR", "REDIS_PASSWORD", "REDIS_DB",
		"LLM_PROVIDER", "LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL",
		"LLM_ARK_API_KEY", "LLM_ARK_ENDPOINT",
		"LOG_LEVEL", "LOG_FORMAT", "LOG_OUTPUT",
	}
	for _, env := range envVars {
		viper.BindEnv(env)
	}
}

func loadFromEnv(config *Config) {
	if port := os.Getenv("PORT"); port != "" {
		fmt.Sscanf(port, "%d", &config.Port)
	}
	config.ServiceName = os.Getenv("SERVICE_NAME")
	config.RegistryURL = os.Getenv("REGISTRY_URL")
	config.DBHost = os.Getenv("DB_HOST")
	if port := os.Getenv("DB_PORT"); port != "" {
		fmt.Sscanf(port, "%d", &config.DBPort)
	}
	config.DBUser = os.Getenv("DB_USER")
	config.DBPassword = os.Getenv("DB_PASSWORD")
	config.DBName = os.Getenv("DB_NAME")
	config.RedisAddr = os.Getenv("REDIS_ADDR")
	config.RedisPassword = os.Getenv("REDIS_PASSWORD")
	if db := os.Getenv("REDIS_DB"); db != "" {
		fmt.Sscanf(db, "%d", &config.RedisDB)
	}
	config.LLMProvider = os.Getenv("LLM_PROVIDER")
	config.LLMAPIKey = os.Getenv("LLM_API_KEY")
	config.LLMModel = os.Getenv("LLM_MODEL")
	config.LLMBaseURL = os.Getenv("LLM_BASE_URL")
	config.LLMArkAPIKey = os.Getenv("LLM_ARK_API_KEY")
	config.LLMArkEndpoint = os.Getenv("LLM_ARK_ENDPOINT")
	config.LogLevel = os.Getenv("LOG_LEVEL")
	config.LogFormat = os.Getenv("LOG_FORMAT")
	config.LogOutput = os.Getenv("LOG_OUTPUT")
}

func setDefaults(config *Config) {
	if config.Port == 0 {
		config.Port = 8895
	}
	if config.ServiceName == "" {
		config.ServiceName = "agent-service"
	}
	if config.DBPort == 0 {
		config.DBPort = 5432
	}
	if config.RedisAddr == "" {
		config.RedisAddr = "localhost:6379"
	}
	if config.RedisDB == 0 {
		config.RedisDB = 0
	}
	if config.LLMProvider == "" {
		config.LLMProvider = "openai"
	}
	if config.LLMModel == "" {
		config.LLMModel = "gpt-4o-mini"
	}
	if config.LogLevel == "" {
		config.LogLevel = "info"
	}
	if config.LogFormat == "" {
		config.LogFormat = "color"
	}
	if config.LogOutput == "" {
		config.LogOutput = "stdout"
	}
}
