package proxy

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/indulgeback/telos/apps/api-gateway/internal/service"
	"github.com/indulgeback/telos/pkg/tlog"
)

// RouteConfig 路由配置
type RouteConfig struct {
	Path        string `json:"path"`        // 路径前缀，如 /api/auth
	ServiceName string `json:"service"`     // 服务名称
	StripPrefix bool   `json:"stripPrefix"` // 是否去掉路径前缀
	Timeout     int    `json:"timeout"`     // 超时时间（秒）
}

// ProxyManager 代理管理器
type ProxyManager struct {
	routes    []RouteConfig
	discovery service.ServiceDiscovery
	proxies   map[string]*httputil.ReverseProxy
}

// NewProxyManager 创建代理管理器
func NewProxyManager(discovery service.ServiceDiscovery) *ProxyManager {
	return &ProxyManager{
		discovery: discovery,
		proxies:   make(map[string]*httputil.ReverseProxy),
	}
}

// LoadRoutes 加载路由配置
func (pm *ProxyManager) LoadRoutes(routes []RouteConfig) {
	pm.routes = routes
	tlog.Info("路由配置加载完成", "count", len(routes))
}

// ServeHTTP 实现 http.Handler 接口
func (pm *ProxyManager) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 查找匹配的路由
	route := pm.findRoute(r.URL.Path)
	if route == nil {
		tlog.Warn("未找到匹配路由", "path", r.URL.Path, "method", r.Method)
		writeErrorResponse(w, "未找到匹配的服务路由", http.StatusNotFound)
		return
	}

	tlog.Debug("路由匹配成功", "path", r.URL.Path, "service", route.ServiceName, "strip_prefix", route.StripPrefix)

	// 发现服务实例
	target, err := pm.discovery.Discover(route.ServiceName)
	if err != nil {
		tlog.Error("服务发现失败", "service", route.ServiceName, "error", err)
		writeErrorResponse(w, fmt.Sprintf("服务 %s 不可用: %v", route.ServiceName, err), http.StatusServiceUnavailable)
		return
	}

	tlog.Debug("服务实例发现成功", "service", route.ServiceName, "target", target)

	// 获取或创建代理
	proxy, err := pm.getProxy(target, route)
	if err != nil {
		writeErrorResponse(w, fmt.Sprintf("创建代理失败: %v", err), http.StatusInternalServerError)
		return
	}

	// 处理路径前缀
	if route.StripPrefix {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, route.Path)
		if !strings.HasPrefix(r.URL.Path, "/") {
			r.URL.Path = "/" + r.URL.Path
		}
	}

	// 设置请求头
	r.Header.Set("X-Forwarded-Host", r.Host)
	r.Header.Set("X-Forwarded-Proto", getScheme(r))

	// 转发请求
	proxy.ServeHTTP(w, r)
}

// findRoute 查找匹配的路由
func (pm *ProxyManager) findRoute(path string) *RouteConfig {
	var bestMatch *RouteConfig
	maxLen := 0

	for i := range pm.routes {
		route := &pm.routes[i]
		if strings.HasPrefix(path, route.Path) && len(route.Path) > maxLen {
			bestMatch = route
			maxLen = len(route.Path)
		}
	}

	return bestMatch
}

// getProxy 获取或创建代理
func (pm *ProxyManager) getProxy(target string, route *RouteConfig) (*httputil.ReverseProxy, error) {
	key := fmt.Sprintf("%s:%s", target, route.ServiceName)

	if proxy, exists := pm.proxies[key]; exists {
		return proxy, nil
	}

	// 检查 target 是否包含协议，若无则补全为 http://
	if !strings.HasPrefix(target, "http://") && !strings.HasPrefix(target, "https://") {
		target = "http://" + target
	}

	targetURL, err := url.Parse(target)
	if err != nil {
		return nil, fmt.Errorf("解析目标地址失败: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	// 设置超时
	if route.Timeout > 0 {
		proxy.Transport = &http.Transport{
			ResponseHeaderTimeout: time.Duration(route.Timeout) * time.Second,
		}
	}

	// 设置错误处理
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		tlog.Error("代理请求失败", "target", target, "path", r.URL.Path, "error", err)
		writeErrorResponse(w, "后端服务错误", http.StatusBadGateway)
	}

	pm.proxies[key] = proxy
	return proxy, nil
}

// ProxyHandler 简单的代理处理器（向后兼容）
func ProxyHandler(authServiceURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if authServiceURL == "" {
			writeErrorResponse(w, "未配置后端服务地址", http.StatusInternalServerError)
			return
		}

		targetURL, err := url.Parse(authServiceURL)
		if err != nil {
			writeErrorResponse(w, "后端服务地址无效", http.StatusInternalServerError)
			return
		}

		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
			tlog.Error("简单代理请求失败", "auth_service_url", authServiceURL, "path", r.URL.Path, "error", err)
			writeErrorResponse(w, "后端服务错误", http.StatusBadGateway)
		}

		proxy.ServeHTTP(w, r)
	}
}

// writeErrorResponse 写入错误响应
func writeErrorResponse(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	errorResp := map[string]any{
		"error":   http.StatusText(code),
		"message": message,
		"code":    code,
	}

	json.NewEncoder(w).Encode(errorResp)
}

// getScheme 获取请求协议
func getScheme(r *http.Request) string {
	if r.TLS != nil {
		return "https"
	}
	if scheme := r.Header.Get("X-Forwarded-Proto"); scheme != "" {
		return scheme
	}
	return "http"
}
