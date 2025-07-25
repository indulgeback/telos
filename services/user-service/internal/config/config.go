package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Port        int    `mapstructure:"PORT"`
	ServiceName string `mapstructure:"SERVICE_NAME"`
	DBHost      string `mapstructure:"DB_HOST"`
	DBPort      int    `mapstructure:"DB_PORT"`
	DBUser      string `mapstructure:"DB_USER"`
	DBPassword  string `mapstructure:"DB_PASSWORD"`
	DBName      string `mapstructure:"DB_NAME"`
	RegistryURL string `mapstructure:"REGISTRY_URL"` // 注册中心地址

	// 日志配置
	LogLevel  string `mapstructure:"LOG_LEVEL"`  // 日志级别
	LogFormat string `mapstructure:"LOG_FORMAT"` // 日志格式
	LogOutput string `mapstructure:"LOG_OUTPUT"` // 日志输出
}

func LoadConfig() *Config {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	_ = viper.ReadInConfig()
	viper.AutomaticEnv()

	cfg := &Config{
		Port:        viper.GetInt("PORT"),
		ServiceName: viper.GetString("SERVICE_NAME"),
		DBHost:      viper.GetString("DB_HOST"),
		DBPort:      viper.GetInt("DB_PORT"),
		DBUser:      viper.GetString("DB_USER"),
		DBPassword:  viper.GetString("DB_PASSWORD"),
		DBName:      viper.GetString("DB_NAME"),
		RegistryURL: viper.GetString("REGISTRY_URL"),
		LogLevel:    viper.GetString("LOG_LEVEL"),
		LogFormat:   viper.GetString("LOG_FORMAT"),
		LogOutput:   viper.GetString("LOG_OUTPUT"),
	}

	if cfg.ServiceName == "" {
		cfg.ServiceName = "user-service"
	}

	// 设置日志默认值
	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}
	if cfg.LogFormat == "" {
		cfg.LogFormat = "color"
	}
	if cfg.LogOutput == "" {
		cfg.LogOutput = "stdout"
	}

	return cfg
}
