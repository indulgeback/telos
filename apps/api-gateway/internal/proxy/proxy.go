package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

// ProxyHandler 处理代理转发请求
// 会将收到的请求转发到后端服务（如 auth-service），目标地址通过环境变量配置
// 适合微服务架构下的 API Gateway 场景
func ProxyHandler(w http.ResponseWriter, r *http.Request) {
	target := os.Getenv("AUTH_SERVICE_URL") // 目标服务地址
	if target == "" {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("未配置后端服务地址"))
		return
	}
	// 解析目标地址
	targetURL, err := url.Parse(target)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("后端服务地址无效"))
		return
	}

	// 创建反向代理并转发请求
	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	proxy.ServeHTTP(w, r)
}
