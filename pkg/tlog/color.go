package tlog

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// ANSI 颜色代码
const (
	ColorReset  = "\033[0m"
	ColorRed    = "\033[31m"
	ColorGreen  = "\033[32m"
	ColorYellow = "\033[33m"
	ColorBlue   = "\033[34m"
	ColorPurple = "\033[35m"
	ColorCyan   = "\033[36m"
	ColorWhite  = "\033[37m"
	ColorGray   = "\033[90m"

	// 背景色
	BgRed    = "\033[41m"
	BgGreen  = "\033[42m"
	BgYellow = "\033[43m"
	BgBlue   = "\033[44m"

	// 样式
	Bold      = "\033[1m"
	Dim       = "\033[2m"
	Italic    = "\033[3m"
	Underline = "\033[4m"
)

// ColorHandler 实现带颜色的日志处理器
type ColorHandler struct {
	writer      io.Writer
	opts        *slog.HandlerOptions
	serviceName string
	attrs       []slog.Attr
	groups      []string
}

// NewColorHandler 创建新的颜色处理器
func NewColorHandler(w io.Writer, opts *slog.HandlerOptions, serviceName string) *ColorHandler {
	if opts == nil {
		opts = &slog.HandlerOptions{}
	}
	return &ColorHandler{
		writer:      w,
		opts:        opts,
		serviceName: serviceName,
	}
}

// Enabled 检查是否启用指定级别的日志
func (h *ColorHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return level >= h.opts.Level.Level()
}

// Handle 处理日志记录
func (h *ColorHandler) Handle(ctx context.Context, r slog.Record) error {
	if !h.Enabled(ctx, r.Level) {
		return nil
	}

	// 构建彩色日志输出
	var buf strings.Builder

	// 时间戳
	timestamp := r.Time.Format("2006-01-02 15:04:05")
	buf.WriteString(ColorGray + timestamp + ColorReset + " ")

	// 日志级别（带颜色）
	levelStr := h.formatLevel(r.Level)
	buf.WriteString(levelStr + " ")

	// 服务名（如果有）
	if h.serviceName != "" {
		buf.WriteString(ColorCyan + "[" + h.serviceName + "]" + ColorReset + " ")
	}

	// 源码位置（如果启用）
	if h.opts.AddSource && r.PC != 0 {
		frame, _ := runtime.CallersFrames([]uintptr{r.PC}).Next()
		if frame.File != "" {
			source := fmt.Sprintf("%s:%d", getFileName(frame.File), frame.Line)
			buf.WriteString(ColorGray + source + ColorReset + " ")
		}
	}

	// 日志消息
	buf.WriteString(r.Message)

	// 处理属性
	attrs := make([]slog.Attr, 0, r.NumAttrs()+len(h.attrs))
	attrs = append(attrs, h.attrs...)
	r.Attrs(func(a slog.Attr) bool {
		attrs = append(attrs, a)
		return true
	})

	if len(attrs) > 0 {
		buf.WriteString(" ")
		h.formatAttrs(&buf, attrs)
	}

	buf.WriteString("\n")

	_, err := h.writer.Write([]byte(buf.String()))
	return err
}

// WithAttrs 返回带有指定属性的新处理器
func (h *ColorHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]slog.Attr, 0, len(h.attrs)+len(attrs))
	newAttrs = append(newAttrs, h.attrs...)
	newAttrs = append(newAttrs, attrs...)

	return &ColorHandler{
		writer:      h.writer,
		opts:        h.opts,
		serviceName: h.serviceName,
		attrs:       newAttrs,
		groups:      h.groups,
	}
}

// WithGroup 返回带有指定组的新处理器
func (h *ColorHandler) WithGroup(name string) slog.Handler {
	if name == "" {
		return h
	}

	newGroups := make([]string, 0, len(h.groups)+1)
	newGroups = append(newGroups, h.groups...)
	newGroups = append(newGroups, name)

	return &ColorHandler{
		writer:      h.writer,
		opts:        h.opts,
		serviceName: h.serviceName,
		attrs:       h.attrs,
		groups:      newGroups,
	}
}

// formatLevel 格式化日志级别（带颜色）
func (h *ColorHandler) formatLevel(level slog.Level) string {
	switch level {
	case slog.LevelDebug:
		return ColorGray + "DEBUG" + ColorReset
	case slog.LevelInfo:
		return ColorGreen + "INFO " + ColorReset
	case slog.LevelWarn:
		return ColorYellow + "WARN " + ColorReset
	case slog.LevelError:
		return ColorRed + "ERROR" + ColorReset
	default:
		return fmt.Sprintf("LEVEL(%d)", level)
	}
}

// formatAttrs 格式化属性（带颜色）
func (h *ColorHandler) formatAttrs(buf *strings.Builder, attrs []slog.Attr) {
	for i, attr := range attrs {
		if i > 0 {
			buf.WriteString(" ")
		}
		h.formatAttr(buf, attr)
	}
}

// formatAttr 格式化单个属性
func (h *ColorHandler) formatAttr(buf *strings.Builder, attr slog.Attr) {
	key := attr.Key
	value := attr.Value

	// 为特殊键使用不同颜色
	keyColor := h.getKeyColor(key)
	valueColor := h.getValueColor(key, value)

	buf.WriteString(keyColor + key + ColorReset + "=")
	buf.WriteString(valueColor + h.formatValue(value) + ColorReset)
}

// getKeyColor 根据键名获取颜色
func (h *ColorHandler) getKeyColor(key string) string {
	switch key {
	case "error":
		return ColorRed
	case "trace_id", "request_id":
		return ColorPurple
	case "service":
		return ColorCyan
	case "method", "operation":
		return ColorBlue
	case "duration_ms", "status_code":
		return ColorYellow
	default:
		return ColorWhite
	}
}

// getValueColor 根据键名和值获取颜色
func (h *ColorHandler) getValueColor(key string, value slog.Value) string {
	switch key {
	case "error":
		return ColorRed + Bold
	case "status_code":
		if code, err := strconv.Atoi(value.String()); err == nil {
			if code >= 200 && code < 300 {
				return ColorGreen
			} else if code >= 400 {
				return ColorRed
			}
		}
		return ColorYellow
	case "duration_ms":
		if duration, err := strconv.ParseFloat(value.String(), 64); err == nil {
			if duration > 1000 {
				return ColorRed
			} else if duration > 500 {
				return ColorYellow
			}
		}
		return ColorGreen
	default:
		return ColorWhite
	}
}

// formatValue 格式化值
func (h *ColorHandler) formatValue(value slog.Value) string {
	switch value.Kind() {
	case slog.KindString:
		return value.String()
	case slog.KindInt64:
		return strconv.FormatInt(value.Int64(), 10)
	case slog.KindUint64:
		return strconv.FormatUint(value.Uint64(), 10)
	case slog.KindFloat64:
		return strconv.FormatFloat(value.Float64(), 'f', -1, 64)
	case slog.KindBool:
		return strconv.FormatBool(value.Bool())
	case slog.KindDuration:
		return value.Duration().String()
	case slog.KindTime:
		return value.Time().Format(time.RFC3339)
	default:
		return value.String()
	}
}

// getFileName 从完整路径中提取文件名
func getFileName(path string) string {
	parts := strings.Split(path, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return path
}

// IsColorSupported 检查终端是否支持颜色
func IsColorSupported() bool {
	// 检查是否在终端中运行
	if !isTerminal(os.Stdout) {
		return false
	}

	// 检查环境变量
	term := os.Getenv("TERM")
	if term == "" || term == "dumb" {
		return false
	}

	// 检查 NO_COLOR 环境变量
	if os.Getenv("NO_COLOR") != "" {
		return false
	}

	// 检查 FORCE_COLOR 环境变量
	if os.Getenv("FORCE_COLOR") != "" {
		return true
	}

	return true
}

// isTerminal 检查是否为终端
func isTerminal(f *os.File) bool {
	stat, err := f.Stat()
	if err != nil {
		return false
	}
	return (stat.Mode() & os.ModeCharDevice) != 0
}
