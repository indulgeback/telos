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
	JWTSecret   string `mapstructure:"JWT_SECRET"`
	ServiceName string `mapstructure:"SERVICE_NAME"`
	RegistryURL string `mapstructure:"REGISTRY_URL"` // 注册中心地址
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
	viper.BindEnv("JWT_SECRET")
	viper.BindEnv("SERVICE_NAME")
	viper.BindEnv("REGISTRY_URL")

	// 尝试读取配置文件
	if err = viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Println("配置文件未找到，使用环境变量")
			// 如果配置文件不存在，尝试从环境变量加载
			loadFromEnv(&config)
		} else {
			fmt.Printf("读取配置文件时出错: %v\n", err)
			// 即使配置文件读取失败，也尝试从环境变量加载
			loadFromEnv(&config)
		}
	} else {
		// 配置文件存在，解析配置
		if err = viper.Unmarshal(&config); err != nil {
			fmt.Printf("解析配置文件时出错: %v\n", err)
			// 解析失败时也尝试从环境变量加载
			loadFromEnv(&config)
		}
	}

	// 设置默认值
	if config.Port == 0 {
		config.Port = 8080
	}

	if config.ServiceName == "" {
		config.ServiceName = "auth-service"
	}

	if config.RegistryURL == "" {
		config.RegistryURL = os.Getenv("REGISTRY_URL")
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
	config.JWTSecret = os.Getenv("JWT_SECRET")
	config.ServiceName = os.Getenv("SERVICE_NAME")
	config.RegistryURL = os.Getenv("REGISTRY_URL")

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
	if config.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET 未设置")
	}
	if config.DBPort == 0 {
		config.DBPort = 5432 // PostgreSQL 默认端口
	}

	return nil
}
