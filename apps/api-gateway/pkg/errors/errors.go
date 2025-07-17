package errors

import (
	"errors"
	"fmt"
	"net/http"
)

// 定义通用错误
var (
	ErrUnauthorized      = errors.New("未授权")
	ErrNotFound          = errors.New("未找到")
	ErrInternal          = errors.New("内部错误")
	ErrBadRequest        = errors.New("请求参数错误")
	ErrForbidden         = errors.New("禁止访问")
	ErrServiceUnavailable = errors.New("服务不可用")
	ErrTooManyRequests   = errors.New("请求过于频繁")
	ErrBadGateway        = errors.New("网关错误")
)

// APIError API错误结构
type APIError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Error 实现error接口
func (e *APIError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s", e.Message, e.Details)
	}
	return e.Message
}

// NewAPIError 创建API错误
func NewAPIError(code int, message string, details ...string) *APIError {
	err := &APIError{
		Code:    code,
		Message: message,
	}
	if len(details) > 0 {
		err.Details = details[0]
	}
	return err
}

// 预定义的API错误
var (
	ErrAPIUnauthorized      = NewAPIError(http.StatusUnauthorized, "未授权访问")
	ErrAPINotFound          = NewAPIError(http.StatusNotFound, "资源未找到")
	ErrAPIBadRequest        = NewAPIError(http.StatusBadRequest, "请求参数错误")
	ErrAPIForbidden         = NewAPIError(http.StatusForbidden, "禁止访问")
	ErrAPIInternalServer    = NewAPIError(http.StatusInternalServerError, "服务器内部错误")
	ErrAPIServiceUnavailable = NewAPIError(http.StatusServiceUnavailable, "服务不可用")
	ErrAPITooManyRequests   = NewAPIError(http.StatusTooManyRequests, "请求过于频繁")
	ErrAPIBadGateway        = NewAPIError(http.StatusBadGateway, "网关错误")
)

// ErrorHandler 错误处理器接口
type ErrorHandler interface {
	HandleError(w http.ResponseWriter, r *http.Request, err error)
}

// DefaultErrorHandler 默认错误处理器
type DefaultErrorHandler struct{}

// HandleError 处理错误
func (h *DefaultErrorHandler) HandleError(w http.ResponseWriter, r *http.Request, err error) {
	var apiErr *APIError
	
	// 检查是否为APIError
	if errors.As(err, &apiErr) {
		writeErrorResponse(w, apiErr)
		return
	}
	
	// 根据错误类型映射到APIError
	switch {
	case errors.Is(err, ErrUnauthorized):
		writeErrorResponse(w, ErrAPIUnauthorized)
	case errors.Is(err, ErrNotFound):
		writeErrorResponse(w, ErrAPINotFound)
	case errors.Is(err, ErrBadRequest):
		writeErrorResponse(w, ErrAPIBadRequest)
	case errors.Is(err, ErrForbidden):
		writeErrorResponse(w, ErrAPIForbidden)
	case errors.Is(err, ErrServiceUnavailable):
		writeErrorResponse(w, ErrAPIServiceUnavailable)
	case errors.Is(err, ErrTooManyRequests):
		writeErrorResponse(w, ErrAPITooManyRequests)
	case errors.Is(err, ErrBadGateway):
		writeErrorResponse(w, ErrAPIBadGateway)
	default:
		// 未知错误，返回内部服务器错误
		internalErr := NewAPIError(http.StatusInternalServerError, "服务器内部错误", err.Error())
		writeErrorResponse(w, internalErr)
	}
}

// writeErrorResponse 写入错误响应
func writeErrorResponse(w http.ResponseWriter, err *APIError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(err.Code)
	
	// 简化的JSON响应
	response := fmt.Sprintf(`{"error":"%s","message":"%s","code":%d}`, 
		http.StatusText(err.Code), err.Message, err.Code)
	
	if err.Details != "" {
		response = fmt.Sprintf(`{"error":"%s","message":"%s","details":"%s","code":%d}`, 
			http.StatusText(err.Code), err.Message, err.Details, err.Code)
	}
	
	w.Write([]byte(response))
}
