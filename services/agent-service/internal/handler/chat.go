package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/indulgeback/telos/pkg/tlog"
	"github.com/indulgeback/telos/services/agent-service/internal/service"
	"github.com/labstack/echo/v4"
)

// ChatHandler 聊天处理器
type ChatHandler struct {
	chatService *service.ChatService
	agentService service.AgentService
}

// NewChatHandler 创建聊天处理器
func NewChatHandler(chatService *service.ChatService, agentService service.AgentService) *ChatHandler {
	return &ChatHandler{
		chatService:  chatService,
		agentService: agentService,
	}
}

// ChatRequest 前端请求格式
type ChatRequest struct {
	Message string `json:"message"`
}

// HandleChat 处理流式聊天请求
func (h *ChatHandler) HandleChat(c echo.Context) error {
	// 获取请求ID和客户端IP
	requestID := c.Request().Header.Get("X-Request-ID")
	clientIP := c.RealIP()

	var req ChatRequest
	if err := c.Bind(&req); err != nil {
		tlog.Warn("聊天请求参数错误", "error", err.Error(), "request_id", requestID, "client_ip", clientIP)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "无效的请求格式",
		})
	}

	if req.Message == "" {
		tlog.Warn("聊天消息为空", "request_id", requestID, "client_ip", clientIP)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "消息不能为空",
		})
	}

	tlog.Info("接收聊天请求", "message", req.Message, "request_id", requestID, "client_ip", clientIP)

	// 获取指定的 Agent ID
	agentID := c.Request().Header.Get("X-Agent-ID")

	// 构建消息历史
	messages := []service.Message{}

	// 如果指定了 Agent，获取并使用其 system prompt
	if agentID != "" {
		agent, err := h.agentService.GetAgentForChat(c.Request().Context(), agentID)
		if err != nil {
			tlog.Warn("获取 Agent 失败，使用默认", "agent_id", agentID, "error", err.Error())
		} else {
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

	// 添加用户消息
	messages = append(messages, service.Message{
		Role:    "user",
		Content: req.Message,
	})

	// 调用流式聊天
	ctx := c.Request().Context()
	contentChan, errChan := h.chatService.ChatStream(ctx, messages)

	// 发送流式响应
	flusher, ok := c.Response().Writer.(http.Flusher)
	if !ok {
		tlog.Error("不支持流式响应", "request_id", requestID, "client_ip", clientIP)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "不支持流式响应",
		})
	}

	contentLength := 0
	for {
		select {
		case content, ok := <-contentChan:
			if !ok {
				// 发送结束标记
				c.Response().Write([]byte("data: [DONE]\n\n"))
				flusher.Flush()
				tlog.Info("聊天流式响应完成", "content_length", contentLength, "request_id", requestID, "client_ip", clientIP)
				return nil
			}

			// 发送数据块
			data := map[string]string{"content": content}
			jsonData, _ := json.Marshal(data)
			c.Response().Write([]byte("data: " + string(jsonData) + "\n\n"))
			flusher.Flush()
			contentLength += len(content)

		case err := <-errChan:
			if err != nil {
				// 发送错误信息
				tlog.Error("聊天流式响应错误", "error", err.Error(), "request_id", requestID, "client_ip", clientIP)
				errorData := map[string]string{"error": err.Error()}
				jsonData, _ := json.Marshal(errorData)
				c.Response().Write([]byte("data: " + string(jsonData) + "\n\n"))
				flusher.Flush()
				return nil
			}

		case <-ctx.Done():
			tlog.Warn("聊天请求被取消", "request_id", requestID, "client_ip", clientIP)
			return nil
		}
	}
}

// HandleHealth 健康检查
func (h *ChatHandler) HandleHealth(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status":  "healthy",
		"time":    time.Now().Format(time.RFC3339),
		"service": "agent-service",
	})
}

// HandleInfo 服务信息
func (h *ChatHandler) HandleInfo(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{
		"service":   "agent-service",
		"version":   "1.0.0",
		"framework": "eino",
		"model":     "deepseek",
	})
}

// HandleReadiness 就绪检查
func (h *ChatHandler) HandleReadiness(c echo.Context) error {
	if h.chatService == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"status": "not ready",
		})
	}
	return c.JSON(http.StatusOK, map[string]string{
		"status": "ready",
	})
}

// StreamWriter SSE 流写入器
type StreamWriter struct {
	writer   http.ResponseWriter
	flusher  http.Flusher
	encoding string
}

// NewStreamWriter 创建 SSE 流写入器
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
func (sw *StreamWriter) Write(data []byte) (int, error) {
	n, err := sw.writer.Write(data)
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return n, err
}

// WriteEvent 写入 SSE 事件
func (sw *StreamWriter) WriteEvent(event, data string) error {
	_, err := sw.writer.Write([]byte("event: " + event + "\ndata: " + data + "\n\n"))
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return err
}

// WriteData 写入 SSE 数据
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
func (sw *StreamWriter) Close() error {
	_, err := sw.writer.Write([]byte("data: [DONE]\n\n"))
	if sw.flusher != nil {
		sw.flusher.Flush()
	}
	return err
}
