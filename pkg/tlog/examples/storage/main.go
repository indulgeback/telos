package main

import (
	"time"

	"github.com/indulgeback/telos/pkg/tlog"
)

func main() {
	println("=== TLog 存储功能演示 ===")

	// 1. 开发环境配置
	println("\n1. 开发环境配置（彩色控制台）")
	devConfig := tlog.DevelopmentConfig("开发服务")
	devLogger := tlog.New(devConfig)
	devLogger.Info("开发环境日志", "feature", "彩色输出")

	// 2. 生产环境配置（轮转文件）
	println("\n2. 生产环境配置（轮转文件）")
	prodConfig := tlog.ProductionConfig("production-service", "/tmp/logs")
	prodLogger := tlog.New(prodConfig)
	prodLogger.Info("生产环境日志", "feature", "文件轮转")
	prodLogger.Warn("这条日志会写入轮转文件", "file", "/tmp/logs/production-service.log")
	prodLogger.Error("这是一条错误日志", "error", "演示错误")

	// 显式刷新缓冲区
	if flusher, ok := prodLogger.Logger.Handler().(interface{ Flush() error }); ok {
		flusher.Flush()
	}
	println("✅ 生产环境日志已写入: /tmp/logs/production-service.log")

	// 3. 高性能配置
	println("\n3. 高性能配置（大缓冲区）")
	perfConfig := tlog.HighPerformanceConfig("performance-service", "/tmp/logs")
	// 修改日志级别为debug以确保debug日志被写入
	perfConfig.Level = "debug"
	perfLogger := tlog.New(perfConfig)

	// 模拟高频日志写入
	start := time.Now()
	for i := 0; i < 1000; i++ {
		perfLogger.Info("高频日志", "序号", i, "时间戳", time.Now().UnixNano())
	}
	duration := time.Since(start)
	perfLogger.Info("性能测试完成", "日志数量", 1000, "耗时", duration)

	// 显式刷新缓冲区
	if flusher, ok := perfLogger.Logger.Handler().(interface{ Flush() error }); ok {
		flusher.Flush()
	}
	println("✅ 高性能日志已写入: /tmp/logs/performance-service.log")

	// 4. 自定义存储配置
	println("\n4. 自定义存储配置（小文件轮转）")
	customConfig := &tlog.Config{
		Level:       "debug",
		Format:      "json",
		Output:      "rotating",
		FilePath:    "/tmp/logs/custom.log",
		ServiceName: "自定义服务",
		Storage: &tlog.StorageConfig{
			MaxSize:    1,               // 1MB轮转（演示用）
			MaxAge:     1 * time.Hour,   // 1小时保留
			MaxBackups: 5,               // 5个备份
			Compress:   true,            // 启用压缩
			BufferSize: 1024,            // 1KB缓冲
			FlushTime:  1 * time.Second, // 1秒刷新
		},
	}

	customLogger := tlog.New(customConfig)

	// 生成足够的日志来触发轮转
	for i := 0; i < 100; i++ {
		customLogger.Info("轮转测试日志",
			"序号", i,
			"数据", "这是一些测试数据，用来填充日志文件以触发轮转机制",
			"时间戳", time.Now().Format(time.RFC3339),
		)
		time.Sleep(10 * time.Millisecond)
	}

	// 显式刷新缓冲区
	if flusher, ok := customLogger.Logger.Handler().(interface{ Flush() error }); ok {
		flusher.Flush()
	}
	println("✅ 自定义日志已写入: /tmp/logs/custom.log")

	// 5. 测试配置
	println("\n5. 测试配置（简单文本）")
	testConfig := tlog.TestingConfig("测试服务")
	testLogger := tlog.New(testConfig)
	testLogger.Debug("测试环境日志", "test_case", "storage_demo")

	println("\n=== 存储功能演示完成 ===")
	println("检查 /tmp/logs 目录查看生成的日志文件")

	// 显示文件列表和大小
	println("\n📁 生成的日志文件:")
	time.Sleep(100 * time.Millisecond) // 等待文件系统同步
}
