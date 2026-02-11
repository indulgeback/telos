import { logger } from '../config/index.js'

// ========== Prisma 客户端 ==========

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 日志中间件（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  ;(prisma as any).$on('query', (e: any) => {
    logger.debug({
      msg: 'Prisma query',
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    })
  })

  ;(prisma as any).$on('error', (e: any) => {
    logger.error({
      msg: 'Prisma error',
      err: e.message,
    })
  })

  ;(prisma as any).$on('warn', (e: any) => {
    logger.warn({
      msg: 'Prisma warning',
      warning: e.message,
    })
  })
}

// ========== 数据库服务 ==========

export class DatabaseService {
  /**
   * 获取 Agent 详情
   */
  async getAgent(agentId: string) {
    return prisma.agent.findUnique({
      where: { id: agentId },
    })
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }

  /**
   * 关闭连接
   */
  async disconnect() {
    await prisma.$disconnect()
  }
}

export const db = new DatabaseService()
