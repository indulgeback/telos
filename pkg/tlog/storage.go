package tlog

import (
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// StorageConfig 存储配置
type StorageConfig struct {
	// 文件轮转配置
	MaxSize    int64         `json:"max_size"`    // 单个文件最大大小(MB)
	MaxAge     time.Duration `json:"max_age"`     // 文件保留时间
	MaxBackups int           `json:"max_backups"` // 最大备份文件数
	Compress   bool          `json:"compress"`    // 是否压缩历史文件

	// 缓冲配置
	BufferSize int           `json:"buffer_size"` // 缓冲区大小
	FlushTime  time.Duration `json:"flush_time"`  // 强制刷新间隔
}

// DefaultStorageConfig 返回默认存储配置
func DefaultStorageConfig() *StorageConfig {
	return &StorageConfig{
		MaxSize:    100,                // 100MB
		MaxAge:     7 * 24 * time.Hour, // 7天
		MaxBackups: 10,                 // 10个备份
		Compress:   true,               // 启用压缩
		BufferSize: 4096,               // 4KB缓冲
		FlushTime:  5 * time.Second,    // 5秒刷新
	}
}

// RotatingFileWriter 支持轮转的文件写入器
type RotatingFileWriter struct {
	filename    string
	config      *StorageConfig
	file        *os.File
	currentSize int64
	buffer      []byte
	bufferMutex sync.Mutex
	lastFlush   time.Time
	flushTimer  *time.Timer
	closed      bool
	closeChan   chan struct{}
}

// NewRotatingFileWriter 创建轮转文件写入器
func NewRotatingFileWriter(filename string, config *StorageConfig) (*RotatingFileWriter, error) {
	if config == nil {
		config = DefaultStorageConfig()
	}

	// 确保目录存在
	dir := filepath.Dir(filename)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("创建日志目录失败: %v", err)
	}

	writer := &RotatingFileWriter{
		filename:  filename,
		config:    config,
		buffer:    make([]byte, 0, config.BufferSize),
		lastFlush: time.Now(),
		closeChan: make(chan struct{}),
	}

	// 打开文件
	if err := writer.openFile(); err != nil {
		return nil, err
	}

	// 启动定时刷新
	writer.startFlushTimer()

	return writer, nil
}

// Write 实现 io.Writer 接口
func (w *RotatingFileWriter) Write(p []byte) (n int, err error) {
	w.bufferMutex.Lock()
	defer w.bufferMutex.Unlock()

	if w.closed {
		return 0, fmt.Errorf("写入器已关闭")
	}

	// 检查是否需要轮转
	if w.currentSize+int64(len(p)) > w.config.MaxSize*1024*1024 {
		if err := w.rotate(); err != nil {
			return 0, err
		}
	}

	// 写入缓冲区
	w.buffer = append(w.buffer, p...)

	// 如果缓冲区满了，立即刷新
	if len(w.buffer) >= w.config.BufferSize {
		return len(p), w.flushBuffer()
	}

	return len(p), nil
}

// flushBuffer 刷新缓冲区到文件
func (w *RotatingFileWriter) flushBuffer() error {
	if len(w.buffer) == 0 {
		return nil
	}

	n, err := w.file.Write(w.buffer)
	if err != nil {
		return err
	}

	w.currentSize += int64(n)
	w.buffer = w.buffer[:0] // 清空缓冲区
	w.lastFlush = time.Now()

	return w.file.Sync() // 强制同步到磁盘
}

// Flush 手动刷新缓冲区
func (w *RotatingFileWriter) Flush() error {
	w.bufferMutex.Lock()
	defer w.bufferMutex.Unlock()
	return w.flushBuffer()
}

// Close 关闭写入器
func (w *RotatingFileWriter) Close() error {
	w.bufferMutex.Lock()
	defer w.bufferMutex.Unlock()

	if w.closed {
		return nil
	}

	w.closed = true
	close(w.closeChan)

	// 刷新剩余数据
	if err := w.flushBuffer(); err != nil {
		return err
	}

	// 关闭文件
	if w.file != nil {
		return w.file.Close()
	}

	return nil
}

// openFile 打开日志文件
func (w *RotatingFileWriter) openFile() error {
	file, err := os.OpenFile(w.filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("打开日志文件失败: %v", err)
	}

	// 获取当前文件大小
	info, err := file.Stat()
	if err != nil {
		file.Close()
		return fmt.Errorf("获取文件信息失败: %v", err)
	}

	w.file = file
	w.currentSize = info.Size()

	return nil
}

// rotate 轮转日志文件
func (w *RotatingFileWriter) rotate() error {
	// 刷新当前缓冲区
	if err := w.flushBuffer(); err != nil {
		return err
	}

	// 关闭当前文件
	if err := w.file.Close(); err != nil {
		return err
	}

	// 生成备份文件名
	backupName := w.getBackupName()

	// 重命名当前文件为备份文件
	if err := os.Rename(w.filename, backupName); err != nil {
		return fmt.Errorf("重命名日志文件失败: %v", err)
	}

	// 压缩备份文件（如果启用）
	if w.config.Compress {
		go w.compressFile(backupName)
	}

	// 清理旧文件
	go w.cleanupOldFiles()

	// 创建新文件
	return w.openFile()
}

// getBackupName 生成备份文件名
func (w *RotatingFileWriter) getBackupName() string {
	dir := filepath.Dir(w.filename)
	base := filepath.Base(w.filename)
	ext := filepath.Ext(base)
	name := strings.TrimSuffix(base, ext)

	timestamp := time.Now().Format("2006-01-02-15-04-05")
	return filepath.Join(dir, fmt.Sprintf("%s-%s%s", name, timestamp, ext))
}

// compressFile 压缩文件
func (w *RotatingFileWriter) compressFile(filename string) {
	// 读取原文件
	src, err := os.Open(filename)
	if err != nil {
		return
	}
	defer src.Close()

	// 创建压缩文件
	dst, err := os.Create(filename + ".gz")
	if err != nil {
		return
	}
	defer dst.Close()

	// 创建gzip写入器
	gzWriter := gzip.NewWriter(dst)
	defer gzWriter.Close()

	// 复制数据
	if _, err := io.Copy(gzWriter, src); err != nil {
		return
	}

	// 删除原文件
	os.Remove(filename)
}

// cleanupOldFiles 清理旧文件
func (w *RotatingFileWriter) cleanupOldFiles() {
	dir := filepath.Dir(w.filename)
	base := filepath.Base(w.filename)
	ext := filepath.Ext(base)
	name := strings.TrimSuffix(base, ext)

	// 查找所有备份文件
	pattern := filepath.Join(dir, name+"-*"+ext+"*")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return
	}

	// 按修改时间排序
	sort.Slice(matches, func(i, j int) bool {
		info1, _ := os.Stat(matches[i])
		info2, _ := os.Stat(matches[j])
		return info1.ModTime().After(info2.ModTime())
	})

	now := time.Now()

	// 删除过期和超数量的文件
	for i, match := range matches {
		info, err := os.Stat(match)
		if err != nil {
			continue
		}

		// 检查是否过期
		if now.Sub(info.ModTime()) > w.config.MaxAge {
			os.Remove(match)
			continue
		}

		// 检查是否超过最大备份数
		if i >= w.config.MaxBackups {
			os.Remove(match)
		}
	}
}

// startFlushTimer 启动定时刷新
func (w *RotatingFileWriter) startFlushTimer() {
	w.flushTimer = time.NewTimer(w.config.FlushTime)

	go func() {
		for {
			select {
			case <-w.flushTimer.C:
				w.bufferMutex.Lock()
				if !w.closed && len(w.buffer) > 0 {
					w.flushBuffer()
				}
				w.bufferMutex.Unlock()
				w.flushTimer.Reset(w.config.FlushTime)

			case <-w.closeChan:
				w.flushTimer.Stop()
				return
			}
		}
	}()
}
