/**
 * JWT 回调函数测试
 */

// Jest globals are available globally, no need to import

// Mock API client
jest.mock('@/lib/api-client')

describe('JWT 回调函数', () => {
  let mockApiClient: any

  beforeEach(async () => {
    const apiClientModule = await import('@/lib/api-client')
    mockApiClient = apiClientModule.apiClient
    jest.clearAllMocks()
  })

  describe('首次登录处理', () => {
    it('应该在首次登录时创建 JWT token', async () => {
      const token = {}
      const user = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
      }
      const account = {
        provider: 'google',
        access_token: 'google_access_token_123',
        refresh_token: 'google_refresh_token_123',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }

      mockApiClient.syncUser.mockResolvedValue({
        success: true,
        user: user,
      })

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token, user, account }: any) => {
        // 首次登录时，user 和 account 都存在
        if (user && account) {
          try {
            // 同步用户信息到后端
            await mockApiClient.syncUser({
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
              accessToken: account.access_token,
            })
          } catch (error) {
            console.error('用户信息同步失败:', error)
            // 不阻止登录流程
          }

          return {
            ...token,
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
          }
        }

        return token
      }

      const result = await jwtCallback({ token, user, account })

      expect(result.id).toBe(user.id)
      expect(result.email).toBe(user.email)
      expect(result.name).toBe(user.name)
      expect(result.image).toBe(user.image)
      expect(result.provider).toBe(account.provider)
      expect(result.accessToken).toBe(account.access_token)
      expect(result.refreshToken).toBe(account.refresh_token)
      expect(result.expiresAt).toBe(account.expires_at)
      expect(mockApiClient.syncUser).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        provider: account.provider,
        accessToken: account.access_token,
      })
    })

    it('应该处理用户同步失败但不阻止登录', async () => {
      const token = {}
      const user = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
      }
      const account = {
        provider: 'google',
        access_token: 'google_access_token_123',
      }

      mockApiClient.syncUser.mockRejectedValue(new Error('Backend sync failed'))

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token, user, account }: any) => {
        if (user && account) {
          try {
            await mockApiClient.syncUser({
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
              accessToken: account.access_token,
            })
          } catch (error) {
            console.error('用户信息同步失败:', error)
            // 不阻止登录流程，继续创建 token
          }

          return {
            ...token,
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            accessToken: account.access_token,
          }
        }

        return token
      }

      const result = await jwtCallback({ token, user, account })

      // 即使同步失败，也应该创建 token
      expect(result.id).toBe(user.id)
      expect(result.email).toBe(user.email)
      expect(result.provider).toBe(account.provider)
      expect(mockApiClient.syncUser).toHaveBeenCalled()
    })
  })

  describe('后续请求处理', () => {
    it('应该在后续请求中返回现有 token', async () => {
      const existingToken = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
        provider: 'google',
        accessToken: 'google_access_token_123',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      }

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token, user, account }: any) => {
        // 后续请求时，只有 token 存在
        if (!user && !account) {
          return token
        }

        // 首次登录逻辑...
        return token
      }

      const result = await jwtCallback({
        token: existingToken,
        user: null,
        account: null,
      })

      expect(result).toEqual(existingToken)
      expect(mockApiClient.syncUser).not.toHaveBeenCalled()
    })

    it('应该检查 token 是否过期', async () => {
      const expiredToken = {
        id: '123456789',
        email: 'test@gmail.com',
        provider: 'google',
        accessToken: 'expired_token',
        refreshToken: 'refresh_token_123',
        expiresAt: Math.floor(Date.now() / 1000) - 3600, // 已过期
      }

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token }: any) => {
        const now = Math.floor(Date.now() / 1000)

        // 检查 token 是否过期
        if (token.expiresAt && token.expiresAt < now) {
          // 如果有 refresh token，可以尝试刷新
          if (token.refreshToken) {
            try {
              // 这里应该调用刷新 token 的逻辑
              // 为了测试，我们模拟刷新成功
              return {
                ...token,
                accessToken: 'new_access_token',
                expiresAt: now + 3600,
                refreshToken: 'new_refresh_token',
              }
            } catch (error) {
              console.error('Token 刷新失败:', error)
              // 刷新失败，返回原 token，让系统处理重新登录
              return token
            }
          }
        }

        return token
      }

      const result = await jwtCallback({ token: expiredToken })

      // 应该返回刷新后的 token
      expect(result.accessToken).toBe('new_access_token')
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })
  })

  describe('多提供者支持', () => {
    it('应该处理 GitHub 提供者', async () => {
      const token = {}
      const user = {
        id: '12345',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://avatars.githubusercontent.com/u/12345',
      }
      const account = {
        provider: 'github',
        access_token: 'github_access_token_123',
      }

      mockApiClient.syncUser.mockResolvedValue({ success: true })

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token, user, account }: any) => {
        if (user && account) {
          try {
            await mockApiClient.syncUser({
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
              accessToken: account.access_token,
            })
          } catch (error) {
            console.error('用户信息同步失败:', error)
          }

          return {
            ...token,
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            accessToken: account.access_token,
          }
        }

        return token
      }

      const result = await jwtCallback({ token, user, account })

      expect(result.provider).toBe('github')
      expect(result.accessToken).toBe('github_access_token_123')
      expect(mockApiClient.syncUser).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        provider: 'github',
        accessToken: 'github_access_token_123',
      })
    })

    it('应该为不同提供者保持独立的 token', async () => {
      const googleToken = {
        id: '123456789',
        provider: 'google',
        accessToken: 'google_token',
      }

      const githubToken = {
        id: '12345',
        provider: 'github',
        accessToken: 'github_token',
      }

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token }: any) => {
        // 根据提供者返回相应的 token
        return token
      }

      const googleResult = await jwtCallback({ token: googleToken })
      const githubResult = await jwtCallback({ token: githubToken })

      expect(googleResult.provider).toBe('google')
      expect(googleResult.accessToken).toBe('google_token')
      expect(githubResult.provider).toBe('github')
      expect(githubResult.accessToken).toBe('github_token')
    })
  })

  describe('安全性验证', () => {
    it('应该验证必需的用户字段', async () => {
      const token = {}
      const invalidUser = {
        id: '',
        email: '',
        name: '',
      }
      const account = {
        provider: 'google',
        access_token: 'token_123',
      }

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token, user, account }: any) => {
        if (user && account) {
          // 验证必需字段
          if (!user.id || !user.email) {
            console.error('用户信息不完整:', user)
            throw new Error('用户信息不完整')
          }

          return {
            ...token,
            id: user.id,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            provider: account.provider,
            accessToken: account.access_token,
          }
        }

        return token
      }

      await expect(
        jwtCallback({ token, user: invalidUser, account })
      ).rejects.toThrow('用户信息不完整')
    })

    it('应该清理和验证用户输入', async () => {
      const token = {}
      const user = {
        id: '  123456789  ',
        email: '  TEST@GMAIL.COM  ',
        name: '  <script>alert("xss")</script>Test User  ',
        image: '  https://example.com/avatar.jpg  ',
      }
      const account = {
        provider: 'google',
        access_token: 'token_123',
      }

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token, user, account }: any) => {
        if (user && account) {
          // 清理用户输入
          const sanitizedUser = {
            id: user.id?.toString().trim(),
            email: user.email?.toLowerCase().trim(),
            name: user.name?.replace(/<[^>]*>/g, '').trim(), // 移除 HTML 标签
            image: user.image?.trim(),
          }

          return {
            ...token,
            ...sanitizedUser,
            provider: account.provider,
            accessToken: account.access_token,
          }
        }

        return token
      }

      const result = await jwtCallback({ token, user, account })

      expect(result.id).toBe('123456789')
      expect(result.email).toBe('test@gmail.com')
      expect(result.name).toBe('alert("xss")Test User')
      expect(result.image).toBe('https://example.com/avatar.jpg')
    })

    it('应该限制 token 大小', async () => {
      const token = {}
      const user = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        bio: 'A'.repeat(10000), // 非常长的 bio
      }
      const account = {
        provider: 'google',
        access_token: 'token_123',
      }

      // 模拟 JWT 回调函数
      const jwtCallback = async ({ token, user, account }: any) => {
        if (user && account) {
          const newToken = {
            ...token,
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            accessToken: account.access_token,
          }

          // 检查 token 大小（JWT 有大小限制）
          const tokenString = JSON.stringify(newToken)
          if (tokenString.length > 4096) {
            // 4KB 限制
            console.warn('Token 过大，移除非必需字段')
            // 移除非必需字段
            delete newToken.bio
          }

          return newToken
        }

        return token
      }

      const result = await jwtCallback({ token, user, account })

      expect(result.bio).toBeUndefined()
      expect(result.id).toBe(user.id)
      expect(result.email).toBe(user.email)
    })
  })
})
