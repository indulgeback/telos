# TLog 示例

这个目录包含了 TLog 日志库的各种使用示例。

## 📁 示例结构

### `basic/` - 基本功能示例
演示 TLog 的核心功能：
- 不同级别的日志记录
- 结构化字段
- 上下文日志
- 专用日志方法（HTTP、数据库、服务调用）
- 链式调用

```bash
cd basic
go run main.go
```

### `storage/` - 存储功能示例
演示 TLog 的企业级存储功能：
- 开发环境配置（彩色控制台）
- 生产环境配置（文件轮转）
- 高性能配置（大缓冲区）
- 自定义存储配置
- 测试环境配置

```bash
cd storage
go run main.go
```

## 🚀 快速开始

### 1. 基本使用
```go
import "github.com/indulgeback/telos/pkg/tlog"

// 使用默认配置
tlog.Init(nil)
tlog.Info("Hello, TLog!")

// 或者使用预设配置
config := tlog.DevelopmentConfig("我的服务")
tlog.Init(config)
```

### 2. 生产环境
```go
// 生产环境配置 - 文件轮转 + 压缩
config := tlog.ProductionConfig("我的服务", "/var/log")
tlog.Init(config)
```

### 3. 自定义配置
```go
config := &tlog.Config{
    Level:       "info",
    Format:      "json",
    Output:      "rotating",
    FilePath:    "/var/log/app.log",
    ServiceName: "我的服务",
    Storage: &tlog.StorageConfig{
        MaxSize:    100,  // 100MB
        MaxAge:     7 * 24 * time.Hour,  // 7天
        MaxBackups: 10,   // 10个备份
        Compress:   true, // 启用压缩
    },
}
tlog.Init(config)
```

## 📊 输出格式对比

### 彩色格式（开发环境）
```
2025-07-25 19:29:18 INFO  [我的服务] main.go:15 用户登录 用户ID=12345 用户名=张三
```

### JSON格式（生产环境）
```json
{"timestamp":"2025-07-25T19:29:18+08:00","level":"INFO","service":"我的服务","msg":"用户登录","用户ID":12345,"用户名":"张三"}
```

### 文本格式（测试环境）
```
timestamp=2025-07-25T19:29:18+08:00 level=INFO service=我的服务 msg=用户登录 用户ID=12345 用户名=张三
```

## 🔧 配置选项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `Level` | string | "info" | 日志级别: debug, info, warn, error |
| `Format` | string | "color" | 输出格式: json, text, color |
| `Output` | string | "stdout" | 输出目标: stdout, stderr, file, rotating, remote |
| `ServiceName` | string | "telos" | 服务名称 |
| `EnableColor` | bool | true | 是否启用颜色 |
| `AddSource` | bool | false | 是否显示源码位置 |

## 🏭 企业级功能

### 文件轮转
- 按大小自动轮转
- 按时间自动清理
- gzip压缩归档
- 缓冲写入优化

### 远程传输
- Elasticsearch集成
- Loki集成
- 自定义HTTP端点
- 批量异步发送
- 自动重试机制

### 多目标输出
- 同时输出到多个目标
- 动态添加/移除输出
- 独立的错误处理

## 📈 性能特性

- **高并发**: 线程安全的并发写入
- **低延迟**: 异步写入不阻塞业务
- **高吞吐**: 批量处理和缓冲优化
- **资源友好**: 自动轮转和清理

## 🛠️ 开发工具

每个示例都包含独立的 go.mod 文件，可以单独运行和测试。

```bash
# 运行所有示例
for dir in */; do
    echo "运行示例: $dir"
    cd "$dir"
    go run main.go
    cd ..
done
```