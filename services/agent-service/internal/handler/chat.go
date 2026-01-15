// Package handler 提供聊天功能的 HTTP 处理器实现
//
// 该文件实现了流式聊天的 HTTP 接口，使用 Server-Sent Events (SSE)
// 协议向客户端实时推送 AI 生成的内容。
//
// 主要功能：
//   - 流式聊天（HandleChat）：SSE 实时推送
//   - 健康检查（HandleHealth）
//   - 就绪检查（HandleReadiness）
//   - 服务信息（HandleInfo）
//   - SSE 流写入器（StreamWriter）
package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
)

// ========== 类型定义 ==========

// ChatHandler 聊天处理器
//
// 处理聊天相关的 HTTP 请求，包括流式聊天和健康检查。
type ChatHandler struct {
	chatService  *service.ChatService // 聊天服务实例
	agentService service.AgentService // Agent 服务实例（用于获取 Agent 信息）
}

// ========== 构造函数 ==========

// NewChatHandler 创建聊天处理器实例
//
// 参数：
//   - chatService: 聊天服务实例
//   - agentService: Agent 服务实例
//
// 返回：
//   - *ChatHandler: 处理器实例
func NewChatHandler(chatService *service.ChatService, agentService service.AgentService) *ChatHandler {
	return &ChatHandler{
		chatService:  chatService,
		agentService: agentService,
	}
}

// ========== 请求类型 ==========

// ChatRequest 前端聊天请求格式
type ChatRequest struct {
	Message string `json:"message"` // 用户输入的消息
}

// ========== 处理器函数 ==========

// HandleChat 处理流式聊天请求
//
// 使用 Server-Sent Events (SSE) 协议实时推送 AI 生成的响应内容。
//
// 请求头：
//   - X-Agent-ID: 指定使用的 Agent ID（可选，不指定则使用默认）
//
// 请求体：
//   {
//     "message": "用户消息内容"
//   }
//
// 响应格式（SSE）：
//   data: {"content": "增量内容1"}
//
//   data: {"content": "增量内容2"}
//
//   data: [DONE]
//
// Route: POST /api/agent
func (h *ChatHandler) HandleChat(c *gin.Context) {
	// ========== 1. 获取请求元信息 ==========
	requestID := c.GetHeader("X-Request-ID")
	clientIP := c.ClientIP()

	// ========== 2. 解析请求 ==========
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		tlog.Warn("聊天请求参数错误", "error", err.Error(), "request_id", requestID, "client_ip", clientIP)
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求格式"})
		return
	}

	if req.Message == "" {
		tlog.Warn("聊天消息为空", "request_id", requestID, "client_ip", clientIP)
		c.JSON(http.StatusBadRequest, gin.H{"error": "消息不能为空"})
		return
	}

	tlog.Info("接收聊天请求", "message", req.Message, "request_id", requestID, "client_ip", clientIP)

	// ========== 3. 获取指定的 Agent ==========
	agentID := c.GetHeader("X-Agent-ID")

	messages := []service.Message{}

	// 如果指定了 Agent，获取并使用其 system prompt
	if agentID != "" {
		agent, err := h.agentService.GetAgentForChat(c.Request.Context(), agentID)
		if err != nil {
			tlog.Warn("获取 Agent 失败，使用默认", "agent_id", agentID, "error", err.Error())
		} else {
			// 添加系统提示词
			messages = append(messages, service.Message{
				Role:    "system",
				Content: agent.SystemPrompt,
			})
			tlog.Info("使用指定 Agent", "agent_id", agentID, "agent_name", agent.Name, "request_id", requestID)
		}
	}

	// 如果没有 system prompt，添加默认的
	if len(messages) == 0 {
		messages = append(messages, service.Message{
			Role:    "system",
			Content: "你是一个友好、专业的 AI 助手，可以帮助用户解答各种问题。",
		})
	}

	// ========== 4. 添加用户消息 ==========
	messages = append(messages, service.Message{
		Role:    "user",
		Content: req.Message,
	})

	// ========== 5. 调用流式聊天 ==========
	ctx := c.Request.Context()
	contentChan, errChan := h.chatService.ChatStream(ctx, messages)

	// ========== 6. 发送流式响应 ==========
	// 设置 SSE 响应头
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.WriteHeader(http.StatusOK)

	// 检查是否支持 Flusher（流式响应必需）
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		tlog.Error("不支持流式响应", "request_id", requestID, "client_ip", clientIP)
		c.Writer.Write([]byte("data: " + toJSON(gin.H{"error": "不支持流式响应"}) + "\n\n"))
		return
	}

	contentLength := 0
	for {
		select {
		case content, ok := <-contentChan:
			if !ok {
				// 通道已关闭，发送结束标记
				c.Writer.Write([]byte("data: [DONE]\n\n"))
				flusher.Flush()
				tlog.Info("聊天流式响应完成", "content_length", contentLength, "request_id", requestID, "client_ip", clientIP)
				return
			}

			// 发送增量内容数据块
			data := gin.H{"content": content}
			jsonData := toJSON(data)
			c.Writer.Write([]byte("data: " + jsonData + "\n\n"))
			flusher.Flush()
			contentLength += len(content)

		case err := <-errChan:
			if err != nil {
				// 发送错误信息
				tlog.Error("聊天流式响应错误", "error", err.Error(), "request_id", requestID, "client_ip", clientIP)
				errorData := gin.H{"error": err.Error()}
				jsonData := toJSON(errorData)
				c.Writer.Write([]byte("data: " + jsonData + "\n\n"))
				flusher.Flush()
				return
			}

		case <-ctx.Done():
			// 请求被取消（客户端断开连接）
			tlog.Warn("聊天请求被取消", "request_id", requestID, "client_ip", clientIP)
			return
		}
	}
}

// toJSON 将对象转换为 JSON 字符串，忽略错误
func toJSON(v any) string {
	data, _ := json.Marshal(v)
	return string(data)
}

// HandleHealth 健康检查
//
// 返回服务当前的健康状态。此接口不依赖任何外部服务，
// 只要服务进程正常运行即返回健康。
//
// Route: GET /health
func (h *ChatHandler) HandleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"time":    time.Now().Format(time.RFC3339),
		"service": "agent-service",
	})
}

// HandleInfo 服务信息
//
// 返回服务的基本信息，包括版本号和使用的框架。
//
// Route: GET /info
func (h *ChatHandler) HandleInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"service":   "agent-service",
		"version":   "1.0.0",
		"framework": "gin",
		"model":     "deepseek",
	})
}

// HandleReadiness 就绪检查
//
// 返回服务是否准备好接收请求。
// 检查聊天服务是否已正确初始化。
//
// Route: GET /ready
func (h *ChatHandler) HandleReadiness(c *gin.Context) {
	if h.chatService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}

// ========== SSE 流写入器 ==========

// StreamWriter SSE (Server-Sent Events) 流写入器
//
// 提供便捷的方法来写入 SSE 格式的数据。
type StreamWriter struct {
	writer   http.ResponseWriter // HTTP 响应写入器
	flusher  http.Flusher        // HTTP 刷新器
	encoding string              // 字符编码
}

// NewStreamWriter 创建 SSE 流写入器
//
// 参数：
//   - w: HTTP Response Writer
//
// 返回：
//   - *StreamWriter: 流写入器实例
//   - error: 不支持流式响应时返回错误
func NewStreamWriter(w http.ResponseWriter) (*StreamWriter, error) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil, http.ErrNotSupported
	}

	return &StreamWriter{
		writer:   w,
		flusher:  flusher,
		encoding: "utf-8",
	}, nil
}

// Write 写入数据块
//
// 写入数据后立即刷新，确保客户端实时接收。
//
// 参数：
//   - data: 待写入的字节数据
//
// 返回：
//   - int: 写入的字节数
//   - error: 写入失败时返回错误
func (sw *StreamWriter) Write(data []byte) (int, error) {
	n, err := sw.writer.Write(data)
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return n, err
}

// WriteEvent 写入 SSE 事件
//
// 写入带有事件名称的 SSE 格式数据。
//
// 参数：
//   - event: 事件名称
//   - data: 事件数据
//
// 返回：
//   - error: 写入失败时返回错误
func (sw *StreamWriter) WriteEvent(event, data string) error {
	_, err := sw.writer.Write([]byte("event: " + event + "\ndata: " + data + "\n\n"))
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return err
}

// WriteData 写入 SSE 数据
//
// 将对象序列化为 JSON 后以 SSE 格式写入。
//
// 参数：
//   - data: 待写入的数据对象（将被序列化为 JSON）
//
// 返回：
//   - error: 序列化或写入失败时返回错误
func (sw *StreamWriter) WriteData(data interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	_, err = sw.writer.Write([]byte("data: " + string(jsonData) + "\n\n"))
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return err
}

// Close 关闭流
//
// 发送 SSE 结束标记并刷新。
//
// 返回：
//   - error: 写入失败时返回错误
func (sw *StreamWriter) Close() error {
	_, err := sw.writer.Write([]byte("data: [DONE]\n\n"))
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return err
}
