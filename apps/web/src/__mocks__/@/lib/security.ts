/**
 * 安全模块模拟
 */

export const SECURITY_CONFIG = {
  SESSION: {
    MAX_AGE: 7 * 24 * 60 * 60,
    UPDATE_AGE: 24 * 60 * 60,
  },
  COOKIES: {
    HTTP_ONLY: true,
    SAME_SITE: 'lax',
    SECURE: false,
  },
  OAUTH_SCOPES: {
    // OAuth 提供者权限范围已移除
  },
}

export const validateSecurityConfig = jest.fn(() => ({
  isValid: true,
  errors: [],
}))

export default {
  SECURITY_CONFIG,
  validateSecurityConfig,
}
