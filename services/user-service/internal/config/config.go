package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Port        string
	ServiceName string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
}

func LoadConfig() *Config {
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")
	_ = viper.ReadInConfig()
	viper.AutomaticEnv()

	cfg := &Config{
		Port:        viper.GetString("PORT"),
		ServiceName: viper.GetString("SERVICE_NAME"),
		DBHost:      viper.GetString("DB_HOST"),
		DBPort:      viper.GetString("DB_PORT"),
		DBUser:      viper.GetString("DB_USER"),
		DBPassword:  viper.GetString("DB_PASSWORD"),
		DBName:      viper.GetString("DB_NAME"),
	}

	if cfg.Port == "" {
		cfg.Port = "8081"
	}
	if cfg.ServiceName == "" {
		cfg.ServiceName = "user-service"
	}
	if cfg.DBPort == "" {
		cfg.DBPort = "5432"
	}

	return cfg
}
