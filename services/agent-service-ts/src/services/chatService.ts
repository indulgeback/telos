import { ChatDeepSeek } from "@langchain/deepseek";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { toolService } from "./toolService.js";
import { db } from "./db.js";
import { logger, config } from "../config/index.js";
import type {
  ChatRequestWithTools,
  StreamChunk,
  SSEEventType,
  ToolCallStatus,
} from "../types/index.js";

// ========== 工具显示名称获取 ==========

/**
 * 获取工具的显示名称
 * 首先从内置工具定义中查找，然后从数据库中查找
 * 如果找不到，返回工具名称本身
 */
async function getToolDisplayName(toolName: string): Promise<string> {
  // 1. 先从内置工具定义中查找
  const builtinDisplayName = toolService.getBuiltinToolDisplayName(toolName);
  if (builtinDisplayName) {
    return builtinDisplayName;
  }

  // 2. 从数据库中查找
  try {
    const dbTool = await db.getToolByName(toolName);
    if (dbTool) {
      return dbTool.displayName;
    }
  } catch (error) {
    logger.warn(`Failed to get tool display name from database: ${error}`);
  }

  // 3. 找不到则返回工具名称本身
  return toolName;
}

// ========== 流事件生成器 ==========

async function* streamChatEvents(
  agentId: string,
  message: string,
  requestId: string
): AsyncGenerator<StreamChunk> {
  try {
    // 1. 获取 Agent
    const agent = await db.getAgent(agentId);
    if (!agent) {
      yield {
        type: "error" as SSEEventType,
        error: `Agent not found: ${agentId}`,
      };
      return;
    }

    // 2. 获取工具
    const tools = await toolService.getToolsForAgent(agentId);
    logger.info(`Agent ${agentId} has ${tools.length} tools`);

    // 3. 创建 DeepSeek Chat Model
    const llm = new ChatDeepSeek({
      apiKey: config.deepseekApiKey,
      model: config.deepseekModel,
      temperature: 0.7,
    });

    // 4. 构建消息历史
    const messages: BaseMessage[] = [
      new SystemMessage(agent.systemPrompt || "你是一个友好的 AI 助手。"),
      new HumanMessage(message),
    ];

    // 5. 如果有工具，使用 Agent
    if (tools.length > 0) {
      yield* streamWithTools(llm, tools, messages, requestId);
    } else {
      // 没有工具，直接聊天
      yield* streamSimpleChat(llm, messages);
    }
  } catch (error) {
    logger.error("Chat error:", error);
    yield {
      type: "error" as SSEEventType,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ========== 带工具的流式聊天 ==========

async function* streamWithTools(
  llm: ChatDeepSeek,
  tools: any[],
  messages: BaseMessage[],
  requestId: string
): AsyncGenerator<StreamChunk> {
  // 绑定工具到 LLM
  const llmWithTools = llm.bindTools(tools);

  // 添加工具使用指令到 system prompt
  const toolNames = tools.map((t: any) => t.name).join('、');
  const toolInstruction = `\n\n【可用工具】${toolNames ? `你有以下工具可用：${toolNames}。` : ''}

【重要】请优先直接回答用户的问题。只有当用户明确需要以下操作时，才使用工具：
- 需要获取当前时间或日期信息
- 需要进行数学计算
- 其他工具特定功能

对于简单的问候、对话、一般性问题，请直接回答，不要调用工具。`;

  // 在第一条消息前添加工具指令
  const augmentedMessages = [
    new SystemMessage((messages[0] as SystemMessage).content + toolInstruction),
    ...messages.slice(1),
  ];

  // 第一步：调用 LLM 决定是否使用工具
  const response = await llmWithTools.invoke(augmentedMessages);

  logger.info("LLM Response:", {
    hasContent: !!response.content,
    toolCalls: response.tool_calls?.length || 0,
  });

  // 如果没有工具调用，使用流式输出
  if (!response.tool_calls || response.tool_calls.length === 0) {
    // 使用带工具的 LLM 进行流式输出（虽然不调用工具）
    const stream = await llmWithTools.stream(augmentedMessages);
    for await (const chunk of stream) {
      if (chunk.content) {
        yield {
          type: "content" as SSEEventType,
          content: String(chunk.content),
        };
      }
    }
    yield { type: "done" as SSEEventType, done: true };
    return;
  }

  // 如果有工具调用，执行工具
  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolResults: any[] = [];

    for (const toolCall of response.tool_calls) {
      const toolCallId = `${requestId}-${toolCall.name}-${Date.now()}`;
      const displayName = await getToolDisplayName(toolCall.name);

      // 发送工具调用开始
      yield {
        type: "tool_call_start" as SSEEventType,
        toolCall: {
          id: toolCallId,
          name: toolCall.name,
          displayName,
          status: "running" as ToolCallStatus,
          timestamp: new Date(),
        },
      };

      try {
        // 执行单个工具
        const tool = tools.find((t: any) => t.name === toolCall.name);
        if (!tool) {
          throw new Error(`Tool not found: ${toolCall.name}`);
        }

        const result = await tool.invoke(toolCall.args);
        toolResults.push({ toolCall, result });

        logger.info("Tool result:", { toolName: toolCall.name, result });

        // 发送工具调用结束
        yield {
          type: "tool_call_end" as SSEEventType,
          toolCall: {
            id: toolCallId,
            name: toolCall.name,
            displayName,
            status: "success" as ToolCallStatus,
            output: result,
            timestamp: new Date(),
          },
        };
      } catch (error) {
        logger.error("Tool error:", error);
        yield {
          type: "tool_call_error" as SSEEventType,
          toolCall: {
            id: toolCallId,
            name: toolCall.name,
            displayName,
            status: "error" as ToolCallStatus,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date(),
          },
        };
      }
    }

    // 第二步：基于工具结果，再次调用 LLM 生成最终回复
    // 构建包含工具结果的消息历史（使用 ToolMessage）
    const toolMessages = toolResults.map(({ toolCall, result }) =>
      new ToolMessage({
        content: result,
        tool_call_id: toolCall.id,
        name: toolCall.name,
      })
    );

    const newMessages = [...messages, response, ...toolMessages];

    // 使用流式输出最终回复
    const finalStream = await llm.stream(newMessages);
    for await (const chunk of finalStream) {
      if (chunk.content) {
        yield {
          type: "content" as SSEEventType,
          content: String(chunk.content),
        };
      }
    }

    yield { type: "done" as SSEEventType, done: true };
  }
}

// ========== 简单流式聊天（无工具） ==========

async function* streamSimpleChat(
  llm: ChatDeepSeek,
  messages: BaseMessage[]
): AsyncGenerator<StreamChunk> {
  const stream = await llm.stream(messages);

  for await (const chunk of stream) {
    const content = chunk.content;
    if (content) {
      yield {
        type: "content" as SSEEventType,
        content: String(content),
      };
    }
  }

  yield { type: "done" as SSEEventType, done: true };
}

// ========== 聊天服务 ==========

export class ChatService {
  /**
   * 流式聊天
   */
  async *chatStream(request: ChatRequestWithTools): AsyncGenerator<StreamChunk> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    logger.info(`Chat request: ${requestId}`, {
      agentId: request.agentId,
      message: request.message.slice(0, 100),
    });

    yield* streamChatEvents(
      request.agentId,
      request.message,
      requestId
    );
  }

  /**
   * 简单聊天（不使用 Agent）
   */
  async *simpleChat(
    message: string,
    systemPrompt = "你是一个友好、专业的 AI 助手。"
  ): AsyncGenerator<StreamChunk> {
    return this.simpleChatWithPrompt(message, systemPrompt);
  }

  /**
   * 使用指定 system prompt 的简单聊天
   */
  async *simpleChatWithPrompt(
    message: string,
    systemPrompt: string
  ): AsyncGenerator<StreamChunk> {
    const llm = new ChatDeepSeek({
      apiKey: config.deepseekApiKey,
      model: config.deepseekModel,
      temperature: 0.7,
    });

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message),
    ];

    yield* streamSimpleChat(llm, messages);
  }

  /**
   * 获取 Agent 信息（用于聊天）
   */
  async getAgentForChat(agentId: string) {
    return db.getAgent(agentId);
  }
}

// 导出单例
export const chatService = new ChatService();
