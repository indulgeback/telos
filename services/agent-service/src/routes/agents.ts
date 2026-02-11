import { Router, Request, Response } from "express";
import { prisma } from "../services/db.js";
import { randomUUID } from "node:crypto";
import { logger } from "../config/index.js";
import type { ApiResponse } from "../types/index.js";
import { serializeAgent, serializeAgents } from "../utils/serializer.js";

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
        type: typeof type === "string" ? type.toLowerCase() : "public",
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
    const { name, description } = req.body;

    const agent = await prisma.agent.update({
      where: { id: getParamString(req, "id") },
      data: {
        name,
        description,
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
