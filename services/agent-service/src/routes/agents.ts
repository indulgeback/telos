import { Router, Request, Response } from "express";
import { prisma } from "../services/db.js";
import { randomUUID } from "node:crypto";
import { logger } from "../config/index.js";
import type { ApiResponse } from "../types/index.js";
import { serializeAgent, serializeAgents, serializeTools } from "../utils/serializer.js";
import { toolService } from "../services/toolService.js";

export const agentsRouter = Router();

// 辅助函数：从路径参数中提取字符串
function getParamString(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return String(value);
}

/**
 * GET /api/agents
 * 获取 Agent 列表
 */
agentsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // 转换为 snake_case 以匹配 Go 版本
    const serializedAgents = serializeAgents(agents);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: serializedAgents,
    };

    res.json(response);
  } catch (error) {
    logger.error({
      msg: "List agents error",
      err: error,
    });
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "获取 Agent 列表失败",
    });
  }
});

/**
 * GET /api/agents/:id
 * 获取 Agent 详情
 */
agentsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: getParamString(req, "id") },
    });

    if (!agent) {
      return res.status(404).json({
        code: 404,
        message: "Agent 不存在",
      });
    }

    // 转换为 snake_case 以匹配 Go 版本
    const serializedAgent = serializeAgent(agent);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: serializedAgent,
    };

    res.json(response);
  } catch (error) {
    logger.error({
      msg: "Get agent error",
      agentId: getParamString(req, "id"),
      err: error,
    });
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "获取 Agent 详情失败",
    });
  }
});

/**
 * GET /api/agents/default
 * 获取默认 Agent
 */
agentsRouter.get("/default", async (req: Request, res: Response) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: {
        isDefault: true,
      },
    });

    if (!agent) {
      return res.status(404).json({
        code: 404,
        message: "默认 Agent 不存在",
      });
    }

    // 转换为 snake_case 以匹配 Go 版本
    const serializedAgent = serializeAgent(agent);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: serializedAgent,
    };

    res.json(response);
  } catch (error) {
    logger.error({
      msg: "Get default agent error",
      err: error,
    });
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "获取默认 Agent 失败",
    });
  }
});

/**
 * POST /api/agents
 * 创建新 Agent
 */
agentsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, type } = req.body;

    const agent = await prisma.agent.create({
      data: {
        id: randomUUID(),
        name,
        description,
        type: type || "PUBLIC",
        systemPrompt: req.body.systemPrompt || "",
        ownerId: req.body.ownerId || null,
        isDefault: false,
      },
    });

    // 转换为 snake_case 以匹配 Go 版本
    const serializedAgent = serializeAgent(agent);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: serializedAgent,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error({
      msg: "Create agent error",
      agentName: req.body.name,
      err: error,
    });
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "创建 Agent 失败",
    });
  }
});

/**
 * PUT /api/agents/:id
 * 更新 Agent
 */
agentsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { name, description, systemPrompt } = req.body;

    const agent = await prisma.agent.update({
      where: { id: getParamString(req, "id") },
      data: {
        name,
        description,
        systemPrompt,
      },
    });

    // 转换为 snake_case 以匹配 Go 版本
    const serializedAgent = serializeAgent(agent);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: serializedAgent,
    };

    res.json(response);
  } catch (error) {
    logger.error({
      msg: "Update agent error",
      agentId: getParamString(req, "id"),
      err: error,
    });
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "更新 Agent 失败",
    });
  }
});

/**
 * DELETE /api/agents/:id
 * 删除 Agent
 */
agentsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await prisma.agent.delete({
      where: { id: getParamString(req, "id") },
    });

    res.status(204).send();
  } catch (error) {
    logger.error({
      msg: "Delete agent error",
      agentId: getParamString(req, "id"),
      err: error,
    });
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "删除 Agent 失败",
    });
  }
});

// ========== Agent 工具关联接口 ==========

/**
 * GET /api/agents/:id/tools
 * 获取 Agent 的工具
 */
agentsRouter.get("/:id/tools", async (req: Request, res: Response) => {
  try {
    const agentId = getParamString(req, "id");
    const agentTools = await prisma.agentTool.findMany({
      where: { agentId },
      include: { tool: true },
    });

    // 提取工具信息并序列化
    const tools = agentTools
      .filter((at) => at.tool !== null && at.tool.enabled)
      .map((at) => ({
        ...at.tool,
        agent_tool_id: at.id,
        enabled: at.enabled,
      }));

    const serializedTools = serializeTools(tools);

    res.status(200).json({ tools: serializedTools });
  } catch (error) {
    logger.error({
      msg: "Get agent tools error",
      agentId: getParamString(req, "id"),
      err: error,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "获取 Agent 工具失败",
    });
  }
});

/**
 * PUT /api/agents/:id/tools
 * 设置 Agent 的工具
 */
agentsRouter.put("/:id/tools", async (req: Request, res: Response) => {
  try {
    const agentId = getParamString(req, "id");
    const { tool_ids: toolIds } = req.body;

    if (!Array.isArray(toolIds)) {
      return res.status(400).json({
        error: "tool_ids must be an array",
      });
    }

    // 删除现有关联
    await prisma.agentTool.deleteMany({
      where: { agentId },
    });

    // 创建新关联
    if (toolIds.length > 0) {
      await prisma.agentTool.createMany({
        data: toolIds.map((toolId: string) => ({
          id: randomUUID(),
          agentId,
          toolId,
          enabled: true,
        })),
      });
    }

    // 清除缓存
    toolService.clearCache(agentId);

    res.status(200).json({ message: "Tools updated successfully" });
  } catch (error) {
    logger.error({
      msg: "Set agent tools error",
      agentId: getParamString(req, "id"),
      toolCount: req.body.tool_ids?.length || 0,
      err: error,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "设置 Agent 工具失败",
    });
  }
});
