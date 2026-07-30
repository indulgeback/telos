import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from '../config/index.js'

// 复用 agent-service 的 Prisma 初始化方式
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({ connectionString: config.databaseUrl })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma
}
