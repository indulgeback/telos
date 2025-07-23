package config

import (
	"github.com/spf13/viper"
)

// Config 注册中心配置结构体
type Config struct {
	Port          string
	ConsulAddress string
	ConsulToken   string
	ConsulDC      string
	LogLevel      string
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	_ = viper.ReadInConfig() // 忽略找不到文件的错误
	viper.AutomaticEnv()

	cfg := &Config{
		Port:          viper.GetString("REGISTRY_PORT"),
		ConsulAddress: viper.GetString("CONSUL_ADDRESS"),
		ConsulToken:   viper.GetString("CONSUL_TOKEN"),
		ConsulDC:      viper.GetString("CONSUL_DC"),
		LogLevel:      viper.GetString("LOG_LEVEL"),
	}

	if cfg.Port == "" {
		cfg.Port = "8081"
	}
	if cfg.ConsulAddress == "" {
		cfg.ConsulAddress = "127.0.0.1:8500"
	}
	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}

	return cfg
}
