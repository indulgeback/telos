import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";
import { toolExecutor } from "./toolExecutor.js";
import { db } from "./db.js";

// ========== 内置工具定义 ==========

const BUILTIN_TOOLS: ToolDefinition[] = [
  {
    id: "builtin-calculator",
    name: "calculator",
    type: "invokable" as any,
    displayName: "计算器",
    description: "执行数学运算，支持加法、减法、乘法、除法。",
    category: "builtin",
    endpoint: {
      urlTemplate: "internal://calculator",
      method: "GET",
    },
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "运算类型",
          enum: ["add", "subtract", "multiply", "divide"],
          required: true,
        },
        a: {
          type: "number",
          description: "第一个数字",
          required: true,
        },
        b: {
          type: "number",
          description: "第二个数字",
          required: true,
        },
      },
      required: ["operation", "a", "b"],
    },
    enabled: true,
    version: "1.0.0",
    tags: ["math", "calculator"],
  },
  {
    id: "builtin-time",
    name: "get_current_time",
    type: "invokable" as any,
    displayName: "当前时间",
    description: "获取指定时区的当前时间。",
    category: "builtin",
    endpoint: {
      urlTemplate: "internal://time",
      method: "GET",
    },
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "时区标识符，如 Asia/Shanghai、America/New_York、UTC 等",
          required: false,
        },
      },
      required: [],
    },
    enabled: true,
    version: "1.0.0",
    tags: ["time", "datetime"],
  },
];

// ========== 工具服务 ==========

export class ToolService {
  private agentToolsCache = new Map<string, any[]>();

  /**
   * 创建 LangChain 工具（从数据库定义）
   */
  createLangChainTool(toolDef: ToolDefinition) {
    // 构建 Zod Schema
    const schemaShape: Record<string, z.ZodTypeAny> = {};

    for (const [name, param] of Object.entries(toolDef.parameters.properties || {})) {
      const paramDef = param as any;

      let zodType: z.ZodTypeAny;

      switch (paramDef.type) {
        case "string":
          zodType = z.string();
          break;
        case "number":
          zodType = z.number();
          break;
        case "boolean":
          zodType = z.boolean();
          break;
        case "array":
          zodType = z.array(z.any());
          break;
        case "object":
          zodType = z.record(z.any());
          break;
        default:
          zodType = z.any();
      }

      // 添加枚举约束
      if (paramDef.enum && Array.isArray(paramDef.enum)) {
        zodType = z.enum(paramDef.enum as [string, ...string[]]);
      }

      // 处理可选参数
      const isRequired = Array.isArray(toolDef.parameters.required) &&
        toolDef.parameters.required.includes(name);

      if (!isRequired) {
        zodType = zodType.optional();
      }

      // 添加描述
      if (paramDef.description) {
        zodType = zodType.describe(paramDef.description);
      }

      schemaShape[name] = zodType;
    }

    const zodSchema = z.object(schemaShape);

    // 创建 LangChain 工具
    return tool(
      async (input: any) => {
        const result = await toolExecutor.execute({
          tool: toolDef,
          parameters: input,
        });

        if (!result.success) {
          throw new Error(result.errorMessage || "工具执行失败");
        }

        // 返回字符串结果
        if (typeof result.data === "string") {
          return result.data;
        }
        return JSON.stringify(result.data);
      },
      {
        name: toolDef.name,
        description: toolDef.description,
        schema: zodSchema,
      }
    );
  }

  /**
   * 获取内置工具（所有 Agent 自动拥有）
   */
  getBuiltinTools() {
    return BUILTIN_TOOLS.map((toolDef) =>
      this.createLangChainTool(toolDef)
    );
  }

  /**
   * 获取 Agent 的所有工具（内置 + 数据库配置）
   */
  async getToolsForAgent(agentId: string, forceRefresh = false) {
    // 检查缓存
    if (!forceRefresh && this.agentToolsCache.has(agentId)) {
      return this.agentToolsCache.get(agentId)!;
    }

    const tools: any[] = [];

    // 1. 添加内置工具
    tools.push(...this.getBuiltinTools());

    // 2. 从数据库获取 Agent 配置的工具
    const dbTools = await db.getToolsForAgent(agentId);

    // 去重（跳过与内置工具同名的数据库工具）
    const builtinNames = new Set(BUILTIN_TOOLS.map((t) => t.name));
    const uniqueDbTools = dbTools.filter((t) => !builtinNames.has(t.name));

    // 3. 转换数据库工具为 LangChain 工具
    for (const dbTool of uniqueDbTools) {
      try {
        const langchainTool = this.createLangChainTool(dbTool as any);
        tools.push(langchainTool);
      } catch (error) {
        console.error(`Failed to create tool ${dbTool.name}:`, error);
      }
    }

    // 缓存结果
    this.agentToolsCache.set(agentId, tools);

    return tools;
  }

  /**
   * 清除缓存
   */
  clearCache(agentId?: string) {
    if (agentId) {
      this.agentToolsCache.delete(agentId);
    } else {
      this.agentToolsCache.clear();
    }
  }

  /**
   * 列出所有可用工具
   */
  async listTools(options?: {
    category?: string;
    enabled?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (options?.category) {
      where.category = options.category;
    }

    if (options?.enabled !== undefined) {
      where.enabled = options.enabled;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { displayName: { contains: options.search, mode: "insensitive" } },
        { description: { contains: options.search, mode: "insensitive" } },
      ];
    }

    return prisma.tool.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });
  }

  /**
   * 获取工具详情
   */
  async getToolDetail(id: string) {
    return db.getToolById(id);
  }

  /**
   * 创建工具
   */
  async createTool(data: any) {
    const tool = await db.createTool(data);
    // 清除所有 Agent 的工具缓存
    this.clearCache();
    return tool;
  }

  /**
   * 更新工具
   */
  async updateTool(id: string, data: any) {
    const tool = await db.updateTool(id, data);
    // 清除所有 Agent 的工具缓存
    this.clearCache();
    return tool;
  }

  /**
   * 删除工具
   */
  async deleteTool(id: string) {
    await db.deleteTool(id);
    // 清除所有 Agent 的工具缓存
    this.clearCache();
  }
}

// 导出单例
export const toolService = new ToolService();

// 导入 prisma
import { prisma } from "./db.js";
