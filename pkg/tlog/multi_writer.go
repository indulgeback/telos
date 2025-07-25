package tlog

import (
	"io"
	"os"
	"sync"
)

// MultiWriter 多目标写入器
type MultiWriter struct {
	writers []io.Writer
	mutex   sync.RWMutex
}

// NewMultiWriter 创建多写入器
func NewMultiWriter(writers ...io.Writer) *MultiWriter {
	return &MultiWriter{
		writers: writers,
	}
}

// Write 实现 io.Writer 接口
func (mw *MultiWriter) Write(p []byte) (n int, err error) {
	mw.mutex.RLock()
	defer mw.mutex.RUnlock()

	for _, writer := range mw.writers {
		if n, err = writer.Write(p); err != nil {
			return n, err
		}
	}
	return len(p), nil
}

// AddWriter 添加写入器
func (mw *MultiWriter) AddWriter(writer io.Writer) {
	mw.mutex.Lock()
	defer mw.mutex.Unlock()
	mw.writers = append(mw.writers, writer)
}

// RemoveWriter 移除写入器
func (mw *MultiWriter) RemoveWriter(writer io.Writer) {
	mw.mutex.Lock()
	defer mw.mutex.Unlock()

	for i, w := range mw.writers {
		if w == writer {
			mw.writers = append(mw.writers[:i], mw.writers[i+1:]...)
			break
		}
	}
}

// Close 关闭所有写入器
func (mw *MultiWriter) Close() error {
	mw.mutex.Lock()
	defer mw.mutex.Unlock()

	var lastErr error
	for _, writer := range mw.writers {
		if closer, ok := writer.(io.Closer); ok {
			if err := closer.Close(); err != nil {
				lastErr = err
			}
		}
	}
	return lastErr
}

// Flush 刷新所有写入器
func (mw *MultiWriter) Flush() error {
	mw.mutex.RLock()
	defer mw.mutex.RUnlock()

	var lastErr error
	for _, writer := range mw.writers {
		if flusher, ok := writer.(interface{ Flush() error }); ok {
			if err := flusher.Flush(); err != nil {
				lastErr = err
			}
		}
	}
	return lastErr
}

// GetWriters 获取所有写入器
func (mw *MultiWriter) GetWriters() []io.Writer {
	mw.mutex.RLock()
	defer mw.mutex.RUnlock()

	writers := make([]io.Writer, len(mw.writers))
	copy(writers, mw.writers)
	return writers
}

// Count 获取写入器数量
func (mw *MultiWriter) Count() int {
	mw.mutex.RLock()
	defer mw.mutex.RUnlock()
	return len(mw.writers)
}

// 便利函数

// NewFileAndConsoleWriter 创建文件+控制台写入器
func NewFileAndConsoleWriter(filePath string, storage *StorageConfig) (*MultiWriter, error) {
	// 控制台写入器
	consoleWriter := os.Stdout

	// 文件写入器
	fileWriter, err := NewRotatingFileWriter(filePath, storage)
	if err != nil {
		return nil, err
	}

	return NewMultiWriter(consoleWriter, fileWriter), nil
}

// NewFileAndRemoteWriter 创建文件+远程写入器
func NewFileAndRemoteWriter(filePath string, storage *StorageConfig, remote *RemoteConfig) (*MultiWriter, error) {
	// 文件写入器
	fileWriter, err := NewRotatingFileWriter(filePath, storage)
	if err != nil {
		return nil, err
	}

	// 远程写入器
	remoteWriter := NewRemoteWriter(remote)

	return NewMultiWriter(fileWriter, remoteWriter), nil
}

// NewTripleWriter 创建控制台+文件+远程写入器
func NewTripleWriter(filePath string, storage *StorageConfig, remote *RemoteConfig) (*MultiWriter, error) {
	// 控制台写入器（开发环境用）
	consoleWriter := os.Stdout

	// 文件写入器
	fileWriter, err := NewRotatingFileWriter(filePath, storage)
	if err != nil {
		return nil, err
	}

	// 远程写入器
	remoteWriter := NewRemoteWriter(remote)

	return NewMultiWriter(consoleWriter, fileWriter, remoteWriter), nil
}
