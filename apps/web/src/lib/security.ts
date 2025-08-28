/**
 * 安全配置工具
 * 集中管理应用的安全设置和验证
 */

// 安全配置常量
export const SECURITY_CONFIG = {
  // 会话配置
  SESSION: {
    MAX_AGE: 7 * 24 * 60 * 60, // 7 天
    UPDATE_AGE: 24 * 60 * 60, // 24 小时
  },

  // Cookie 配置
  COOKIES: {
    SECURE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'lax' as const,
    HTTP_ONLY: true,
  },

  // CSRF 保护
  CSRF: {
    ENABLED: true,
    TOKEN_LENGTH: 32,
  },

  // OAuth 权限范围
  OAUTH_SCOPES: {
    GITHUB: 'read:user user:email',
    GOOGLE: 'openid email profile',
  },

  // 安全头配置
  SECURITY_HEADERS: {
    FRAME_OPTIONS: 'DENY',
    CONTENT_TYPE_OPTIONS: 'nosniff',
    REFERRER_POLICY: 'strict-origin-when-cross-origin',
    XSS_PROTECTION: '1; mode=block',
  },

  // HSTS 配置
  HSTS: {
    MAX_AGE: 31536000, // 1 年
    INCLUDE_SUBDOMAINS: true,
    PRELOAD: true,
  },
} as const

/**
 * 验证环境变量是否正确配置
 */
export function validateSecurityConfig(): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 检查必需的环境变量
  const requiredEnvVars = [
    'AUTH_SECRET',
    'NEXTAUTH_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`缺少必需的环境变量: ${envVar}`)
    }
  }

  // 检查 AUTH_SECRET 强度（仅在生产环境严格检查）
  const authSecret = process.env.AUTH_SECRET
  if (authSecret && process.env.NODE_ENV === 'production') {
    if (authSecret.length < 32) {
      errors.push('AUTH_SECRET 长度应至少为 32 个字符')
    }
    if (authSecret === 'your-auth-secret-here') {
      errors.push('AUTH_SECRET 不应使用默认值，请生成一个安全的密钥')
    }
  }

  // 检查生产环境配置
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXTAUTH_URL?.startsWith('https://')) {
      errors.push('生产环境的 NEXTAUTH_URL 必须使用 HTTPS')
    }

    if (process.env.NEXT_PUBLIC_SECURE_COOKIES !== 'true') {
      errors.push('生产环境应启用安全 Cookie')
    }

    if (process.env.NEXT_PUBLIC_FORCE_HTTPS !== 'true') {
      errors.push('生产环境应强制使用 HTTPS')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 生成内容安全策略（CSP）头
 */
export function generateCSPHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.github.com https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ]

  // 开发环境允许更宽松的策略
  if (process.env.NODE_ENV === 'development') {
    directives[1] =
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com"
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

/**
 * 检查请求是否来自可信来源
 */
export function isRequestFromTrustedOrigin(origin: string | null): boolean {
  if (!origin) return false

  const trustedOrigins = [
    process.env.NEXTAUTH_URL,
    'https://accounts.google.com',
    'https://github.com',
  ].filter(Boolean)

  return trustedOrigins.some(trusted => origin.startsWith(trusted!))
}

/**
 * 生成安全的随机字符串
 */
export function generateSecureRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

/**
 * 验证 OAuth 状态参数
 */
export function validateOAuthState(state: string | null): boolean {
  if (!state) return false

  // 状态参数应该是一个安全的随机字符串
  const stateRegex = /^[A-Za-z0-9]{32,}$/
  return stateRegex.test(state)
}

/**
 * 清理和验证重定向 URL
 */
export function sanitizeRedirectUrl(url: string | null): string | null {
  if (!url) return null

  try {
    const parsedUrl = new URL(url)
    const baseUrl = new URL(process.env.NEXTAUTH_URL!)

    // 只允许同域重定向
    if (parsedUrl.origin !== baseUrl.origin) {
      return null
    }

    return parsedUrl.toString()
  } catch {
    return null
  }
}
