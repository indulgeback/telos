import { logger } from "../config/index.js";
import { randomUUID } from "node:crypto";

// ========== Prisma 客户端 ==========

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 日志中间件（仅在开发环境）
if (process.env.NODE_ENV === "development") {
  (prisma as any).$on("query", (e: any) => {
    logger.debug({
      msg: "Prisma query",
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });

  (prisma as any).$on("error", (e: any) => {
    logger.error({
      msg: "Prisma error",
      err: e.message,
    });
  });

  (prisma as any).$on("warn", (e: any) => {
    logger.warn({
      msg: "Prisma warning",
      warning: e.message,
    });
  });
}

// ========== 数据库服务 ==========

export class DatabaseService {
  /**
   * 获取 Agent 的工具列表
   */
  async getToolsForAgent(agentId: string) {
    const agentTools = await prisma.agentTool.findMany({
      where: {
        agentId,
        enabled: true,
      },
      include: {
        tool: true,
      },
    });

    // 过滤出启用的工具
    return agentTools
      .filter((at) => at.tool !== null && at.tool.enabled)
      .map((at) => ({
        ...at.tool,
        // 覆盖配置（如果有）
        ...(at.config && { config: at.config }),
      }));
  }

  /**
   * 获取所有启用的工具
   */
  async getAllEnabledTools() {
    return prisma.tool.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  /**
   * 根据 ID 获取工具
   */
  async getToolById(id: string) {
    return prisma.tool.findUnique({
      where: { id },
    });
  }

  /**
   * 根据名称获取工具
   */
  async getToolByName(name: string) {
    return prisma.tool.findUnique({
      where: { name },
    });
  }

  /**
   * 创建工具
   */
  async createTool(data: any) {
    return prisma.tool.create({
      data,
    });
  }

  /**
   * 更新工具
   */
  async updateTool(id: string, data: any) {
    return prisma.tool.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除工具
   */
  async deleteTool(id: string) {
    return prisma.tool.delete({
      where: { id },
    });
  }

  /**
   * 获取 Agent 详情
   */
  async getAgent(agentId: string) {
    return prisma.agent.findUnique({
      where: { id: agentId },
    });
  }

  /**
   * 设置 Agent 的工具
   */
  async setAgentTools(agentId: string, toolIds: string[]) {
    // 使用事务确保原子性
    return prisma.$transaction(async (tx) => {
      // 删除现有关联
      await tx.agentTool.deleteMany({
        where: { agentId },
      });

      // 创建新关联
      if (toolIds.length > 0) {
        await tx.agentTool.createMany({
          data: toolIds.map((toolId) => ({
            id: randomUUID(),
            agentId,
            toolId,
            enabled: true,
          })),
        });
      }
    });
  }

  /**
   * 获取 Agent 的工具关联
   */
  async getAgentTools(agentId: string) {
    return prisma.agentTool.findMany({
      where: { agentId },
      include: {
        tool: true,
      },
    });
  }

  /**
   * 记录工具执行
   */
  async createToolExecution(data: {
    agentId?: string;
    userId?: string;
    toolId?: string;
    inputParams?: any;
    result?: any;
    success: boolean;
    errorMessage?: string;
    durationMs?: number;
    tokensUsed?: number;
  }) {
    return prisma.toolExecution.create({
      data: {
        id: randomUUID(),
        ...data,
      },
    });
  }

  /**
   * 获取工具执行历史
   */
  async getToolExecutions(agentId: string, limit = 50) {
    return prisma.toolExecution.findMany({
      where: { agentId },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 关闭连接
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}

// 导出单例
export const db = new DatabaseService();
