package proxy

import "net/http"

// ProxyHandler 处理代理转发
func ProxyHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: 实现代理转发逻辑
	w.Write([]byte("代理转发中..."))
}
