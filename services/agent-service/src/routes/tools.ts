import { Router, Request, Response } from "express";
import { toolService } from "../services/toolService.js";
import { logger } from "../config/index.js";
import type { ToolListOptions } from "../types/index.js";
import { serializeTools, serializeTool } from "../utils/serializer.js";

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
 *
 * 返回格式（与 Go 版本保持一致）:
 * {
 *   "tools": [...],
 *   "total": 123,
 *   "page": 1,
 *   "page_size": 20
 * }
 */
toolsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const options: ToolListOptions = {
      category: getQueryString(req, "category"),
      enabled: getQueryString(req, "enabled") === "true" ? true : getQueryString(req, "enabled") === "false" ? false : undefined,
      search: getQueryString(req, "search"),
      page: parseInt(getQueryString(req, "page") || "1"),
      pageSize: parseInt(getQueryString(req, "page_size") || "20"),
    };

    const tools = await toolService.listTools(options);

    // 转换为 snake_case 以匹配 Go 版本
    const serializedTools = serializeTools(tools);

    const total = serializedTools.length; // 简化实现，实际应该从数据库获取总数

    // 与 Go 版本保持一致的响应格式
    res.status(200).json({
      tools: serializedTools,
      total: total,
      page: options.page,
      page_size: options.pageSize,
    });
  } catch (error) {
    logger.error({
      msg: "List tools error",
      err: error,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "获取工具列表失败",
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
        error: "Tool not found",
      });
    }

    // 转换为 snake_case 以匹配 Go 版本
    const serializedTool = serializeTool(tool);

    res.status(200).json(serializedTool);
  } catch (error) {
    logger.error({
      msg: "Get tool error",
      toolId: getParamString(req, "id"),
      err: error,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "获取工具详情失败",
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
    // 转换为 snake_case 以匹配 Go 版本
    const serializedTool = serializeTool(tool);
    res.status(201).json(serializedTool);
  } catch (error) {
    logger.error({
      msg: "Create tool error",
      toolName: req.body.name,
      err: error,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "创建工具失败",
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
    // 转换为 snake_case 以匹配 Go 版本
    const serializedTool = serializeTool(tool);
    res.status(200).json(serializedTool);
  } catch (error) {
    logger.error({
      msg: "Update tool error",
      toolId: getParamString(req, "id"),
      err: error,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "更新工具失败",
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
    logger.error({
      msg: "Delete tool error",
      toolId: getParamString(req, "id"),
      err: error,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : "删除工具失败",
    });
  }
});
