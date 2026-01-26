import { Router, Request, Response } from "express";
import { chatService } from "../services/chatService.js";
import { logger } from "../config/index.js";

export const chatRouter = Router();

// ========== SSE 辅助函数 ==========

function sendSSEData(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendSSEError(res: Response, error: string) {
  res.write(`data: ${JSON.stringify({ error })}\n\n`);
}

// ========== 聊天接口 ==========

/**
 * POST /api/chat
 * 流式聊天接口（SSE）
 *
 * 请求头：
 * - X-Agent-ID: Agent ID（可选）
 *
 * 请求体：
 * {
 *   "message": "用户消息"
 * }
 */
chatRouter.post("/chat", async (req: Request, res: Response) => {
  const requestId = req.header("X-Request-ID") || `req-${Date.now()}`;
  const agentId = req.header("X-Agent-ID") || "";
  const { message } = req.body;

  // 验证请求
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      code: 400,
      message: "消息不能为空",
    });
  }

  logger.info({
    msg: "Chat request received",
    requestId,
    agentId,
    messageLength: message.length,
    message: message.slice(0, 100),
  });

  // 设置 SSE 响应头
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    let hasSentContent = false;

    if (agentId) {
      // 带工具的聊天
      for await (const chunk of chatService.chatStream({
        agentId,
        message,
        userId: "", // TODO: 从 session 获取
      })) {
        // 发送数据
        sendSSEData(res, chunk);

        if (chunk.content) {
          hasSentContent = true;
        }

        // 检查是否完成
        if (chunk.done) {
          break;
        }
      }
    } else {
      // 简单聊天（无工具）
      for await (const chunk of chatService.simpleChat(message)) {
        sendSSEData(res, chunk);

        if (chunk.content) {
          hasSentContent = true;
        }

        if (chunk.done) {
          break;
        }
      }
    }

    // 发送完成标记
    if (!res.writableEnded) {
      sendSSEData(res, { done: true });
      res.write("data: [DONE]\n\n");
    }

    logger.info({
      msg: "Chat completed",
      requestId,
      hasSentContent,
    });
  } catch (error) {
    logger.error({
      msg: "Chat error",
      requestId,
      err: error,
    });
    if (!res.writableEnded) {
      sendSSEError(
        res,
        error instanceof Error ? error.message : "聊天服务错误"
      );
    }
  } finally {
    res.end();
  }
});

// ========== 兼容接口（与 Go 版本保持一致） ==========

/**
 * POST /api/agent
 * 与 /chat 相同的接口，保持与 Go 版本的兼容性
 */
chatRouter.post("/agent", async (req: Request, res: Response) => {
  const requestId = req.header("X-Request-ID") || `req-${Date.now()}`;
  const agentId = req.header("X-Agent-ID") || "";
  const { message, enable_tools: enableTools } = req.body;

  // 验证请求
  if (!message || typeof message !== "string") {
    return res.status(400).json({
      code: 400,
      message: "消息不能为空",
    });
  }

  // 判断是否启用工具（默认启用）
  const shouldEnableTools = enableTools === undefined || enableTools === true;

  logger.info({
    msg: "Chat request",
    requestId,
    agentId,
    enableTools: shouldEnableTools,
    messageLength: message.length,
    message: message.slice(0, 100),
  });

  // 设置 SSE 响应头
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    if (agentId && shouldEnableTools) {
      // 带工具的聊天
      for await (const chunk of chatService.chatStream({
        agentId,
        message,
        userId: "",
      })) {
        sendSSEData(res, chunk);
        if (chunk.done) break;
      }
    } else {
      // 简单聊天（无工具）
      // 如果有 agentId 但禁用了工具，使用 agent 的 system prompt
      let systemPrompt = "你是一个友好、专业的 AI 助手，可以帮助用户解答各种问题。";

      if (agentId && !shouldEnableTools) {
        try {
          const agent = await chatService.getAgentForChat(agentId);
          if (agent) {
            systemPrompt = agent.systemPrompt || systemPrompt;
          }
        } catch (error) {
          logger.warn({
            msg: "Failed to get agent, using default prompt",
            agentId,
            err: error,
          });
        }
      }

      for await (const chunk of chatService.simpleChatWithPrompt(message, systemPrompt)) {
        sendSSEData(res, chunk);
        if (chunk.done) break;
      }
    }

    if (!res.writableEnded) {
      sendSSEData(res, { done: true });
      res.write("data: [DONE]\n\n");
    }
  } catch (error) {
    logger.error({
      msg: "Chat error",
      requestId,
      err: error,
    });
    if (!res.writableEnded) {
      sendSSEError(res, error instanceof Error ? error.message : "聊天服务错误");
    }
  } finally {
    res.end();
  }
});

// ========== 健康检查 ==========

chatRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    time: new Date().toISOString(),
    service: "agent-service-ts",
  });
});

chatRouter.get("/ready", (_req: Request, res: Response) => {
  res.json({
    status: "ready",
  });
});

chatRouter.get("/info", (_req: Request, res: Response) => {
  res.json({
    service: "agent-service-ts",
    version: "1.0.0",
    framework: "langchain.js",
    model: "deepseek",
  });
});
