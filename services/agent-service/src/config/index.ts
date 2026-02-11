import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// ========== 配置导出 ==========
export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || '',

  // AI Model (OpenAI compatible)
  aiApiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || '',
  aiBaseUrl:
    process.env.AI_BASE_URL ||
    process.env.DEEPSEEK_BASE_URL ||
    'https://api.deepseek.com/v1',
  aiModel: process.env.AI_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat',

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
  if (!config.aiApiKey) {
    throw new Error('AI_API_KEY or DEEPSEEK_API_KEY is required')
  }
}

// ========== 导出 Pino Logger ==========
export { logger, createModuleLogger } from './logger.js'
