/**
 * 安全配置工具单元测试
 */

import {
  SECURITY_CONFIG,
  validateSecurityConfig,
  generateCSPHeader,
  isRequestFromTrustedOrigin,
  generateSecureRandomString,
  validateOAuthState,
  sanitizeRedirectUrl,
} from '@/lib/security'

describe('Security Configuration', () => {
  describe('SECURITY_CONFIG', () => {
    it('应该包含正确的会话配置', () => {
      expect(SECURITY_CONFIG.SESSION.MAX_AGE).toBe(7 * 24 * 60 * 60)
      expect(SECURITY_CONFIG.SESSION.UPDATE_AGE).toBe(24 * 60 * 60)
    })

    it('应该包含正确的 Cookie 配置', () => {
      expect(SECURITY_CONFIG.COOKIES.SECURE).toBe(false) // 测试环境
      expect(SECURITY_CONFIG.COOKIES.SAME_SITE).toBe('lax')
      expect(SECURITY_CONFIG.COOKIES.HTTP_ONLY).toBe(true)
    })

    it('应该包含正确的 OAuth 权限范围', () => {
      expect(SECURITY_CONFIG.OAUTH_SCOPES.GITHUB).toBe('read:user user:email')
      expect(SECURITY_CONFIG.OAUTH_SCOPES.GOOGLE).toBe('openid email profile')
    })
  })

  describe('validateSecurityConfig', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('应该在所有必需环境变量存在时返回有效', () => {
      process.env.AUTH_SECRET = 'test-secret-key-for-testing-purposes-only'
      process.env.NEXTAUTH_URL = 'http://localhost:3000'
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id'
      process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret'
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
      process.env.NODE_ENV = 'test'

      const result = validateSecurityConfig()
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该在缺少必需环境变量时返回错误', () => {
      delete process.env.AUTH_SECRET

      const result = validateSecurityConfig()
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('缺少必需的环境变量: AUTH_SECRET')
    })

    it('应该在生产环境验证 HTTPS 配置', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXTAUTH_URL = 'http://localhost:3000' // 非 HTTPS

      const result = validateSecurityConfig()
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('生产环境的 NEXTAUTH_URL 必须使用 HTTPS')
    })
  })

  describe('generateCSPHeader', () => {
    it('应该生成有效的 CSP 头', () => {
      const csp = generateCSPHeader()

      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain('https://accounts.google.com')
      expect(csp).toContain('https://avatars.githubusercontent.com')
      expect(csp).toContain("object-src 'none'")
    })

    it('应该在开发环境包含更宽松的策略', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const csp = generateCSPHeader()
      expect(csp).toContain('upgrade-insecure-requests')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('isRequestFromTrustedOrigin', () => {
    beforeEach(() => {
      process.env.NEXTAUTH_URL = 'https://example.com'
    })

    it('应该接受可信来源', () => {
      expect(isRequestFromTrustedOrigin('https://example.com')).toBe(true)
      expect(isRequestFromTrustedOrigin('https://accounts.google.com')).toBe(
        true
      )
      expect(isRequestFromTrustedOrigin('https://github.com')).toBe(true)
    })

    it('应该拒绝不可信来源', () => {
      expect(isRequestFromTrustedOrigin('https://malicious.com')).toBe(false)
      expect(isRequestFromTrustedOrigin('http://example.com')).toBe(false)
      expect(isRequestFromTrustedOrigin(null)).toBe(false)
    })
  })

  describe('generateSecureRandomString', () => {
    it('应该生成指定长度的随机字符串', () => {
      const str = generateSecureRandomString(32)
      expect(str).toHaveLength(32)
      expect(/^[A-Za-z0-9]+$/.test(str)).toBe(true)
    })

    it('应该生成不同的随机字符串', () => {
      const str1 = generateSecureRandomString(32)
      const str2 = generateSecureRandomString(32)
      expect(str1).not.toBe(str2)
    })

    it('应该使用默认长度', () => {
      const str = generateSecureRandomString()
      expect(str).toHaveLength(32)
    })
  })

  describe('validateOAuthState', () => {
    it('应该验证有效的状态参数', () => {
      const validState = 'abcdefghijklmnopqrstuvwxyz123456'
      expect(validateOAuthState(validState)).toBe(true)
    })

    it('应该拒绝无效的状态参数', () => {
      expect(validateOAuthState(null)).toBe(false)
      expect(validateOAuthState('')).toBe(false)
      expect(validateOAuthState('short')).toBe(false)
      expect(validateOAuthState('invalid-chars!')).toBe(false)
    })
  })

  describe('sanitizeRedirectUrl', () => {
    beforeEach(() => {
      process.env.NEXTAUTH_URL = 'https://example.com'
    })

    it('应该允许同域重定向', () => {
      const url = 'https://example.com/dashboard'
      expect(sanitizeRedirectUrl(url)).toBe(url)
    })

    it('应该拒绝跨域重定向', () => {
      const url = 'https://malicious.com/dashboard'
      expect(sanitizeRedirectUrl(url)).toBe(null)
    })

    it('应该处理无效 URL', () => {
      expect(sanitizeRedirectUrl('invalid-url')).toBe(null)
      expect(sanitizeRedirectUrl(null)).toBe(null)
    })
  })
})
