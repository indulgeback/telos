package main

import (
	"context"
	"errors"
	"time"

	"github.com/indulgeback/telos/pkg/tlog"
)

func main() {
	println("=== TLog 基本功能演示 ===")

	// 使用默认配置（彩色输出）
	config := &tlog.Config{
		Level:       "debug",
		Format:      "color",
		Output:      "stdout",
		ServiceName: "基础示例",
		EnableColor: true,
		AddSource:   true,
	}

	tlog.Init(config)

	// 基本日志记录
	tlog.Debug("这是调试信息")
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
}
