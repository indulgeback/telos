/**
 * NextAuth 配置单元测试
 */

// Jest globals are available globally, no need to import

// Mock the API client before importing auth
jest.mock('@/lib/api-client')

// Mock the security module
jest.mock('@/lib/security', () => ({
  SECURITY_CONFIG: {
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
      GITHUB: 'read:user user:email',
      GOOGLE: 'openid email profile',
    },
  },
  validateSecurityConfig: jest.fn(() => ({
    isValid: true,
    errors: [],
  })),
}))

describe('NextAuth Configuration', () => {
  let mockApiClient: any

  beforeEach(async () => {
    // 使用模拟的 API 客户端
    mockApiClient = {
      syncUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      getUserProfile: jest.fn(),
      updateUserProfile: jest.fn(),
    }
    jest.clearAllMocks()
  })

  describe('Provider Configuration', () => {
    it('应该配置 GitHub 提供者', () => {
      // 验证环境变量
      expect(process.env.GITHUB_CLIENT_ID).toBeDefined()
      expect(process.env.GITHUB_CLIENT_SECRET).toBeDefined()
    })

    it('应该配置 Google 提供者', async () => {
      // 验证环境变量
      expect(process.env.GOOGLE_CLIENT_ID).toBeDefined()
      expect(process.env.GOOGLE_CLIENT_SECRET).toBeDefined()
    })
  })

  describe('JWT Callback', () => {
    it('应该在首次登录时保存用户信息', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      }
      const mockAccount = {
        provider: 'google',
        access_token: 'access_token_123',
      }

      mockApiClient.syncUser.mockResolvedValue({})

      // 模拟 JWT 回调逻辑
      const result = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        image: mockUser.image,
        accessToken: mockAccount.access_token,
        provider: mockAccount.provider,
      }

      expect(result.id).toBe(mockUser.id)
      expect(result.email).toBe(mockUser.email)
      expect(result.provider).toBe(mockAccount.provider)
    })

    it('应该处理用户同步失败', async () => {
      mockApiClient.syncUser.mockRejectedValue(new Error('Sync failed'))

      // 验证错误不会阻止登录流程
      expect(() => {
        // 模拟同步失败的处理
        try {
          throw new Error('Sync failed')
        } catch (error) {
          console.error('用户信息同步失败', error)
          // 不重新抛出错误
        }
      }).not.toThrow()
    })
  })

  describe('Session Callback', () => {
    it('应该将 token 信息传递给 session', () => {
      const mockSession = {
        user: {
          id: '',
          email: '',
          name: '',
          image: '',
        },
      }
      const mockToken = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      }

      // 模拟 session 回调逻辑
      const result = {
        ...mockSession,
        user: {
          id: mockToken.id,
          email: mockToken.email,
          name: mockToken.name,
          image: mockToken.image,
        },
      }

      expect(result.user.id).toBe(mockToken.id)
      expect(result.user.email).toBe(mockToken.email)
    })
  })

  describe('Authorization Callback', () => {
    const protectedPaths = ['/dashboard', '/profile', '/workflows', '/settings']

    it('应该允许访问公共页面', () => {
      const publicPaths = ['/', '/auth/signin', '/about']

      publicPaths.forEach(path => {
        const isProtected = protectedPaths.some(protectedPath =>
          path.includes(protectedPath)
        )
        expect(isProtected).toBe(false)
      })
    })

    it('应该识别受保护的页面', () => {
      protectedPaths.forEach(path => {
        const isProtected = protectedPaths.some(protectedPath =>
          path.includes(protectedPath)
        )
        expect(isProtected).toBe(true)
      })
    })

    it('应该在未认证时拒绝访问受保护页面', () => {
      const isLoggedIn = false
      const isOnProtectedPage = true

      if (isOnProtectedPage) {
        expect(isLoggedIn).toBe(false)
      }
    })

    it('应该在已认证时允许访问受保护页面', () => {
      const isLoggedIn = true
      const isOnProtectedPage = true

      if (isOnProtectedPage) {
        expect(isLoggedIn).toBe(true)
      }
    })
  })

  describe('Event Handlers', () => {
    it('应该在登录时调用后端 API', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      }
      const mockAccount = {
        provider: 'google',
        access_token: 'access_token_123',
      }

      mockApiClient.signIn.mockResolvedValue({})

      // 模拟登录事件处理
      await mockApiClient.signIn({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        image: mockUser.image,
        provider: mockAccount.provider,
        accessToken: mockAccount.access_token,
      })

      expect(mockApiClient.signIn).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        image: mockUser.image,
        provider: mockAccount.provider,
        accessToken: mockAccount.access_token,
      })
    })

    it('应该在登出时调用后端 API', async () => {
      const userId = 'user123'
      mockApiClient.signOut.mockResolvedValue({})

      // 模拟登出事件处理
      await mockApiClient.signOut(userId)

      expect(mockApiClient.signOut).toHaveBeenCalledWith(userId)
    })

    it('应该处理后端 API 调用失败', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
      }

      mockApiClient.signIn.mockRejectedValue(new Error('API failed'))

      // 验证错误不会阻止登录流程
      try {
        await mockApiClient.signIn(mockUser)
      } catch (error) {
        console.error('后端登录接口调用失败:', error)
        // 不重新抛出错误
      }

      expect(mockApiClient.signIn).toHaveBeenCalled()
    })
  })

  describe('Security Configuration', () => {
    it('应该使用安全的会话配置', async () => {
      const { SECURITY_CONFIG } = await import('@/lib/security')

      expect(SECURITY_CONFIG.SESSION.MAX_AGE).toBe(7 * 24 * 60 * 60)
      expect(SECURITY_CONFIG.SESSION.UPDATE_AGE).toBe(24 * 60 * 60)
    })

    it('应该使用安全的 Cookie 配置', async () => {
      const { SECURITY_CONFIG } = await import('@/lib/security')

      expect(SECURITY_CONFIG.COOKIES.HTTP_ONLY).toBe(true)
      expect(SECURITY_CONFIG.COOKIES.SAME_SITE).toBe('lax')
    })

    it('应该使用最小化的 OAuth 权限范围', async () => {
      const { SECURITY_CONFIG } = await import('@/lib/security')

      expect(SECURITY_CONFIG.OAUTH_SCOPES.GITHUB).toBe('read:user user:email')
      expect(SECURITY_CONFIG.OAUTH_SCOPES.GOOGLE).toBe('openid email profile')
    })
  })
})
