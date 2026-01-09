package netutil

import (
	"fmt"
	"net"
	"os"
)

// GetLocalIP 获取本地IP地址
// 优先使用环境变量 SERVICE_ADDRESS，如果未设置则自动检测
func GetLocalIP() string {
	// 优先从环境变量读取
	if addr := os.Getenv("SERVICE_ADDRESS"); addr != "" {
		return addr
	}

	// 自动检测本地IP
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}

	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}

	return "localhost"
}

// GetServiceAddress 获取服务注册地址
// 支持通过环境变量 SERVICE_ADDRESS 指定，否则自动检测本地IP
func GetServiceAddress() string {
	return GetLocalIP()
}

// GetHealthCheckURL 获取健康检查URL
func GetHealthCheckURL(port int, path string) string {
	address := GetServiceAddress()
	if address == "localhost" {
		address = "127.0.0.1"
	}
	return fmt.Sprintf("http://%s:%d%s", address, port, path)
}
