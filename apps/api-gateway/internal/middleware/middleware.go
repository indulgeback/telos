package middleware

import "net/http"

// AuthMiddleware 示例：认证中间件
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// TODO: 实现认证逻辑
		next.ServeHTTP(w, r)
	})
}
