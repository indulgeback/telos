package config

import (
	"os"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	// 保存原始环境变量
	originalConsulAddress := os.Getenv("CONSUL_ADDRESS")
	originalRegistryPort := os.Getenv("REGISTRY_PORT")
	originalLogLevel := os.Getenv("LOG_LEVEL")

	// 清理环境变量
	defer func() {
		if originalConsulAddress != "" {
			os.Setenv("CONSUL_ADDRESS", originalConsulAddress)
		} else {
			os.Unsetenv("CONSUL_ADDRESS")
		}
		if originalRegistryPort != "" {
			os.Setenv("REGISTRY_PORT", originalRegistryPort)
		} else {
			os.Unsetenv("REGISTRY_PORT")
		}
		if originalLogLevel != "" {
			os.Setenv("LOG_LEVEL", originalLogLevel)
		} else {
			os.Unsetenv("LOG_LEVEL")
		}
	}()

	tests := []struct {
		name           string
		envVars        map[string]string
		expectedConfig *Config
	}{
		{
			name:    "默认配置",
			envVars: map[string]string{},
			expectedConfig: &Config{
				ConsulAddress: "localhost:8500",
				ConsulToken:   "",
				ConsulDC:      "",
				Port:          "8820",
				LogLevel:      "info",
			},
		},
		{
			name: "自定义配置",
			envVars: map[string]string{
				"CONSUL_ADDRESS": "consul.example.com:8500",
				"CONSUL_TOKEN":   "test-token",
				"CONSUL_DC":      "dc1",
				"REGISTRY_PORT":  "9000",
				"LOG_LEVEL":      "debug",
			},
			expectedConfig: &Config{
				ConsulAddress: "consul.example.com:8500",
				ConsulToken:   "test-token",
				ConsulDC:      "dc1",
				Port:          "9000",
				LogLevel:      "debug",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 设置环境变量
			for key, value := range tt.envVars {
				os.Setenv(key, value)
			}

			// 加载配置
			config := LoadConfig()

			// 验证配置
			if config.ConsulAddress != tt.expectedConfig.ConsulAddress {
				t.Errorf("ConsulAddress = %v, want %v", config.ConsulAddress, tt.expectedConfig.ConsulAddress)
			}
			if config.ConsulToken != tt.expectedConfig.ConsulToken {
				t.Errorf("ConsulToken = %v, want %v", config.ConsulToken, tt.expectedConfig.ConsulToken)
			}
			if config.ConsulDC != tt.expectedConfig.ConsulDC {
				t.Errorf("ConsulDC = %v, want %v", config.ConsulDC, tt.expectedConfig.ConsulDC)
			}
			if config.Port != tt.expectedConfig.Port {
				t.Errorf("Port = %v, want %v", config.Port, tt.expectedConfig.Port)
			}
			if config.LogLevel != tt.expectedConfig.LogLevel {
				t.Errorf("LogLevel = %v, want %v", config.LogLevel, tt.expectedConfig.LogLevel)
			}
		})
	}
}

func TestGetEnvOrDefault(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue string
		envValue     string
		expected     string
	}{
		{
			name:         "环境变量存在",
			key:          "TEST_KEY",
			defaultValue: "default",
			envValue:     "custom",
			expected:     "custom",
		},
		{
			name:         "环境变量不存在",
			key:          "NONEXISTENT_KEY",
			defaultValue: "default",
			envValue:     "",
			expected:     "default",
		},
		{
			name:         "环境变量为空",
			key:          "EMPTY_KEY",
			defaultValue: "default",
			envValue:     "",
			expected:     "default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 设置环境变量
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
			} else {
				os.Unsetenv(tt.key)
			}

			// 测试函数
			result := getEnvOrDefault(tt.key, tt.defaultValue)

			// 验证结果
			if result != tt.expected {
				t.Errorf("getEnvOrDefault(%s, %s) = %s, want %s", tt.key, tt.defaultValue, result, tt.expected)
			}

			// 清理环境变量
			os.Unsetenv(tt.key)
		})
	}
}

func TestGetEnvAsIntOrDefault(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue int
		envValue     string
		expected     int
	}{
		{
			name:         "有效整数",
			key:          "TEST_INT",
			defaultValue: 100,
			envValue:     "200",
			expected:     200,
		},
		{
			name:         "无效整数",
			key:          "TEST_INVALID_INT",
			defaultValue: 100,
			envValue:     "not-a-number",
			expected:     100,
		},
		{
			name:         "环境变量不存在",
			key:          "NONEXISTENT_INT",
			defaultValue: 100,
			envValue:     "",
			expected:     100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 设置环境变量
			if tt.envValue != "" {
				os.Setenv(tt.key, tt.envValue)
			} else {
				os.Unsetenv(tt.key)
			}

			// 测试函数
			result := getEnvAsIntOrDefault(tt.key, tt.defaultValue)

			// 验证结果
			if result != tt.expected {
				t.Errorf("getEnvAsIntOrDefault(%s, %d) = %d, want %d", tt.key, tt.defaultValue, result, tt.expected)
			}

			// 清理环境变量
			os.Unsetenv(tt.key)
		})
	}
}
