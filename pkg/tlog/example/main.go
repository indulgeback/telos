package main

import (
	"context"
	"errors"
	"time"

	"github.com/indulgeback/telos/pkg/tlog"
)

func main() {
	// 配置彩色日志
	config := &tlog.Config{
		Level:       "debug",
		Format:      "color",
		Output:      "stdout",
		ServiceName: "示例服务",
		EnableColor: true,
		AddSource:   true,
	}

	// 初始化日志器
	tlog.Init(config)

	// 基本日志测试
	tlog.Debug("这是调试消息")
	tlog.Info("这是信息消息")
	tlog.Warn("这是警告消息")
	tlog.Error("这是错误消息")

	// 带字段的日志
	tlog.Info("用户登录",
		"用户ID", 12345,
		"用户名", "张三",
		"IP地址", "192.168.1.100",
	)

	// 使用WithFields
	logger := tlog.WithFields(map[string]any{
		"服务": "用户服务",
		"版本": "v1.2.3",
	})
	logger.Info("服务启动完成")

	// 错误日志
	err := errors.New("数据库连接失败")
	tlog.WithError(err).Error("服务启动失败")

	// HTTP请求日志
	tlog.LogRequest("GET", "/api/users", "Mozilla/5.0", "192.168.1.100", 200, time.Millisecond*150)
	tlog.LogRequest("POST", "/api/login", "Chrome/91.0", "10.0.0.1", 401, time.Millisecond*50)
	tlog.LogRequest("GET", "/api/slow", "Safari/14.0", "172.16.0.1", 200, time.Millisecond*1200)

	// 数据库操作日志
	tlog.LogDBOperation("SELECT", "users", time.Millisecond*25, nil)
	tlog.LogDBOperation("INSERT", "orders", time.Millisecond*100, errors.New("唯一约束违反"))

	// 服务调用日志
	tlog.LogServiceCall("用户服务", "GetUserProfile", time.Millisecond*80, nil)
	tlog.LogServiceCall("支付服务", "ProcessPayment", time.Millisecond*500, errors.New("余额不足"))

	// 上下文日志
	ctx := context.WithValue(context.Background(), "trace_id", "trace-12345")
	ctx = context.WithValue(ctx, "request_id", "req-67890")

	contextLogger := tlog.WithContext(ctx)
	contextLogger.Info("处理请求", "操作", "创建订单")

	// 格式化日志
	tlog.Infof("处理了 %d 个请求，耗时 %v", 100, time.Second*2)
	tlog.Errorf("连接到 %s 失败: %v", "数据库服务器", err)

	// 不同状态码的演示
	statusCodes := []int{200, 201, 400, 401, 404, 500, 503}
	for _, code := range statusCodes {
		tlog.Info("HTTP响应", "status_code", code, "message", getStatusMessage(code))
	}

	// 不同响应时间的演示
	durations := []float64{50, 200, 600, 1200, 2500}
	for _, duration := range durations {
		tlog.Info("API调用", "duration_ms", duration, "endpoint", "/api/data")
	}
}

func getStatusMessage(code int) string {
	switch code {
	case 200:
		return "成功"
	case 201:
		return "已创建"
	case 400:
		return "请求错误"
	case 401:
		return "未授权"
	case 404:
		return "未找到"
	case 500:
		return "服务器错误"
	case 503:
		return "服务不可用"
	default:
		return "未知状态"
	}
}
