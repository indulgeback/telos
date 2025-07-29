package config

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/indulgeback/telos/apps/api-gateway/internal/proxy"
	"github.com/indulgeback/telos/pkg/tlog"
)

// LoadRoutesFromFile 从文件加载路由配置
func LoadRoutesFromFile(filePath string) ([]proxy.RouteConfig, error) {
	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("路由配置文件不存在: %s", filePath)
	}

	// 读取文件内容
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取路由配置文件失败: %v", err)
	}

	// 解析JSON
	var routes []proxy.RouteConfig
	if err := json.Unmarshal(data, &routes); err != nil {
		return nil, fmt.Errorf("解析路由配置失败: %v", err)
	}

	tlog.Info("路由配置加载成功", "file", filePath, "count", len(routes))
	return routes, nil
}

// SaveRoutesToFile 保存路由配置到文件
func SaveRoutesToFile(routes []proxy.RouteConfig, filePath string) error {
	// 将路由配置转换为JSON
	data, err := json.MarshalIndent(routes, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化路由配置失败: %v", err)
	}

	// 写入文件
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("写入路由配置文件失败: %v", err)
	}

	tlog.Info("路由配置保存成功", "file", filePath, "count", len(routes))
	return nil
}

// GetDefaultRoutes 获取默认路由配置
func GetDefaultRoutes() []proxy.RouteConfig {
	return []proxy.RouteConfig{
		{
			Path:        "/api/auth",
			ServiceName: "auth-service",
			StripPrefix: false,
			Timeout:     10,
		},
		{
			Path:        "/api/users",
			ServiceName: "user-service",
			StripPrefix: false,
			Timeout:     10,
		},
	}
}
