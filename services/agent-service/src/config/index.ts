import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// ========== 配置导出 ==========
export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || '',

  // DeepSeek Model
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl:
    process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',

  // Seed Model (ByteDance)
  seedApiKey: process.env.SEED_API_KEY || '',
  seedBaseUrl:
    process.env.SEED_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',

  // 服务
  port: parseInt(process.env.PORT || '8895', 10),
  serviceName: process.env.SERVICE_NAME || 'agent-service',
  serviceAddress: process.env.SERVICE_ADDRESS || '', // 服务注册地址

  // 日志
  logLevel: process.env.LOG_LEVEL || 'info',
} as const

// ========== 验证配置 ==========
export function validateConfig(): void {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  if (!config.deepseekApiKey && !config.seedApiKey) {
    throw new Error(
      'At least one model key is required: DEEPSEEK_API_KEY or SEED_API_KEY'
    )
  }
}

// ========== 导出 Pino Logger ==========
export { logger, createModuleLogger } from './logger.js'
