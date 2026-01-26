import { Router, Request, Response } from "express";
import { prisma } from "../services/db.js";
import { randomUUID } from "node:crypto";
import { logger } from "../config/index.js";
import type { ApiResponse } from "../types/index.js";

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

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: agents,
    };

    res.json(response);
  } catch (error) {
    logger.error("List agents error:", error);
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

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: agent,
    };

    res.json(response);
  } catch (error) {
    logger.error("Get agent error:", error);
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

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: agent,
    };

    res.json(response);
  } catch (error) {
    logger.error("Get default agent error:", error);
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

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: agent,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error("Create agent error:", error);
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

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: agent,
    };

    res.json(response);
  } catch (error) {
    logger.error("Update agent error:", error);
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
    logger.error("Delete agent error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "删除 Agent 失败",
    });
  }
});
