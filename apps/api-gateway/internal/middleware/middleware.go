package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/indulgeback/telos/apps/api-gateway/internal/config"
	"github.com/indulgeback/telos/pkg/tlog"
)

// contextKey 自定义 context key 类型，避免字符串冲突
type contextKey string

const (
	userIDKey contextKey = "user_id"
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

// ErrorResponse 统一错误响应格式
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Code    int    `json:"code"`
}

// AuthMiddleware 认证中间件，调用 auth-service 校验 token
// 拦截请求，读取 Authorization 头部，远程校验
// 校验失败返回 401
func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := r.Header.Get("Authorization") // 获取 token
			if token == "" {
				writeErrorResponse(w, "未提供认证令牌", http.StatusUnauthorized)
				return
			}

			// 去掉 Bearer 前缀
			if len(token) > 7 && token[:7] == "Bearer " {
				token = token[7:]
			}

			authServiceURL := cfg.AuthServiceURL // 认证服务地址
			if authServiceURL == "" {
				writeErrorResponse(w, "未配置认证服务地址", http.StatusInternalServerError)
				return
			}

			verifyURL := authServiceURL + "/api/v1/auth/verify"
			body, _ := json.Marshal(VerifyRequest{Token: token})
			resp, err := http.Post(verifyURL, "application/json", bytes.NewReader(body))
			if err != nil {
				writeErrorResponse(w, "认证服务不可用", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				writeErrorResponse(w, "token 无效", http.StatusUnauthorized)
				return
			}

			respBody, _ := io.ReadAll(resp.Body)
			var verifyResp VerifyResponse
			if err := json.Unmarshal(respBody, &verifyResp); err != nil {
				writeErrorResponse(w, "token校验失败", http.StatusUnauthorized)
				return
			}

			if !verifyResp.Valid {
				writeErrorResponse(w, "token校验失败", http.StatusUnauthorized)
				return
			}

			// 可将 user_id 写入 context，供后续 handler 使用
			ctx := context.WithValue(r.Context(), userIDKey, verifyResp.UserID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// LoggingMiddleware 日志中间件，记录请求和响应信息
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// 包装 ResponseWriter 以捕获状态码
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)

		// 记录请求日志
		tlog.LogRequest(r.Method, r.URL.Path, r.UserAgent(), getClientIP(r), wrapped.statusCode, duration)
	})
}

// CORSMiddleware CORS 中间件，处理跨域请求
func CORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// 检查是否允许该来源
			allowed := false
			allowAll := false
			for _, allowedOrigin := range allowedOrigins {
				if allowedOrigin == "*" {
					allowed = true
					allowAll = true
					break
				}
				if allowedOrigin == origin {
					allowed = true
					break
				}
			}

			if allowed {
				if allowAll {
					// 通配符时，如果有具体的 origin，则使用具体 origin 并设置 credentials
					// 这允许 credentials 模式工作
					if origin != "" {
						w.Header().Set("Access-Control-Allow-Origin", origin)
						w.Header().Set("Access-Control-Allow-Credentials", "true")
						w.Header().Set("Vary", "Origin")
					} else {
						// 没有 origin 头（如同源请求或非浏览器请求），使用 *
						w.Header().Set("Access-Control-Allow-Origin", "*")
					}
				} else {
					// 具体来源时可以设置 credentials
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-ID, X-Agent-ID")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID, Content-Type")

			// 处理预检请求
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimitMiddleware 限流中间件，基于令牌桶算法
func RateLimitMiddleware(requests int, window time.Duration) func(http.Handler) http.Handler {
	// 简单的内存限流器
	limiter := &rateLimiter{
		requests: requests,
		window:   window,
		tokens:   make(map[string][]time.Time),
		mu:       &sync.RWMutex{},
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 使用客户端 IP 作为限流键
			clientIP := getClientIP(r)

			if !limiter.Allow(clientIP) {
				writeErrorResponse(w, "请求过于频繁，请稍后再试", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// writeErrorResponse 写入错误响应
func writeErrorResponse(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)

	errorResp := ErrorResponse{
		Error:   http.StatusText(code),
		Message: message,
		Code:    code,
	}

	json.NewEncoder(w).Encode(errorResp)
}

// responseWriter 包装 ResponseWriter 以捕获状态码
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Flush 实现 http.Flusher 接口，支持 SSE 流式响应
func (rw *responseWriter) Flush() {
	if flusher, ok := rw.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

// Hijack 实现 http.Hijacker 接口，支持 WebSocket
func (rw *responseWriter) Hijack() (c any, rw2 any, err error) {
	if hijacker, ok := rw.ResponseWriter.(http.Hijacker); ok {
		return hijacker.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}

// rateLimiter 简单的限流器实现
type rateLimiter struct {
	requests int
	window   time.Duration
	tokens   map[string][]time.Time
	mu       *sync.RWMutex
}

func (rl *rateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// 清理过期的令牌
	if times, exists := rl.tokens[key]; exists {
		var valid []time.Time
		for _, t := range times {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		rl.tokens[key] = valid
	}

	// 检查是否超过限制
	if len(rl.tokens[key]) >= rl.requests {
		return false
	}

	// 添加新令牌
	rl.tokens[key] = append(rl.tokens[key], now)
	return true
}

// getClientIP 获取客户端真实 IP
func getClientIP(r *http.Request) string {
	// 检查代理头
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		ips := strings.Split(ip, ",")
		return strings.TrimSpace(ips[0])
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}

	// 返回远程地址
	return r.RemoteAddr
}
