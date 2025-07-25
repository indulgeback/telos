package tlog

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// Logger 封装 slog.Logger 并提供额外功能
type Logger struct {
	*slog.Logger
	serviceName string
}

// Config 日志配置结构
type Config struct {
	Level       string `json:"level" mapstructure:"level"`
	Format      string `json:"format" mapstructure:"format"` // json, text, color
	Output      string `json:"output" mapstructure:"output"` // stdout, stderr, file, rotating, remote
	FilePath    string `json:"file_path" mapstructure:"file_path"`
	ServiceName string `json:"service_name" mapstructure:"service_name"`
	EnableColor bool   `json:"enable_color" mapstructure:"enable_color"` // 是否启用颜色
	AddSource   bool   `json:"add_source" mapstructure:"add_source"`     // 是否添加源码位置

	// 存储配置
	Storage *StorageConfig `json:"storage,omitempty" mapstructure:"storage"` // 文件轮转配置
	Remote  *RemoteConfig  `json:"remote,omitempty" mapstructure:"remote"`   // 远程日志配置
}

// DefaultConfig 返回默认日志配置
func DefaultConfig() *Config {
	return &Config{
		Level:       "info",
		Format:      "color",
		Output:      "stdout",
		ServiceName: "telos",
		EnableColor: true,
		AddSource:   false,
	}
}

var (
	defaultLogger *Logger
)

// New 创建新的日志实例
func New(config *Config) *Logger {
	if config == nil {
		config = DefaultConfig()
	}

	// 解析日志级别
	var level slog.Level
	switch strings.ToLower(config.Level) {
	case "debug":
		level = slog.LevelDebug
	case "info":
		level = slog.LevelInfo
	case "warn", "warning":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	// 设置输出写入器
	var writer io.Writer
	switch strings.ToLower(config.Output) {
	case "stderr":
		writer = os.Stderr
	case "file":
		if config.FilePath != "" {
			if file, err := os.OpenFile(config.FilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666); err == nil {
				writer = file
			} else {
				writer = os.Stdout
			}
		} else {
			writer = os.Stdout
		}
	case "rotating":
		if config.FilePath != "" {
			if rotatingWriter, err := NewRotatingFileWriter(config.FilePath, config.Storage); err == nil {
				writer = rotatingWriter
			} else {
				fmt.Printf("创建轮转文件写入器失败: %v，回退到标准输出\n", err)
				writer = os.Stdout
			}
		} else {
			writer = os.Stdout
		}
	case "remote":
		if config.Remote != nil && config.Remote.Endpoint != "" {
			writer = NewRemoteWriter(config.Remote)
		} else {
			fmt.Println("远程日志配置不完整，回退到标准输出")
			writer = os.Stdout
		}
	default:
		writer = os.Stdout
	}

	// 创建处理器选项
	opts := &slog.HandlerOptions{
		Level:     level,
		AddSource: config.AddSource,
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			// 为所有日志条目添加时间戳格式化
			if a.Key == slog.TimeKey {
				return slog.Attr{
					Key:   "timestamp",
					Value: slog.StringValue(time.Now().Format(time.RFC3339)),
				}
			}
			return a
		},
	}

	// 根据格式创建处理器
	var handler slog.Handler
	switch strings.ToLower(config.Format) {
	case "text":
		handler = slog.NewTextHandler(writer, opts)
	case "color":
		handler = NewColorHandler(writer, opts, config.ServiceName)
	default:
		handler = slog.NewJSONHandler(writer, opts)
	}

	logger := slog.New(handler)

	return &Logger{
		Logger:      logger,
		serviceName: config.ServiceName,
	}
}

// Init 初始化默认日志器
func Init(config *Config) {
	defaultLogger = New(config)
}

// Default 返回默认日志器实例
func Default() *Logger {
	if defaultLogger == nil {
		defaultLogger = New(DefaultConfig())
	}
	return defaultLogger
}

// WithContext 为日志器添加上下文信息
func (l *Logger) WithContext(ctx context.Context) *Logger {
	return &Logger{
		Logger:      l.Logger.With("trace_id", getTraceID(ctx)),
		serviceName: l.serviceName,
	}
}

// WithService 为日志器添加服务名
func (l *Logger) WithService(serviceName string) *Logger {
	return &Logger{
		Logger:      l.Logger.With("service", serviceName),
		serviceName: serviceName,
	}
}

// WithFields 为日志器添加结构化字段
func (l *Logger) WithFields(fields map[string]any) *Logger {
	args := make([]any, 0, len(fields)*2)
	for k, v := range fields {
		args = append(args, k, v)
	}
	return &Logger{
		Logger:      l.Logger.With(args...),
		serviceName: l.serviceName,
	}
}

// WithError 为日志器添加错误信息
func (l *Logger) WithError(err error) *Logger {
	if err == nil {
		return l
	}
	return &Logger{
		Logger:      l.Logger.With("error", err.Error()),
		serviceName: l.serviceName,
	}
}

// Debug 记录调试级别日志
func (l *Logger) Debug(msg string, args ...any) {
	l.Logger.Debug(msg, args...)
}

// Info 记录信息级别日志
func (l *Logger) Info(msg string, args ...any) {
	l.Logger.Info(msg, args...)
}

// Warn 记录警告级别日志
func (l *Logger) Warn(msg string, args ...any) {
	l.Logger.Warn(msg, args...)
}

// Error 记录错误级别日志
func (l *Logger) Error(msg string, args ...any) {
	l.Logger.Error(msg, args...)
}

// Debugf 记录格式化调试日志
func (l *Logger) Debugf(format string, args ...any) {
	l.Logger.Debug(fmt.Sprintf(format, args...))
}

// Infof 记录格式化信息日志
func (l *Logger) Infof(format string, args ...any) {
	l.Logger.Info(fmt.Sprintf(format, args...))
}

// Warnf 记录格式化警告日志
func (l *Logger) Warnf(format string, args ...any) {
	l.Logger.Warn(fmt.Sprintf(format, args...))
}

// Errorf 记录格式化错误日志
func (l *Logger) Errorf(format string, args ...any) {
	l.Logger.Error(fmt.Sprintf(format, args...))
}

// LogRequest 记录HTTP请求日志
func (l *Logger) LogRequest(method, path, userAgent, clientIP string, statusCode int, duration time.Duration) {
	l.Logger.Info("HTTP请求",
		"method", method,
		"path", path,
		"status_code", statusCode,
		"duration_ms", duration.Milliseconds(),
		"user_agent", userAgent,
		"client_ip", clientIP,
	)
}

// LogDBOperation 记录数据库操作日志
func (l *Logger) LogDBOperation(operation, table string, duration time.Duration, err error) {
	fields := []any{
		"operation", operation,
		"table", table,
		"duration_ms", duration.Milliseconds(),
	}

	if err != nil {
		fields = append(fields, "error", err.Error())
		l.Logger.Error("数据库操作失败", fields...)
	} else {
		l.Logger.Debug("数据库操作", fields...)
	}
}

// LogServiceCall 记录服务调用日志
func (l *Logger) LogServiceCall(service, method string, duration time.Duration, err error) {
	fields := []any{
		"target_service", service,
		"method", method,
		"duration_ms", duration.Milliseconds(),
	}

	if err != nil {
		fields = append(fields, "error", err.Error())
		l.Logger.Error("服务调用失败", fields...)
	} else {
		l.Logger.Info("服务调用", fields...)
	}
}

// getCaller 获取调用者信息的辅助函数
func getCaller(skip int) (string, int) {
	_, file, line, ok := runtime.Caller(skip)
	if !ok {
		return "unknown", 0
	}
	return filepath.Base(file), line
}

// getTraceID 从上下文中提取追踪ID的辅助函数
func getTraceID(ctx context.Context) string {
	if ctx == nil {
		return ""
	}

	// 尝试从上下文获取追踪ID
	if traceID := ctx.Value("trace_id"); traceID != nil {
		if id, ok := traceID.(string); ok {
			return id
		}
	}

	// 尝试从上下文获取请求ID
	if requestID := ctx.Value("request_id"); requestID != nil {
		if id, ok := requestID.(string); ok {
			return id
		}
	}

	return ""
}
