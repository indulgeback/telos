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
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
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
	Message    string `json:"message"`    // 用户输入的消息
	EnableTools *bool  `json:"enable_tools"` // 是否启用工具调用（可选，默认 true）
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
		c.JSON(http.StatusBadRequest, errorResponse(400, "无效的请求格式"))
		return
	}

	if req.Message == "" {
		tlog.Warn("聊天消息为空", "request_id", requestID, "client_ip", clientIP)
		c.JSON(http.StatusBadRequest, errorResponse(400, "消息不能为空"))
		return
	}

	tlog.Info("接收聊天请求", "message", req.Message, "request_id", requestID, "client_ip", clientIP)

	// ========== 3. 调用流式聊天 ==========
	ctx := c.Request.Context()

	var contentChan <-chan string
	var errChan <-chan error

	// 获取指定的 Agent ID
	agentID := c.GetHeader("X-Agent-ID")

	// 判断是否启用工具（默认启用）
	enableTools := req.EnableTools == nil || *req.EnableTools

	// 如果指定了 Agent 且启用了工具，使用带工具的聊天
	if agentID != "" && enableTools {
		// 获取 Agent 的系统提示词
		agent, err := h.agentService.GetAgentForChat(ctx, agentID)
		if err != nil {
			tlog.Warn("获取 Agent 失败", "agent_id", agentID, "error", err.Error(), "request_id", requestID)
			c.JSON(http.StatusNotFound, errorResponse(404, fmt.Sprintf("无法找到指定的 Agent (ID: %s)", agentID)))
			return
		}

		toolReq := service.ChatRequestWithTools{
			AgentID:      agentID,
			UserID:       "", // TODO: 从 session 中获取用户 ID
			Message:      req.Message,
			SystemPrompt: agent.SystemPrompt,
		}
		contentChan, errChan = h.chatService.ChatStreamWithTools(ctx, toolReq)
		tlog.Info("使用带工具的聊天", "agent_id", agentID, "agent_name", agent.Name, "request_id", requestID)
	} else {
		// 未指定 Agent 或禁用了工具时使用普通聊天
		systemPrompt := "你是一个友好、专业的 AI 助手，可以帮助用户解答各种问题。"
		if agentID != "" && !enableTools {
			// 获取 Agent 的系统提示词，但不使用工具
			agent, err := h.agentService.GetAgentForChat(ctx, agentID)
			if err == nil {
				systemPrompt = agent.SystemPrompt
			}
		}
		messages := []service.Message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: req.Message},
		}
		contentChan, errChan = h.chatService.ChatStream(ctx, messages)
		tlog.Info("使用普通聊天", "agent_id", agentID, "enable_tools", enableTools, "request_id", requestID)
	}

	// ========== 4. 发送流式响应 ==========
	// 设置 SSE 响应头
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.WriteHeader(http.StatusOK)

	// 检查是否支持 Flusher（流式响应必需）
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		tlog.Error("不支持流式响应", "request_id", requestID, "client_ip", clientIP)
		writeSSEError(c.Writer, flusher, "不支持流式响应", requestID)
		return
	}

	contentLength := 0

	// 工具调用名称到显示名称的映射
	toolDisplayNames := map[string]string{
		"calculator":       "计算器",
		"get_current_time": "获取当前时间",
	}

	// 跟踪已发送开始事件的工具（避免重复）
	activeTools := make(map[string]string) // toolName -> toolCallID

	for {
		select {
		case content, ok := <-contentChan:
			if !ok {
				// 通道关闭前，完成所有活跃的工具
				for toolName, toolCallID := range activeTools {
					displayName := toolDisplayNames[toolName]
					if displayName == "" {
						displayName = toolName
					}
					toolCallEndData := gin.H{
						"type": "tool_call_end",
						"toolCall": gin.H{
							"id":          toolCallID,
							"name":        toolName,
							"displayName": displayName,
							"status":      "success",
							"timestamp":   time.Now().Format(time.RFC3339),
						},
						"content": "",
					}
					writeSSEData(c.Writer, flusher, toolCallEndData)
				}

				// 发送结束标记
				if _, err := c.Writer.Write([]byte("data: [DONE]\n\n")); err != nil {
					tlog.Warn("发送完成标记失败", "error", err, "request_id", requestID)
				}
				flusher.Flush()
				tlog.Info("聊天流式响应完成", "content_length", contentLength, "request_id", requestID, "client_ip", clientIP)
				return
			}

			// ========== 优先处理工具调用消息 ==========
			// 检测工具调用消息 [TOOL_CALL:tool_name]
			// 必须先处理这个，避免被普通内容的逻辑干扰
			if strings.HasPrefix(content, "[TOOL_CALL:") && strings.HasSuffix(content, "]") {
				toolName := strings.TrimPrefix(content, "[TOOL_CALL:")
				toolName = strings.TrimSuffix(toolName, "]")

				// 跳过空的工具名（防御性编程）
				if toolName == "" {
					continue
				}

				// 如果这个工具还没有发送开始事件，则发送
				if _, exists := activeTools[toolName]; !exists {
					// 使用 requestID + toolName 生成稳定的 ID
					toolCallID := fmt.Sprintf("%s-%s", requestID, toolName)
					activeTools[toolName] = toolCallID

					// 获取显示名称
					displayName := toolDisplayNames[toolName]
					if displayName == "" {
						displayName = toolName
					}

					tlog.Info("工具调用开始", "tool_name", toolName, "tool_call_id", toolCallID, "request_id", requestID)

					// 发送工具调用开始事件
					toolCallData := gin.H{
						"type": "tool_call_start",
						"toolCall": gin.H{
							"id":          toolCallID,
							"name":        toolName,
							"displayName": displayName,
							"status":      "running",
							"timestamp":   time.Now().Format(time.RFC3339),
						},
						"content": "",
					}
					if !writeSSEData(c.Writer, flusher, toolCallData) {
						tlog.Warn("SSE 工具调用事件写入失败", "request_id", requestID)
						return
					}
				}

				continue
			}

			// ========== 处理普通内容 ==========
			// 如果有活跃的工具，说明工具执行完成，发送结束事件
			if len(activeTools) > 0 {
				tlog.Info("工具执行完成，发送结束事件", "active_tools", len(activeTools), "request_id", requestID)
				for toolName, toolCallID := range activeTools {
					displayName := toolDisplayNames[toolName]
					if displayName == "" {
						displayName = toolName
					}
					toolCallEndData := gin.H{
						"type": "tool_call_end",
						"toolCall": gin.H{
							"id":          toolCallID,
							"name":        toolName,
							"displayName": displayName,
							"status":      "success",
							"timestamp":   time.Now().Format(time.RFC3339),
						},
						"content": "",
					}
					if !writeSSEData(c.Writer, flusher, toolCallEndData) {
						tlog.Warn("SSE 工具调用结束事件写入失败", "request_id", requestID)
						return
					}
				}
				// 清空活跃工具列表
				activeTools = make(map[string]string)
			}

			// 发送普通内容数据块
			tlog.Debug("发送内容块", "length", len(content), "request_id", requestID)
			data := gin.H{"content": content}
			if !writeSSEData(c.Writer, flusher, data) {
				// 写入失败，客户端可能已断开
				tlog.Warn("SSE 写入失败，客户端可能已断开", "request_id", requestID)
				return
			}
			contentLength += len(content)

		case err := <-errChan:
			if err != nil {
				// 发送错误信息
				tlog.Error("聊天流式响应错误", "error", err.Error(), "request_id", requestID, "client_ip", clientIP)
				writeSSEError(c.Writer, flusher, err.Error(), requestID)
				return
			}

		case <-ctx.Done():
			// 请求被取消（客户端断开连接）
			tlog.Warn("聊天请求被取消", "request_id", requestID, "client_ip", clientIP)
			return
		}
	}
}

// ========== SSE 辅助函数 ==========

// writeSSEData 写入 SSE 数据并检查错误
//
// 参数：
//   - w: HTTP Response Writer
//   - flusher: HTTP Flusher
//   - data: 要写入的数据
//
// 返回：
//   - bool: 写入成功返回 true，失败返回 false
func writeSSEData(w http.ResponseWriter, flusher http.Flusher, data any) bool {
	jsonData, err := json.Marshal(data)
	if err != nil {
		tlog.Error("JSON 序列化失败", "error", err)
		// 发送一个错误响应给客户端
		errorJSON, _ := json.Marshal(gin.H{"error": "serialization_failed"})
		w.Write([]byte("data: " + string(errorJSON) + "\n\n"))
		flusher.Flush()
		return false
	}

	if _, err := w.Write([]byte("data: " + string(jsonData) + "\n\n")); err != nil {
		tlog.Error("SSE 写入失败", "error", err)
		return false
	}
	flusher.Flush()
	return true
}

// writeSSEError 写入 SSE 错误消息
//
// 参数：
//   - w: HTTP Response Writer
//   - flusher: HTTP Flusher
//   - errMsg: 错误消息
//   - requestID: 请求 ID（用于日志）
func writeSSEError(w http.ResponseWriter, flusher http.Flusher, errMsg string, requestID string) {
	data := gin.H{"error": errMsg}
	jsonData, err := json.Marshal(data)
	if err != nil {
		tlog.Error("错误消息 JSON 序列化失败", "error", err, "request_id", requestID)
		return
	}

	if _, err := w.Write([]byte("data: " + string(jsonData) + "\n\n")); err != nil {
		tlog.Error("SSE 错误写入失败", "error", err, "request_id", requestID)
	}
	flusher.Flush()
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
