package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Port        int    `mapstructure:"PORT"`
	DBHost      string `mapstructure:"DB_HOST"`
	DBPort      int    `mapstructure:"DB_PORT"`
	DBUser      string `mapstructure:"DB_USER"`
	DBPassword  string `mapstructure:"DB_PASSWORD"`
	DBName      string `mapstructure:"DB_NAME"`
	ServiceName string `mapstructure:"SERVICE_NAME"`
	RegistryURL string `mapstructure:"REGISTRY_URL"`

	// DeepSeek 配置
	DeepSeekAPIKey string `mapstructure:"DEEPSEEK_API_KEY"`
	DeepSeekModel  string `mapstructure:"DEEPSEEK_MODEL"`

	// 日志配置
	LogLevel  string `mapstructure:"LOG_LEVEL"`
	LogFormat string `mapstructure:"LOG_FORMAT"`
	LogOutput string `mapstructure:"LOG_OUTPUT"`
}

func LoadConfig(path string) (config Config, err error) {
	// 设置配置文件路径
	viper.AddConfigPath(path)

	// 尝试多种配置文件名称
	viper.SetConfigName(".env")
	viper.SetConfigType("env")

	// 启用环境变量自动绑定
	viper.AutomaticEnv()

	// 绑定环境变量到配置结构体字段
	viper.BindEnv("PORT")
	viper.BindEnv("DB_HOST")
	viper.BindEnv("DB_PORT")
	viper.BindEnv("DB_USER")
	viper.BindEnv("DB_PASSWORD")
	viper.BindEnv("DB_NAME")
	viper.BindEnv("SERVICE_NAME")
	viper.BindEnv("REGISTRY_URL")
	viper.BindEnv("DEEPSEEK_API_KEY")
	viper.BindEnv("DEEPSEEK_MODEL")
	viper.BindEnv("LOG_LEVEL")
	viper.BindEnv("LOG_FORMAT")
	viper.BindEnv("LOG_OUTPUT")

	// 尝试读取配置文件
	if err = viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Println("配置文件未找到，使用环境变量")
			loadFromEnv(&config)
		} else {
			fmt.Printf("读取配置文件时出错: %v\n", err)
			loadFromEnv(&config)
		}
	} else {
		if err = viper.Unmarshal(&config); err != nil {
			fmt.Printf("解析配置文件时出错: %v\n", err)
			loadFromEnv(&config)
		}
	}

	// 设置默认值
	if config.Port == 0 {
		config.Port = 8895
	}

	if config.ServiceName == "" {
		config.ServiceName = "agent-service"
	}

	if config.RegistryURL == "" {
		config.RegistryURL = os.Getenv("REGISTRY_URL")
	}

	if config.DeepSeekModel == "" {
		config.DeepSeekModel = "deepseek-chat"
	}

	// 设置日志默认值
	if config.LogLevel == "" {
		config.LogLevel = "info"
	}
	if config.LogFormat == "" {
		config.LogFormat = "color"
	}
	if config.LogOutput == "" {
		config.LogOutput = "stdout"
	}

	// 验证必要的配置
	if err = validateConfig(config); err != nil {
		return config, fmt.Errorf("配置验证失败: %v", err)
	}

	return config, nil
}

// loadFromEnv 从环境变量加载配置
func loadFromEnv(config *Config) {
	if port := os.Getenv("PORT"); port != "" {
		if p, err := fmt.Sscanf(port, "%d", &config.Port); err == nil && p == 1 {
			// 成功解析端口
		}
	}

	config.DBHost = os.Getenv("DB_HOST")
	config.DBUser = os.Getenv("DB_USER")
	config.DBPassword = os.Getenv("DB_PASSWORD")
	config.DBName = os.Getenv("DB_NAME")
	config.DeepSeekAPIKey = os.Getenv("DEEPSEEK_API_KEY")
	config.DeepSeekModel = os.Getenv("DEEPSEEK_MODEL")
	config.ServiceName = os.Getenv("SERVICE_NAME")
	config.RegistryURL = os.Getenv("REGISTRY_URL")
	config.LogLevel = os.Getenv("LOG_LEVEL")
	config.LogFormat = os.Getenv("LOG_FORMAT")
	config.LogOutput = os.Getenv("LOG_OUTPUT")

	if dbPort := os.Getenv("DB_PORT"); dbPort != "" {
		if p, err := fmt.Sscanf(dbPort, "%d", &config.DBPort); err == nil && p == 1 {
			// 成功解析数据库端口
		}
	}
}

// validateConfig 验证配置的完整性
func validateConfig(config Config) error {
	if config.DBHost == "" {
		return fmt.Errorf("DB_HOST 未设置")
	}
	if config.DBUser == "" {
		return fmt.Errorf("DB_USER 未设置")
	}
	if config.DBPassword == "" {
		return fmt.Errorf("DB_PASSWORD 未设置")
	}
	if config.DBName == "" {
		return fmt.Errorf("DB_NAME 未设置")
	}
	if config.DeepSeekAPIKey == "" {
		return fmt.Errorf("DEEPSEEK_API_KEY 未设置")
	}
	if config.DBPort == 0 {
		config.DBPort = 5432 // PostgreSQL 默认端口
	}

	return nil
}
