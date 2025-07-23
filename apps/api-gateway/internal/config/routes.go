package config

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"

	"github.com/indulgeback/telos/apps/api-gateway/internal/proxy"
)

// LoadRoutesFromFile 从文件加载路由配置
func LoadRoutesFromFile(filePath string) ([]proxy.RouteConfig, error) {
	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("路由配置文件不存在: %s", filePath)
	}

	// 读取文件内容
	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取路由配置文件失败: %v", err)
	}

	// 解析JSON
	var routes []proxy.RouteConfig
	if err := json.Unmarshal(data, &routes); err != nil {
		return nil, fmt.Errorf("解析路由配置失败: %v", err)
	}

	log.Printf("从文件 %s 加载了 %d 个路由配置", filePath, len(routes))
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
	if err := ioutil.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("写入路由配置文件失败: %v", err)
	}

	log.Printf("已将 %d 个路由配置保存到文件 %s", len(routes), filePath)
	return nil
}

// GetDefaultRoutes 获取默认路由配置
func GetDefaultRoutes() []proxy.RouteConfig {
	return []proxy.RouteConfig{
		{
			Path:        "/api/auth",
			ServiceName: "auth-service",
			StripPrefix: true,
			Timeout:     10,
		},
		{
			Path:        "/api/users",
			ServiceName: "user-service",
			StripPrefix: true,
			Timeout:     10,
		},
	}
}
