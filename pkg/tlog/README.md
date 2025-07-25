# TLog - Telos 日志包

为 Telos 单体仓库构建的结构化日志包，基于 Go 标准库的 `log/slog` 包，并为微服务提供额外功能。

## 功能特性

- **结构化日志**: 支持 JSON、文本和彩色格式
- **彩色输出**: 智能颜色编码，不同级别和字段使用不同颜色
- **企业级存储**: 文件轮转、压缩归档、远程传输
- **高性能**: 缓冲写入、异步发送、批量处理
- **上下文感知**: 支持追踪ID和请求ID
- **服务集成**: 为 Gin 和 Echo 框架提供内置中间件
- **多种输出**: 支持 stdout、stderr、文件、轮转文件、远程服务
- **云原生**: 支持 Elasticsearch、Loki 等日志聚合系统
- **微服务就绪**: 服务名标记和分布式追踪支持
- **源码定位**: 可选的源码文件和行号显示

## 彩色日志特性

### 日志级别颜色
- **DEBUG**: 灰色 - 调试信息
- **INFO**: 绿色 - 一般信息
- **WARN**: 黄色 - 警告信息
- **ERROR**: 红色 - 错误信息

### 字段颜色编码
- **error**: 红色加粗 - 错误信息突出显示
- **trace_id/request_id**: 紫色 - 追踪信息
- **service**: 青色 - 服务名
- **method/operation**: 蓝色 - 操作方法
- **duration_ms**: 根据时长变色（绿色<500ms，黄色<1000ms，红色>1000ms）
- **status_code**: 根据状态码变色（绿色2xx，黄色其他，红色4xx/5xx）

## 快速开始

### 基本使用

```go
package main

import (
    "github.com/indulgeback/telos/pkg/tlog"
)

func main() {
    // 使用彩色日志配置
    config := &tlog.Config{
        Level:       "debug",
        Format:      "color",  // 使用彩色格式
        Output:      "stdout",
        ServiceName: "我的服务",
        EnableColor: true,
        AddSource:   true,     // 显示源码位置
    }
    
    tlog.Init(config)
    
    // 基本日志记录
    tlog.Info("应用程序启动")
    tlog.Error("出现错误", "error", "连接失败")
    
    // 格式化日志记录
    tlog.Infof("用户 %s 已登录", "张三")
}
```

### 自定义配置

```go
config := &tlog.Config{
    Level:       "debug",
    Format:      "color",      // json, text, color
    Output:      "rotating",   // stdout, stderr, file, rotating, remote
    FilePath:    "/var/log/app.log",
    ServiceName: "认证服务",
    EnableColor: true,         // 启用颜色
    AddSource:   false,        // 不显示源码位置
    Storage: &tlog.StorageConfig{
        MaxSize:    100,       // 100MB轮转
        MaxAge:     7 * 24 * time.Hour, // 保留7天
        MaxBackups: 10,        // 最多10个备份
        Compress:   true,      // 压缩历史文件
    },
}

logger := tlog.New(config)
logger.Info("服务初始化完成", "port", 8080)
```

### 使用上下文和字段

```go
// 添加上下文信息
ctx := context.WithValue(context.Background(), "trace_id", "abc123")
logger := tlog.WithContext(ctx)

// 添加结构化字段
logger = tlog.WithFields(map[string]any{
    "用户ID": 12345,
    "操作":  "登录",
})

logger.Info("用户操作执行")
```

## 中间件集成

### Gin 框架

```go
import (
    "github.com/gin-gonic/gin"
    "github.com/indulgeback/telos/pkg/tlog"
)

func main() {
    r := gin.New()
    
    // 添加请求ID中间件
    r.Use(tlog.RequestIDMiddleware())
    
    // 添加彩色日志中间件
    logger := tlog.WithService("API网关")
    r.Use(tlog.GinMiddleware(logger))
    
    r.GET("/health", func(c *gin.Context) {
        tlog.Info("健康检查请求")
        c.JSON(200, gin.H{"status": "ok"})
    })
    
    r.Run(":8080")
}
```

### Echo 框架

```go
import (
    "github.com/labstack/echo/v4"
    "github.com/indulgeback/telos/pkg/tlog"
)

func main() {
    e := echo.New()
    
    // 添加请求ID中间件
    e.Use(tlog.EchoRequestIDMiddleware())
    
    // 添加彩色日志中间件
    logger := tlog.WithService("服务注册中心")
    e.Use(tlog.EchoMiddleware(logger))
    
    e.GET("/health", func(c echo.Context) error {
        tlog.Info("健康检查请求")
        return c.JSON(200, map[string]string{"status": "ok"})
    })
    
    e.Start(":8080")
}
```

## 专用日志方法

### HTTP 请求日志

```go
// 成功请求 - 绿色状态码
tlog.LogRequest("GET", "/api/users", "Mozilla/5.0", "192.168.1.1", 200, time.Millisecond*150)

// 错误请求 - 红色状态码
tlog.LogRequest("POST", "/api/login", "Chrome/91.0", "10.0.0.1", 401, time.Millisecond*50)

// 慢请求 - 红色持续时间
tlog.LogRequest("GET", "/api/slow", "Safari/14.0", "172.16.0.1", 200, time.Millisecond*1200)
```

### 数据库操作日志

```go
start := time.Now()
err := db.Create(&user)
tlog.LogDBOperation("CREATE", "users", time.Since(start), err)
```

### 服务调用日志

```go
start := time.Now()
response, err := userService.GetUser(ctx, userID)
tlog.LogServiceCall("用户服务", "GetUser", time.Since(start), err)
```

## 配置选项

| 字段 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `Level` | string | "info" | 日志级别: debug, info, warn, error |
| `Format` | string | "color" | 输出格式: json, text, color |
| `Output` | string | "stdout" | 输出目标: stdout, stderr, file |
| `FilePath` | string | "" | 当输出为 "file" 时的文件路径 |
| `ServiceName` | string | "telos" | 用于标记的服务名 |
| `EnableColor` | bool | true | 是否启用颜色（自动检测终端支持） |
| `AddSource` | bool | false | 是否添加源码文件和行号 |

## 颜色支持检测

日志包会自动检测终端是否支持颜色：

- 检查是否在终端中运行
- 检查 `TERM` 环境变量
- 检查 `NO_COLOR` 环境变量（禁用颜色）
- 检查 `FORCE_COLOR` 环境变量（强制启用颜色）

```go
// 手动检查颜色支持
if tlog.IsColorSupported() {
    fmt.Println("终端支持颜色")
}
```

## 环境变量

你也可以使用环境变量配置日志器：

```bash
export TLOG_LEVEL=debug
export TLOG_FORMAT=color
export TLOG_OUTPUT=stdout
export TLOG_SERVICE_NAME=认证服务
export NO_COLOR=1          # 禁用颜色
export FORCE_COLOR=1       # 强制启用颜色
```

## 与 Viper 集成

```go
import (
    "github.com/spf13/viper"
    "github.com/indulgeback/telos/pkg/tlog"
)

func initLogger() {
    config := &tlog.Config{
        Level:       viper.GetString("log.level"),
        Format:      viper.GetString("log.format"),
        Output:      viper.GetString("log.output"),
        ServiceName: viper.GetString("service.name"),
        EnableColor: viper.GetBool("log.enable_color"),
        AddSource:   viper.GetBool("log.add_source"),
    }
    
    tlog.Init(config)
}
```

## 最佳实践

1. **开发环境**: 使用 `color` 格式，启用源码位置
2. **生产环境**: 使用 `json` 格式，便于日志聚合和分析
3. **容器环境**: 自动检测终端支持，或使用环境变量控制
4. **性能考虑**: 彩色格式比JSON格式稍慢，但在开发中提供更好的可读性
5. **字段命名**: 使用标准字段名以获得最佳颜色效果

## 示例 .env 配置

```env
# 开发环境日志配置
LOG_LEVEL=debug
LOG_FORMAT=color
LOG_OUTPUT=stdout
LOG_ADD_SOURCE=true
SERVICE_NAME=认证服务

# 生产环境日志配置
# LOG_LEVEL=info
# LOG_FORMAT=json
# LOG_OUTPUT=file
# LOG_FILE_PATH=/var/log/telos/service.log
# LOG_ADD_SOURCE=false
```

## 运行示例

```bash
# 进入示例目录
cd pkg/tlog/example

# 运行彩色日志示例
go run main.go
```

## 线程安全

tlog 包是线程安全的，可以在多个 goroutine 中并发使用，无需额外的同步机制。

## 使用示例

### 基本日志记录
```go
tlog.Info("服务启动", "端口", 8080)
tlog.Error("连接失败", "数据库", "postgres", "错误", err.Error())
```

### 链式调用
```go
tlog.WithService("用户服务").
    WithFields(map[string]any{
        "用户ID": 123,
        "操作": "更新资料",
    }).
    WithError(err).
    Error("用户操作失败")
```

### 上下文日志
```go
ctx := context.WithValue(context.Background(), "trace_id", "trace-123")
tlog.WithContext(ctx).Info("处理请求开始")
```

### 不同格式对比

```go
// JSON格式 - 适合生产环境
{"timestamp":"2025-07-25T17:39:52+08:00","level":"INFO","msg":"用户登录","service":"用户服务","用户ID":12345}

// 彩色格式 - 适合开发环境
2025-07-25 17:39:52 INFO [用户服务] 用户登录 用户ID=12345
```
#
# 企业级存储功能

### 文件轮转

```go
// 生产环境配置 - 自动轮转和压缩
config := tlog.ProductionConfig("用户服务", "/var/log")
tlog.Init(config)

// 手动配置轮转
config := &tlog.Config{
    Output:   "rotating",
    FilePath: "/var/log/app.log",
    Storage: &tlog.StorageConfig{
        MaxSize:    50,                 // 50MB轮转
        MaxAge:     30 * 24 * time.Hour, // 保留30天
        MaxBackups: 20,                 // 最多20个备份
        Compress:   true,               // 启用gzip压缩
        BufferSize: 8192,               // 8KB缓冲区
        FlushTime:  5 * time.Second,    // 5秒强制刷新
    },
}
```

### 远程日志传输

```go
// Elasticsearch集成
config := tlog.ElasticsearchLogConfig("用户服务", "http://es:9200", "app-logs")
tlog.Init(config)

// Loki集成
labels := map[string]string{"env": "prod", "team": "backend"}
config := tlog.LokiLogConfig("用户服务", "http://loki:3100", labels)
tlog.Init(config)

// 自定义远程端点
config := &tlog.Config{
    Output: "remote",
    Remote: &tlog.RemoteConfig{
        Endpoint:    "https://logs.company.com/api/v1/logs",
        Method:      "POST",
        BatchSize:   100,               // 批量发送100条
        BatchTime:   5 * time.Second,   // 5秒发送一次
        Timeout:     10 * time.Second,  // 10秒超时
        RetryCount:  3,                 // 重试3次
        EnableAsync: true,              // 异步发送
        Headers: map[string]string{
            "Authorization": "Bearer your-token",
            "Content-Type":  "application/json",
        },
    },
}
```

### 多目标输出

```go
// 同时输出到控制台、文件和远程服务
import "github.com/indulgeback/telos/pkg/tlog"

func main() {
    // 创建多写入器
    multiWriter, err := tlog.NewTripleWriter(
        "/var/log/app.log",
        tlog.DefaultStorageConfig(),
        &tlog.RemoteConfig{
            Endpoint: "http://logserver:8080/logs",
        },
    )
    if err != nil {
        panic(err)
    }

    // 使用多写入器
    config := &tlog.Config{
        Level:       "info",
        Format:      "json",
        ServiceName: "多目标服务",
    }
    
    // 手动设置写入器
    logger := tlog.New(config)
    // 这里需要扩展API来支持自定义writer
}
```

### 预设配置

```go
// 开发环境 - 彩色控制台输出
config := tlog.DevelopmentConfig("我的服务")

// 生产环境 - 轮转文件 + 压缩
config := tlog.ProductionConfig("我的服务", "/var/log")

// 高性能环境 - 大缓冲区
config := tlog.HighPerformanceConfig("我的服务", "/var/log")

// 测试环境 - 简单文本输出
config := tlog.TestingConfig("我的服务")

// 调试环境 - 详细信息
config := tlog.DebugConfig("我的服务")

// 最小配置 - 只记录错误
config := tlog.MinimalConfig("我的服务")
```

## 性能特性

### 缓冲写入
- **智能缓冲**: 自动批量写入，减少I/O操作
- **定时刷新**: 定期强制刷新，确保数据不丢失
- **大小触发**: 缓冲区满时立即写入

### 异步处理
- **非阻塞**: 日志写入不阻塞业务逻辑
- **批量发送**: 远程日志批量传输，提升效率
- **错误重试**: 自动重试机制，确保日志可靠性

### 资源管理
- **自动轮转**: 防止单个日志文件过大
- **压缩归档**: 自动压缩历史文件，节省空间
- **定期清理**: 自动删除过期文件

## 监控和运维

### 日志轮转监控
```go
// 获取轮转统计信息
writer, _ := tlog.NewRotatingFileWriter("/var/log/app.log", nil)
// 可以添加统计接口来监控轮转状态
```

### 远程传输监控
```go
// 监控远程传输状态
remoteWriter := tlog.NewRemoteWriter(config)
// 可以添加健康检查接口
```

### 性能指标
- 日志写入速度 (logs/second)
- 缓冲区使用率
- 远程传输成功率
- 文件轮转频率

## 最佳实践

### 生产环境部署
1. **使用轮转文件**: 避免单个文件过大
2. **启用压缩**: 节省存储空间
3. **设置合理的保留期**: 平衡存储成本和审计需求
4. **配置远程备份**: 确保日志的高可用性

### 性能优化
1. **调整缓冲区大小**: 根据日志量调整
2. **使用异步模式**: 避免阻塞主业务
3. **批量发送**: 减少网络开销
4. **监控资源使用**: 定期检查磁盘和网络使用情况

### 安全考虑
1. **敏感信息过滤**: 避免记录密码等敏感数据
2. **传输加密**: 远程传输使用HTTPS
3. **访问控制**: 限制日志文件访问权限
4. **审计日志**: 记录日志系统本身的操作