package proxy

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/indulgeback/telos/apps/api-gateway/internal/service"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/labstack/echo/v4"
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

// EchoHandler 返回一个 Echo handler，使用原始 ResponseWriter 支持流式响应
func (pm *ProxyManager) EchoHandler(c echo.Context) error {
	// 判断是否为流式请求路径
	if isStreamPath(c.Request().URL.Path) {
		return pm.StreamProxy(c)
	}
	// 非流式请求使用标准代理
	pm.ServeHTTP(c.Response().Writer, c.Request())
	return nil
}

// isStreamPath 判断是否为流式响应路径
func isStreamPath(path string) bool {
	streamPaths := []string{
		"/api/agent",
	}
	for _, sp := range streamPaths {
		if strings.HasPrefix(path, sp) {
			return true
		}
	}
	return false
}

// StreamProxy 流式代理处理器（SSE）
// 使用 io.Copy 将后端流式数据实时传输到前端，避免 httputil.ReverseProxy 的 Flush 问题
func (pm *ProxyManager) StreamProxy(c echo.Context) error {
	// 1. 查找匹配的路由
	route := pm.findRoute(c.Request().URL.Path)
	if route == nil {
		tlog.Warn("未找到匹配路由", "path", c.Request().URL.Path)
		return echo.NewHTTPError(http.StatusNotFound, "未找到匹配的服务路由")
	}

	// 2. 服务发现
	target, err := pm.discovery.Discover(route.ServiceName)
	if err != nil {
		tlog.Error("服务发现失败", "service", route.ServiceName, "error", err)
		return echo.NewHTTPError(http.StatusServiceUnavailable, fmt.Sprintf("服务 %s 不可用", route.ServiceName))
	}

	// 3. 构建目标 URL，处理 StripPrefix
	if !strings.HasPrefix(target, "http://") && !strings.HasPrefix(target, "https://") {
		target = "http://" + target
	}

	// 处理路径前缀
	requestPath := c.Request().URL.Path
	if route.StripPrefix {
		requestPath = strings.TrimPrefix(requestPath, route.Path)
		if !strings.HasPrefix(requestPath, "/") {
			requestPath = "/" + requestPath
		}
	}
	targetURL := target + requestPath

	tlog.Info("[API Gateway] 流式代理请求",
		"method", c.Request().Method,
		"path", c.Request().URL.Path,
		"target", targetURL,
		"strip_prefix", route.StripPrefix,
	)

	// 4. 创建转发请求
	req, err := http.NewRequestWithContext(c.Request().Context(), c.Request().Method, targetURL, c.Request().Body)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "创建转发请求失败")
	}

	// 复制请求头
	for name, values := range c.Request().Header {
		for _, value := range values {
			req.Header.Add(name, value)
		}
	}
	// 更新 Host 头
	req.Host = ""
	req.Header.Set("X-Forwarded-Host", c.Request().Host)
	req.Header.Set("X-Forwarded-Proto", getScheme(c.Request()))

	// 5. 发起请求
	client := &http.Client{
		Timeout: 0, // 流式响应不设置超时
	}
	resp, err := client.Do(req)
	if err != nil {
		tlog.Error("[API Gateway] 流式代理请求失败", "error", err)
		return echo.NewHTTPError(http.StatusBadGateway, "后端服务请求失败")
	}
	defer resp.Body.Close()

	// 6. 复制后端响应头到前端（包括关键的 AI SDK 协议头）
	for name, values := range resp.Header {
		// 跳过 Content-Encoding 和 Transfer-Encoding，让 Go 自动处理
		if strings.EqualFold(name, "Content-Encoding") || strings.EqualFold(name, "Transfer-Encoding") {
			continue
		}
		for _, value := range values {
			c.Response().Header().Add(name, value)
		}
	}
	// 确保关键响应头存在
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().Header().Set("X-Accel-Buffering", "no")

	tlog.Debug("[API Gateway] 流式代理响应头", "content_type", resp.Header.Get("Content-Type"))

	// 7. 写入状态码
	c.Response().WriteHeader(resp.StatusCode)

	// 8. 流式拷贝：使用小缓冲区边读边写，每次写入后立即 flush
	// 不使用 io.Copy，因为它使用 32KB 缓冲区，会导致 SSE 延迟
	buffer := make([]byte, 256) // 小缓冲区，确保低延迟
	written := int64(0)
	flusher, ok := c.Response().Writer.(http.Flusher)
	if !ok {
		return echo.NewHTTPError(http.StatusInternalServerError, "不支持流式响应")
	}

	for {
		n, err := resp.Body.Read(buffer)
		if n > 0 {
			if _, writeErr := c.Response().Writer.Write(buffer[:n]); writeErr != nil {
				tlog.Debug("[API Gateway] 写入响应失败", "error", writeErr)
				return nil
			}
			flusher.Flush() // 立即 flush，确保数据实时发送
			written += int64(n)
		}
		if err != nil {
			if err == io.EOF {
				break
			}
			tlog.Debug("[API Gateway] 流式传输结束", "written", written, "error", err)
			return nil
		}
	}

	tlog.Info("[API Gateway] 流式传输完成", "bytes", written)
	return nil
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

	// 记录请求详情（特别是 /api/agent 路径）
	if r.URL.Path == "/api/agent" {
		tlog.Info("[API Gateway] 转发聊天请求",
			"method", r.Method,
			"path", r.URL.Path,
			"service", route.ServiceName,
			"target", target,
			"content_type", r.Header.Get("Content-Type"),
		)
	}

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

	// 设置响应修改器（用于调试和确保响应头正确转发）
	proxy.ModifyResponse = func(resp *http.Response) error {
		// 记录响应状态和关键响应头
		tlog.Debug("代理响应",
			"status", resp.Status,
			"content_type", resp.Header.Get("Content-Type"),
		)
		return nil
	}

	// 设置超时（流式响应需要完整的超时配置，而不是仅 ResponseHeaderTimeout）
	if route.Timeout > 0 {
		proxy.Transport = &http.Transport{
			// 对于流式响应，不使用 ResponseHeaderTimeout，因为它可能会中断正在进行的流
			// 使用 DialContext 超时来控制连接建立
			DialContext: (&net.Dialer{
				Timeout:   30 * time.Second, // 连接超时
				KeepAlive: 30 * time.Second,
			}).DialContext,
			// 设置较大的空闲超时以支持长连接
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			// 不设置 ResponseHeaderTimeout，允许流式响应持续进行
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
