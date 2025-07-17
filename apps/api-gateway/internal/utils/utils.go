package utils

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// GenerateRequestID 生成请求ID
func GenerateRequestID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// WriteJSONResponse 写入JSON响应
func WriteJSONResponse(w http.ResponseWriter, data interface{}, statusCode int) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	return json.NewEncoder(w).Encode(data)
}

// WriteErrorResponse 写入错误响应
func WriteErrorResponse(w http.ResponseWriter, message string, statusCode int) error {
	errorResp := map[string]interface{}{
		"error":     http.StatusText(statusCode),
		"message":   message,
		"code":      statusCode,
		"timestamp": time.Now().Unix(),
	}
	return WriteJSONResponse(w, errorResp, statusCode)
}

// ParseBearerToken 解析Bearer token
func ParseBearerToken(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return ""
	}
	
	return parts[1]
}

// GetClientIP 获取客户端真实IP
func GetClientIP(r *http.Request) string {
	// 检查 X-Forwarded-For 头
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	
	// 检查 X-Real-IP 头
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	
	// 检查 X-Forwarded-Host 头
	if xfh := r.Header.Get("X-Forwarded-Host"); xfh != "" {
		return xfh
	}
	
	// 使用 RemoteAddr
	ip := r.RemoteAddr
	if colon := strings.LastIndex(ip, ":"); colon != -1 {
		ip = ip[:colon]
	}
	
	return ip
}

// ValidateURL 验证URL格式
func ValidateURL(urlStr string) error {
	if urlStr == "" {
		return fmt.Errorf("URL不能为空")
	}
	
	if !strings.HasPrefix(urlStr, "http://") && !strings.HasPrefix(urlStr, "https://") {
		return fmt.Errorf("URL必须以http://或https://开头")
	}
	
	return nil
}

// SanitizePath 清理路径
func SanitizePath(path string) string {
	// 移除多余的斜杠
	path = strings.ReplaceAll(path, "//", "/")
	
	// 确保以/开头
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	
	return path
}

// IsHealthCheckPath 检查是否为健康检查路径
func IsHealthCheckPath(path string) bool {
	healthPaths := []string{"/health", "/ping", "/status", "/healthz"}
	for _, healthPath := range healthPaths {
		if path == healthPath {
			return true
		}
	}
	return false
}

// MergeHeaders 合并HTTP头
func MergeHeaders(dst, src http.Header) {
	for key, values := range src {
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}
