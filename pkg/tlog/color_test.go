package tlog

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"
)

func TestColorHandler(t *testing.T) {
	var buf bytes.Buffer

	opts := &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}

	handler := NewColorHandler(&buf, opts, "测试服务")
	logger := slog.New(handler)

	// 测试不同级别的日志
	logger.Debug("这是调试消息")
	logger.Info("这是信息消息")
	logger.Warn("这是警告消息")
	logger.Error("这是错误消息")

	output := buf.String()

	// 检查是否包含颜色代码
	if !strings.Contains(output, ColorGray) {
		t.Error("输出应该包含灰色代码")
	}
	if !strings.Contains(output, ColorGreen) {
		t.Error("输出应该包含绿色代码")
	}
	if !strings.Contains(output, ColorYellow) {
		t.Error("输出应该包含黄色代码")
	}
	if !strings.Contains(output, ColorRed) {
		t.Error("输出应该包含红色代码")
	}

	// 检查是否包含服务名
	if !strings.Contains(output, "[测试服务]") {
		t.Error("输出应该包含服务名")
	}
}

func TestColorHandlerWithAttrs(t *testing.T) {
	var buf bytes.Buffer

	opts := &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}

	handler := NewColorHandler(&buf, opts, "测试服务")
	logger := slog.New(handler)

	// 测试带属性的日志
	logger.Info("HTTP请求",
		"method", "GET",
		"path", "/api/users",
		"status_code", 200,
		"duration_ms", 150.5,
		"error", "连接超时",
	)

	output := buf.String()

	// 检查属性是否存在（不检查具体格式，因为有颜色代码）
	if !strings.Contains(output, "method") {
		t.Error("输出应该包含method属性")
	}
	if !strings.Contains(output, "GET") {
		t.Error("输出应该包含GET值")
	}
	if !strings.Contains(output, "status_code") {
		t.Error("输出应该包含status_code属性")
	}
	if !strings.Contains(output, "200") {
		t.Error("输出应该包含200值")
	}
	if !strings.Contains(output, "error") {
		t.Error("输出应该包含error属性")
	}
	if !strings.Contains(output, "连接超时") {
		t.Error("输出应该包含错误信息")
	}
}

func TestColorHandlerEnabled(t *testing.T) {
	var buf bytes.Buffer

	opts := &slog.HandlerOptions{
		Level: slog.LevelWarn, // 只记录警告及以上级别
	}

	handler := NewColorHandler(&buf, opts, "测试服务")

	ctx := context.Background()

	// 测试级别检查
	if handler.Enabled(ctx, slog.LevelDebug) {
		t.Error("Debug级别不应该被启用")
	}
	if handler.Enabled(ctx, slog.LevelInfo) {
		t.Error("Info级别不应该被启用")
	}
	if !handler.Enabled(ctx, slog.LevelWarn) {
		t.Error("Warn级别应该被启用")
	}
	if !handler.Enabled(ctx, slog.LevelError) {
		t.Error("Error级别应该被启用")
	}
}

func TestColorHandlerWithGroup(t *testing.T) {
	var buf bytes.Buffer

	opts := &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}

	handler := NewColorHandler(&buf, opts, "测试服务")
	groupHandler := handler.WithGroup("数据库")
	logger := slog.New(groupHandler)

	logger.Info("查询执行", "table", "users", "duration", time.Millisecond*100)

	output := buf.String()
	if !strings.Contains(output, "查询执行") {
		t.Error("输出应该包含日志消息")
	}
}

func TestFormatLevel(t *testing.T) {
	handler := &ColorHandler{}

	tests := []struct {
		level    slog.Level
		expected string
	}{
		{slog.LevelDebug, ColorGray + "DEBUG" + ColorReset},
		{slog.LevelInfo, ColorGreen + "INFO " + ColorReset},
		{slog.LevelWarn, ColorYellow + "WARN " + ColorReset},
		{slog.LevelError, ColorRed + "ERROR" + ColorReset},
	}

	for _, test := range tests {
		result := handler.formatLevel(test.level)
		if result != test.expected {
			t.Errorf("formatLevel(%v) = %q, 期望 %q", test.level, result, test.expected)
		}
	}
}

func TestGetKeyColor(t *testing.T) {
	handler := &ColorHandler{}

	tests := []struct {
		key      string
		expected string
	}{
		{"error", ColorRed},
		{"trace_id", ColorPurple},
		{"service", ColorCyan},
		{"method", ColorBlue},
		{"duration_ms", ColorYellow},
		{"unknown_key", ColorWhite},
	}

	for _, test := range tests {
		result := handler.getKeyColor(test.key)
		if result != test.expected {
			t.Errorf("getKeyColor(%q) = %q, 期望 %q", test.key, result, test.expected)
		}
	}
}

func TestIsColorSupported(t *testing.T) {
	// 这个测试可能因环境而异，所以只检查函数不会panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("IsColorSupported() 不应该panic: %v", r)
		}
	}()

	_ = IsColorSupported()
}
