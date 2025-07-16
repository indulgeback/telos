package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"
)

// VerifyRequest 用于向 auth-service 发送 token 校验请求
// token 字段为待校验的 JWT 或其他令牌
type VerifyRequest struct {
	Token string `json:"token"`
}

// VerifyResponse 表示 auth-service 返回的校验结果
// Valid 表示 token 是否有效，UserID 可选返回用户ID
type VerifyResponse struct {
	Valid  bool   `json:"valid"`
	UserID string `json:"user_id"`
}

// AuthMiddleware 认证中间件，调用 auth-service 校验 token
// 拦截请求，读取 Authorization 头部，远程校验
// 校验失败返回 401，成功则放行
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization") // 获取 token
		if token == "" {
			http.Error(w, "未提供 token", http.StatusUnauthorized)
			return
		}

		// 去掉 Bearer 前缀
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		authServiceURL := os.Getenv("AUTH_SERVICE_URL") // 认证服务地址
		if authServiceURL == "" {
			http.Error(w, "未配置认证服务地址", http.StatusInternalServerError)
			return
		}

		verifyURL := authServiceURL + "/api/v1/auth/verify"
		body, _ := json.Marshal(VerifyRequest{Token: token})
		resp, err := http.Post(verifyURL, "application/json", bytes.NewReader(body))
		if err != nil {
			http.Error(w, "认证服务不可用", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			http.Error(w, "token 无效", http.StatusUnauthorized)
			return
		}

		respBody, _ := io.ReadAll(resp.Body)
		var verifyResp VerifyResponse
		_ = json.Unmarshal(respBody, &verifyResp)
		if !verifyResp.Valid {
			http.Error(w, "token 校验失败", http.StatusUnauthorized)
			return
		}

		// 可将 user_id 写入 context，供后续 handler 使用
		next.ServeHTTP(w, r)
	})
}
