import dotenv from 'dotenv'
import pino from 'pino'

// 加载环境变量
dotenv.config()

// ========== 配置导出 ==========
export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.ADMIN_PORT || '3002', 10),

  // 数据库 (复用 telos 主库)
  databaseUrl: process.env.DATABASE_URL || '',

  // Admin 鉴权
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '', // 必须在 .env 配置
  // Session 加密密钥 (AES-256-GCM, 32 字节 hex). 生成: openssl rand -hex 32
  sessionKey: process.env.ADMIN_SESSION_KEY || '', // 必须在 .env 配置
  sessionTtlSeconds: parseInt(process.env.ADMIN_SESSION_TTL || '86400', 10), // 默认 24h

  // CORS (admin 前端域名)
  corsOrigins: (process.env.ADMIN_CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim()),
}

// ========== 校验必填配置 ==========
export function validateConfig() {
  const errors: string[] = []
  if (!config.databaseUrl) errors.push('DATABASE_URL 未配置')
  if (!config.adminPassword) errors.push('ADMIN_PASSWORD 未配置 (管理后台登录密码)')
  if (!config.sessionKey) {
    errors.push('ADMIN_SESSION_KEY 未配置 (生成: openssl rand -hex 32)')
  } else if (config.sessionKey.length !== 64) {
    errors.push('ADMIN_SESSION_KEY 必须是 32 字节 hex (64 字符), 生成: openssl rand -hex 32')
  }
  if (errors.length > 0) {
    console.error('❌ Admin Service 配置错误:\n  ' + errors.join('\n  '))
    process.exit(1)
  }
}

// ========== Logger ==========
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
})
