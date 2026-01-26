import { Router, Request, Response } from "express";
import { toolService } from "../services/toolService.js";
import { db } from "../services/db.js";
import { logger } from "../config/index.js";
import type { ApiResponse, ToolListOptions } from "../types/index.js";

export const toolsRouter = Router();

// 辅助函数：从查询参数中提取字符串
function getQueryString(req: Request, key: string): string | undefined {
  const value = req.query[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

// 辅助函数：从路径参数中提取字符串
function getParamString(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return String(value);
}

// ========== 工具管理接口 ==========

/**
 * GET /api/tools
 * 获取工具列表
 */
toolsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const options: ToolListOptions = {
      category: getQueryString(req, "category"),
      enabled: getQueryString(req, "enabled") === "true" ? true : getQueryString(req, "enabled") === "false" ? false : undefined,
      search: getQueryString(req, "search"),
      page: parseInt(getQueryString(req, "page") || "1"),
      pageSize: parseInt(getQueryString(req, "pageSize") || "20"),
    };

    const tools = await toolService.listTools(options);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: tools,
    };

    res.json(response);
  } catch (error) {
    logger.error("List tools error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "获取工具列表失败",
    });
  }
});

/**
 * GET /api/tools/:id
 * 获取工具详情
 */
toolsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = getParamString(req, "id");
    const tool = await toolService.getToolDetail(id);

    if (!tool) {
      return res.status(404).json({
        code: 404,
        message: "工具不存在",
      });
    }

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: tool,
    };

    res.json(response);
  } catch (error) {
    logger.error("Get tool error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "获取工具详情失败",
    });
  }
});

/**
 * POST /api/tools
 * 创建新工具（管理员）
 */
toolsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const tool = await toolService.createTool(req.body);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: tool,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error("Create tool error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "创建工具失败",
    });
  }
});

/**
 * PUT /api/tools/:id
 * 更新工具（管理员）
 */
toolsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const tool = await toolService.updateTool(getParamString(req, "id"), req.body);

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: tool,
    };

    res.json(response);
  } catch (error) {
    logger.error("Update tool error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "更新工具失败",
    });
  }
});

/**
 * DELETE /api/tools/:id
 * 删除工具（管理员）
 */
toolsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    await toolService.deleteTool(getParamString(req, "id"));

    res.status(204).send();
  } catch (error) {
    logger.error("Delete tool error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "删除工具失败",
    });
  }
});

// ========== Agent 工具关联接口 ==========

/**
 * GET /api/agents/:id/tools
 * 获取 Agent 的工具
 */
toolsRouter.get("/agents/:id/tools", async (req: Request, res: Response) => {
  try {
    const agentTools = await db.getAgentTools(getParamString(req, "id"));

    const response: ApiResponse = {
      code: 0,
      message: "success",
      data: agentTools,
    };

    res.json(response);
  } catch (error) {
    logger.error("Get agent tools error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "获取 Agent 工具失败",
    });
  }
});

/**
 * PUT /api/agents/:id/tools
 * 设置 Agent 的工具
 */
toolsRouter.put("/agents/:id/tools", async (req: Request, res: Response) => {
  try {
    const { toolIds } = req.body;

    if (!Array.isArray(toolIds)) {
      return res.status(400).json({
        code: 400,
        message: "toolIds 必须是数组",
      });
    }

    await db.setAgentTools(getParamString(req, "id"), toolIds);

    // 清除缓存
    toolService.clearCache(getParamString(req, "id"));

    const response: ApiResponse = {
      code: 0,
      message: "工具设置成功",
    };

    res.json(response);
  } catch (error) {
    logger.error("Set agent tools error:", error);
    res.status(500).json({
      code: 500,
      message: error instanceof Error ? error.message : "设置 Agent 工具失败",
    });
  }
});
