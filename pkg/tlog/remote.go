package tlog

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// RemoteConfig 远程日志配置
type RemoteConfig struct {
	Endpoint    string            `json:"endpoint"`     // 远程端点URL
	Method      string            `json:"method"`       // HTTP方法
	Headers     map[string]string `json:"headers"`      // 请求头
	BatchSize   int               `json:"batch_size"`   // 批量大小
	BatchTime   time.Duration     `json:"batch_time"`   // 批量时间间隔
	Timeout     time.Duration     `json:"timeout"`      // 请求超时
	RetryCount  int               `json:"retry_count"`  // 重试次数
	RetryDelay  time.Duration     `json:"retry_delay"`  // 重试延迟
	BufferSize  int               `json:"buffer_size"`  // 缓冲区大小
	EnableAsync bool              `json:"enable_async"` // 是否异步发送
}

// DefaultRemoteConfig 返回默认远程配置
func DefaultRemoteConfig() *RemoteConfig {
	return &RemoteConfig{
		Method:      "POST",
		BatchSize:   100,
		BatchTime:   5 * time.Second,
		Timeout:     10 * time.Second,
		RetryCount:  3,
		RetryDelay:  time.Second,
		BufferSize:  1000,
		EnableAsync: true,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}
}

// LogEntry 日志条目结构
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Service   string                 `json:"service"`
	Message   string                 `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
	TraceID   string                 `json:"trace_id,omitempty"`
}

// RemoteWriter 远程日志写入器
type RemoteWriter struct {
	config     *RemoteConfig
	client     *http.Client
	buffer     []LogEntry
	bufferMu   sync.Mutex
	batchTimer *time.Timer
	stopChan   chan struct{}
	wg         sync.WaitGroup
}

// NewRemoteWriter 创建远程日志写入器
func NewRemoteWriter(config *RemoteConfig) *RemoteWriter {
	if config == nil {
		config = DefaultRemoteConfig()
	}

	writer := &RemoteWriter{
		config:   config,
		client:   &http.Client{Timeout: config.Timeout},
		buffer:   make([]LogEntry, 0, config.BufferSize),
		stopChan: make(chan struct{}),
	}

	if config.EnableAsync {
		writer.startBatchTimer()
	}

	return writer
}

// Write 实现 io.Writer 接口
func (w *RemoteWriter) Write(p []byte) (n int, err error) {
	// 解析日志条目（简化实现，实际可能需要更复杂的解析）
	entry := LogEntry{
		Timestamp: time.Now().Format(time.RFC3339),
		Message:   string(p),
	}

	if w.config.EnableAsync {
		return w.writeAsync(entry)
	}

	return w.writeSync(entry)
}

// writeAsync 异步写入
func (w *RemoteWriter) writeAsync(entry LogEntry) (int, error) {
	w.bufferMu.Lock()
	defer w.bufferMu.Unlock()

	// 添加到缓冲区
	w.buffer = append(w.buffer, entry)

	// 如果缓冲区满了，立即发送
	if len(w.buffer) >= w.config.BatchSize {
		go w.flushBuffer()
	}

	return len(entry.Message), nil
}

// writeSync 同步写入
func (w *RemoteWriter) writeSync(entry LogEntry) (int, error) {
	entries := []LogEntry{entry}
	if err := w.sendBatch(entries); err != nil {
		return 0, err
	}
	return len(entry.Message), nil
}

// flushBuffer 刷新缓冲区
func (w *RemoteWriter) flushBuffer() {
	w.bufferMu.Lock()
	if len(w.buffer) == 0 {
		w.bufferMu.Unlock()
		return
	}

	// 复制缓冲区数据
	entries := make([]LogEntry, len(w.buffer))
	copy(entries, w.buffer)
	w.buffer = w.buffer[:0] // 清空缓冲区
	w.bufferMu.Unlock()

	// 发送数据
	w.sendBatch(entries)
}

// sendBatch 发送批量日志
func (w *RemoteWriter) sendBatch(entries []LogEntry) error {
	if len(entries) == 0 {
		return nil
	}

	// 序列化数据
	data, err := json.Marshal(map[string]interface{}{
		"logs":  entries,
		"count": len(entries),
	})
	if err != nil {
		return fmt.Errorf("序列化日志失败: %v", err)
	}

	// 发送请求（带重试）
	return w.sendWithRetry(data)
}

// sendWithRetry 带重试的发送
func (w *RemoteWriter) sendWithRetry(data []byte) error {
	var lastErr error

	for i := 0; i <= w.config.RetryCount; i++ {
		if i > 0 {
			time.Sleep(w.config.RetryDelay * time.Duration(i))
		}

		// 创建请求
		req, err := http.NewRequest(w.config.Method, w.config.Endpoint, bytes.NewReader(data))
		if err != nil {
			lastErr = err
			continue
		}

		// 设置请求头
		for key, value := range w.config.Headers {
			req.Header.Set(key, value)
		}

		// 发送请求
		resp, err := w.client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		resp.Body.Close()

		// 检查响应状态
		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return nil // 成功
		}

		lastErr = fmt.Errorf("远程服务返回错误状态: %d", resp.StatusCode)
	}

	return fmt.Errorf("发送日志失败，重试%d次后仍然失败: %v", w.config.RetryCount, lastErr)
}

// startBatchTimer 启动批量定时器
func (w *RemoteWriter) startBatchTimer() {
	w.batchTimer = time.NewTimer(w.config.BatchTime)
	w.wg.Add(1)

	go func() {
		defer w.wg.Done()
		for {
			select {
			case <-w.batchTimer.C:
				w.flushBuffer()
				w.batchTimer.Reset(w.config.BatchTime)

			case <-w.stopChan:
				w.batchTimer.Stop()
				w.flushBuffer() // 最后刷新一次
				return
			}
		}
	}()
}

// Close 关闭远程写入器
func (w *RemoteWriter) Close() error {
	if w.config.EnableAsync {
		close(w.stopChan)
		w.wg.Wait()
	}

	// 最后刷新一次缓冲区
	w.flushBuffer()
	return nil
}

// Flush 手动刷新
func (w *RemoteWriter) Flush() error {
	w.flushBuffer()
	return nil
}

// ElasticsearchConfig Elasticsearch配置
type ElasticsearchConfig struct {
	*RemoteConfig
	Index    string `json:"index"`    // 索引名称
	DocType  string `json:"doc_type"` // 文档类型
	Username string `json:"username"` // 用户名
	Password string `json:"password"` // 密码
}

// NewElasticsearchWriter 创建Elasticsearch写入器
func NewElasticsearchWriter(config *ElasticsearchConfig) *RemoteWriter {
	if config.RemoteConfig == nil {
		config.RemoteConfig = DefaultRemoteConfig()
	}

	// 设置Elasticsearch特定配置
	config.Endpoint = fmt.Sprintf("%s/%s/_bulk", config.Endpoint, config.Index)
	config.Headers["Content-Type"] = "application/x-ndjson"

	// 设置认证
	if config.Username != "" && config.Password != "" {
		// 这里应该设置Basic Auth，简化实现
		config.Headers["Authorization"] = fmt.Sprintf("Basic %s",
			basicAuth(config.Username, config.Password))
	}

	return NewRemoteWriter(config.RemoteConfig)
}

// basicAuth 生成Basic Auth字符串（简化实现）
func basicAuth(username, password string) string {
	// 实际实现应该使用base64编码
	return fmt.Sprintf("%s:%s", username, password)
}

// LokiConfig Loki配置
type LokiConfig struct {
	*RemoteConfig
	Labels map[string]string `json:"labels"` // 标签
}

// NewLokiWriter 创建Loki写入器
func NewLokiWriter(config *LokiConfig) *RemoteWriter {
	if config.RemoteConfig == nil {
		config.RemoteConfig = DefaultRemoteConfig()
	}

	// 设置Loki特定配置
	config.Endpoint = config.Endpoint + "/loki/api/v1/push"

	return NewRemoteWriter(config.RemoteConfig)
}
