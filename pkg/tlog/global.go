package tlog

import (
	"context"
	"time"
)

// 使用默认日志器的全局便利函数

// Debug 使用默认日志器记录调试消息
func Debug(msg string, args ...any) {
	Default().Debug(msg, args...)
}

// Info 使用默认日志器记录信息消息
func Info(msg string, args ...any) {
	Default().Info(msg, args...)
}

// Warn 使用默认日志器记录警告消息
func Warn(msg string, args ...any) {
	Default().Warn(msg, args...)
}

// Error 使用默认日志器记录错误消息
func Error(msg string, args ...any) {
	Default().Error(msg, args...)
}

// Debugf 使用默认日志器记录格式化调试消息
func Debugf(format string, args ...any) {
	Default().Debugf(format, args...)
}

// Infof 使用默认日志器记录格式化信息消息
func Infof(format string, args ...any) {
	Default().Infof(format, args...)
}

// Warnf 使用默认日志器记录格式化警告消息
func Warnf(format string, args ...any) {
	Default().Warnf(format, args...)
}

// Errorf 使用默认日志器记录格式化错误消息
func Errorf(format string, args ...any) {
	Default().Errorf(format, args...)
}

// WithContext 返回带有上下文信息的日志器
func WithContext(ctx context.Context) *Logger {
	return Default().WithContext(ctx)
}

// WithService 返回带有服务名的日志器
func WithService(serviceName string) *Logger {
	return Default().WithService(serviceName)
}

// WithFields 返回带有额外字段的日志器
func WithFields(fields map[string]any) *Logger {
	return Default().WithFields(fields)
}

// WithError 返回带有错误信息的日志器
func WithError(err error) *Logger {
	return Default().WithError(err)
}

// LogRequest 使用默认日志器记录HTTP请求信息
func LogRequest(method, path, userAgent, clientIP string, statusCode int, duration time.Duration) {
	Default().LogRequest(method, path, userAgent, clientIP, statusCode, duration)
}

// LogDBOperation 使用默认日志器记录数据库操作
func LogDBOperation(operation, table string, duration time.Duration, err error) {
	Default().LogDBOperation(operation, table, duration, err)
}

// LogServiceCall 使用默认日志器记录服务调用
func LogServiceCall(service, method string, duration time.Duration, err error) {
	Default().LogServiceCall(service, method, duration, err)
}
