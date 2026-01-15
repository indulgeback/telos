// Package config 提供 Agent Service 的配置管理功能
//
// 配置来源（优先级从高到低）：
//  1. 环境变量
//  2. .env 配置文件
//  3. 代码默认值
//
// 使用 Viper 库实现配置的加载和解析
package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

// Config 定义了 Agent Service 的所有配置项
//
// 配置项说明：
//   - Port: HTTP 服务监听端口
//   - DBHost/DBPort/DBUser/DBPassword/DBName: PostgreSQL 数据库连接参数
//   - ServiceName: 服务名称，用于日志和服务注册
//   - RegistryURL: 服务注册中心地址
//   - DeepSeekAPIKey/DeepSeekModel: DeepSeek AI 模型配置
//   - LogLevel/LogFormat/LogOutput: 日志系统配置
type Config struct {
	// HTTP 服务端口
	Port int `mapstructure:"PORT"`

	// 数据库配置
	DBHost     string `mapstructure:"DB_HOST"`     // 数据库主机地址
	DBPort     int    `mapstructure:"DB_PORT"`     // 数据库端口
	DBUser     string `mapstructure:"DB_USER"`     // 数据库用户名
	DBPassword string `mapstructure:"DB_PASSWORD"` // 数据库密码
	DBName     string `mapstructure:"DB_NAME"`     // 数据库名称

	// 服务配置
	ServiceName string `mapstructure:"SERVICE_NAME"` // 服务名称
	RegistryURL string `mapstructure:"REGISTRY_URL"` // 服务注册中心 URL

	// DeepSeek AI 模型配置
	DeepSeekAPIKey string `mapstructure:"DEEPSEEK_API_KEY"` // DeepSeek API 密钥
	DeepSeekModel  string `mapstructure:"DEEPSEEK_MODEL"`   // DeepSeek 模型名称（如 deepseek-chat）

	// 日志配置
	LogLevel  string `mapstructure:"LOG_LEVEL"`  // 日志级别：debug, info, warn, error
	LogFormat string `mapstructure:"LOG_FORMAT"` // 日志格式：json, color, text
	LogOutput string `mapstructure:"LOG_OUTPUT"` // 日志输出：stdout, stderr, file, rotating
}

// LoadConfig 从指定路径加载配置
//
// 加载顺序：
//  1. 尝试读取 .env 文件
//  2. 绑定环境变量
//  3. 设置默认值
//  4. 验证必要配置项
//
// 参数：
//   - path: 配置文件所在目录路径
//
// 返回：
//   - config: 加载后的配置对象
//   - error: 配置验证失败时返回错误
func LoadConfig(path string) (config Config, err error) {
	// ========== 1. 设置配置文件路径 ==========
	viper.AddConfigPath(path)

	// 尝试多种配置文件名称
	viper.SetConfigName(".env")
	viper.SetConfigType("env")

	// ========== 2. 启用环境变量自动绑定 ==========
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

	// ========== 3. 尝试读取配置文件 ==========
	if err = viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// 配置文件不存在，回退到环境变量
			fmt.Println("配置文件未找到，使用环境变量")
			loadFromEnv(&config)
		} else {
			// 配置文件读取错误，回退到环境变量
			fmt.Printf("读取配置文件时出错: %v\n", err)
			loadFromEnv(&config)
		}
	} else {
		// 配置文件读取成功，解析到结构体
		if err = viper.Unmarshal(&config); err != nil {
			fmt.Printf("解析配置文件时出错: %v\n", err)
			loadFromEnv(&config)
		}
	}

	// ========== 4. 设置默认值 ==========
	// HTTP 服务端口默认值
	if config.Port == 0 {
		config.Port = 8895
	}

	// 服务名称默认值
	if config.ServiceName == "" {
		config.ServiceName = "agent-service"
	}

	// 注册中心地址（从环境变量再次获取）
	if config.RegistryURL == "" {
		config.RegistryURL = os.Getenv("REGISTRY_URL")
	}

	// DeepSeek 模型默认值
	if config.DeepSeekModel == "" {
		config.DeepSeekModel = "deepseek-chat"
	}

	// 日志配置默认值
	if config.LogLevel == "" {
		config.LogLevel = "info"
	}
	if config.LogFormat == "" {
		config.LogFormat = "color"
	}
	if config.LogOutput == "" {
		config.LogOutput = "stdout"
	}

	// ========== 5. 验证必要的配置 ==========
	if err = validateConfig(config); err != nil {
		return config, fmt.Errorf("配置验证失败: %v", err)
	}

	return config, nil
}

// loadFromEnv 从环境变量加载配置
//
// 当配置文件不存在或读取失败时，直接从环境变量读取配置。
// 这是一个备用方案，确保服务可以在没有配置文件的情况下运行。
//
// 参数：
//   - config: 配置对象指针，将被直接修改
func loadFromEnv(config *Config) {
	// 解析端口
	if port := os.Getenv("PORT"); port != "" {
		if p, err := fmt.Sscanf(port, "%d", &config.Port); err == nil && p == 1 {
			// 成功解析端口
		}
	}

	// 数据库配置
	config.DBHost = os.Getenv("DB_HOST")
	config.DBUser = os.Getenv("DB_USER")
	config.DBPassword = os.Getenv("DB_PASSWORD")
	config.DBName = os.Getenv("DB_NAME")

	// DeepSeek 配置
	config.DeepSeekAPIKey = os.Getenv("DEEPSEEK_API_KEY")
	config.DeepSeekModel = os.Getenv("DEEPSEEK_MODEL")

	// 服务配置
	config.ServiceName = os.Getenv("SERVICE_NAME")
	config.RegistryURL = os.Getenv("REGISTRY_URL")

	// 日志配置
	config.LogLevel = os.Getenv("LOG_LEVEL")
	config.LogFormat = os.Getenv("LOG_FORMAT")
	config.LogOutput = os.Getenv("LOG_OUTPUT")

	// 解析数据库端口
	if dbPort := os.Getenv("DB_PORT"); dbPort != "" {
		if p, err := fmt.Sscanf(dbPort, "%d", &config.DBPort); err == nil && p == 1 {
			// 成功解析数据库端口
		}
	}
}

// validateConfig 验证配置的完整性
//
// 检查所有必需的配置项是否已设置，并为数据库端口设置默认值。
//
// 参数：
//   - config: 待验证的配置对象
//
// 返回：
//   - error: 验证失败时返回错误信息
func validateConfig(config Config) error {
	// 验证数据库配置
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

	// 验证 DeepSeek 配置
	if config.DeepSeekAPIKey == "" {
		return fmt.Errorf("DEEPSEEK_API_KEY 未设置")
	}

	// 设置数据库端口默认值
	if config.DBPort == 0 {
		config.DBPort = 5432 // PostgreSQL 默认端口
	}

	return nil
}
