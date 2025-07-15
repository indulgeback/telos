package errors

import "errors"

// 定义通用错误
var (
	ErrUnauthorized = errors.New("未授权")
	ErrNotFound     = errors.New("未找到")
	ErrInternal     = errors.New("内部错误")
)
