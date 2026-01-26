import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// ========== 配置导出 ==========
export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || '',

  // DeepSeek
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',

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
  if (!config.deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY is required')
  }
}

// ========== 日志工具 ==========
export const logger = {
  debug: (...args: any[]) => {
    if (config.logLevel === 'debug') {
      console.log('[DEBUG]', ...args)
    }
  },
  info: (...args: any[]) => {
    console.log('[INFO]', ...args)
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  },
}
