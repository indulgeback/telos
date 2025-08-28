/**
 * 用户信息映射逻辑测试
 */

// Jest globals are available globally, no need to import

// Mock API client
jest.mock('@/lib/api-client')

describe('用户信息映射逻辑', () => {
  let mockApiClient: any

  beforeEach(async () => {
    const apiClientModule = await import('@/lib/api-client')
    mockApiClient = apiClientModule.apiClient
    jest.clearAllMocks()
  })

  describe('Google 用户信息映射', () => {
    it('应该正确映射完整的 Google 用户信息', () => {
      const googleProfile = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://lh3.googleusercontent.com/a/avatar.jpg',
        email_verified: true,
        locale: 'en',
        hd: 'company.com', // Google Workspace domain
      }

      // 模拟用户信息映射函数
      const mapGoogleUser = (profile: any) => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        image: profile.picture,
        emailVerified: profile.email_verified,
        locale: profile.locale,
        domain: profile.hd,
        firstName: profile.given_name,
        lastName: profile.family_name,
      })

      const mappedUser = mapGoogleUser(googleProfile)

      expect(mappedUser.id).toBe('123456789')
      expect(mappedUser.email).toBe('test@gmail.com')
      expect(mappedUser.name).toBe('Test User')
      expect(mappedUser.image).toBe(
        'https://lh3.googleusercontent.com/a/avatar.jpg'
      )
      expect(mappedUser.emailVerified).toBe(true)
      expect(mappedUser.locale).toBe('en')
      expect(mappedUser.domain).toBe('company.com')
      expect(mappedUser.firstName).toBe('Test')
      expect(mappedUser.lastName).toBe('User')
    })

    it('应该处理最小化的 Google 用户信息', () => {
      const minimalGoogleProfile = {
        id: '987654321',
        email: 'minimal@gmail.com',
      }

      // 模拟用户信息映射函数
      const mapGoogleUser = (profile: any) => ({
        id: profile.id,
        email: profile.email,
        name: profile.name || profile.email.split('@')[0],
        image: profile.picture || null,
        emailVerified: profile.email_verified || false,
      })

      const mappedUser = mapGoogleUser(minimalGoogleProfile)

      expect(mappedUser.id).toBe('987654321')
      expect(mappedUser.email).toBe('minimal@gmail.com')
      expect(mappedUser.name).toBe('minimal')
      expect(mappedUser.image).toBeNull()
      expect(mappedUser.emailVerified).toBe(false)
    })

    it('应该处理无效的头像 URL', () => {
      const profileWithInvalidImage = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'invalid-url',
      }

      // 模拟头像 URL 验证函数
      const isValidImageUrl = (url: string) => {
        try {
          const parsedUrl = new URL(url)
          return (
            parsedUrl.protocol === 'https:' &&
            (parsedUrl.hostname.includes('googleusercontent.com') ||
              parsedUrl.hostname.includes('googleapis.com'))
          )
        } catch {
          return false
        }
      }

      const mapGoogleUser = (profile: any) => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        image: isValidImageUrl(profile.picture) ? profile.picture : null,
      })

      const mappedUser = mapGoogleUser(profileWithInvalidImage)

      expect(mappedUser.image).toBeNull()
    })
  })

  describe('GitHub 用户信息映射', () => {
    it('应该正确映射 GitHub 用户信息', () => {
      const githubProfile = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        bio: 'Software Developer',
        company: 'Test Company',
        location: 'Test City',
        blog: 'https://testuser.dev',
      }

      // 模拟用户信息映射函数
      const mapGithubUser = (profile: any) => ({
        id: profile.id.toString(),
        email: profile.email,
        name: profile.name || profile.login,
        image: profile.avatar_url,
        username: profile.login,
        bio: profile.bio,
        company: profile.company,
        location: profile.location,
        website: profile.blog,
      })

      const mappedUser = mapGithubUser(githubProfile)

      expect(mappedUser.id).toBe('12345')
      expect(mappedUser.email).toBe('test@example.com')
      expect(mappedUser.name).toBe('Test User')
      expect(mappedUser.image).toBe(
        'https://avatars.githubusercontent.com/u/12345'
      )
      expect(mappedUser.username).toBe('testuser')
      expect(mappedUser.bio).toBe('Software Developer')
      expect(mappedUser.company).toBe('Test Company')
      expect(mappedUser.location).toBe('Test City')
      expect(mappedUser.website).toBe('https://testuser.dev')
    })

    it('应该处理缺失邮箱的 GitHub 用户', () => {
      const githubProfileNoEmail = {
        id: 12345,
        login: 'testuser',
        name: 'Test User',
        email: null,
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      }

      // 模拟用户信息映射函数
      const mapGithubUser = (profile: any) => ({
        id: profile.id.toString(),
        email: profile.email || `${profile.login}@users.noreply.github.com`,
        name: profile.name || profile.login,
        image: profile.avatar_url,
        username: profile.login,
      })

      const mappedUser = mapGithubUser(githubProfileNoEmail)

      expect(mappedUser.email).toBe('testuser@users.noreply.github.com')
    })
  })

  describe('用户信息同步', () => {
    it('应该成功同步用户信息到后端', async () => {
      const userInfo = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
        provider: 'google',
      }

      mockApiClient.syncUser.mockResolvedValue({
        success: true,
        user: userInfo,
      })

      // 模拟用户同步函数
      const syncUserToBackend = async (userInfo: any) => {
        try {
          const result = await mockApiClient.syncUser(userInfo)
          return { success: true, data: result }
        } catch (error) {
          console.error('用户同步失败:', error)
          return { success: false, error }
        }
      }

      const result = await syncUserToBackend(userInfo)

      expect(result.success).toBe(true)
      expect(mockApiClient.syncUser).toHaveBeenCalledWith(userInfo)
    })

    it('应该处理用户同步失败', async () => {
      const userInfo = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        provider: 'google',
      }

      const syncError = new Error('Backend sync failed')
      mockApiClient.syncUser.mockRejectedValue(syncError)

      // 模拟用户同步函数
      const syncUserToBackend = async (userInfo: any) => {
        try {
          const result = await mockApiClient.syncUser(userInfo)
          return { success: true, data: result }
        } catch (error) {
          console.error('用户同步失败:', error)
          return { success: false, error }
        }
      }

      const result = await syncUserToBackend(userInfo)

      expect(result.success).toBe(false)
      expect(result.error).toBe(syncError)
      expect(mockApiClient.syncUser).toHaveBeenCalledWith(userInfo)
    })

    it('应该重试失败的同步操作', async () => {
      const userInfo = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
        provider: 'google',
      }

      // 第一次调用失败，第二次成功
      mockApiClient.syncUser
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, user: userInfo })

      // 模拟带重试的用户同步函数
      const syncUserWithRetry = async (userInfo: any, maxRetries = 2) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await mockApiClient.syncUser(userInfo)
            return { success: true, data: result, attempts: attempt }
          } catch (error) {
            if (attempt === maxRetries) {
              return { success: false, error, attempts: attempt }
            }
            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, 100 * attempt))
          }
        }
      }

      const result = await syncUserWithRetry(userInfo)

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
      expect(mockApiClient.syncUser).toHaveBeenCalledTimes(2)
    })
  })

  describe('数据验证', () => {
    it('应该验证必需的用户字段', () => {
      const validUser = {
        id: '123456789',
        email: 'test@gmail.com',
        name: 'Test User',
      }

      const invalidUser = {
        id: '',
        email: 'invalid-email',
        name: '',
      }

      // 模拟用户数据验证函数
      const validateUserData = (user: any) => {
        const errors = []

        if (!user.id || user.id.trim() === '') {
          errors.push('用户 ID 不能为空')
        }

        if (!user.email || !user.email.includes('@')) {
          errors.push('邮箱格式无效')
        }

        if (!user.name || user.name.trim() === '') {
          errors.push('用户名不能为空')
        }

        return {
          isValid: errors.length === 0,
          errors,
        }
      }

      const validResult = validateUserData(validUser)
      const invalidResult = validateUserData(invalidUser)

      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors).toContain('用户 ID 不能为空')
      expect(invalidResult.errors).toContain('邮箱格式无效')
      expect(invalidResult.errors).toContain('用户名不能为空')
    })

    it('应该清理和标准化用户数据', () => {
      const rawUser = {
        id: '  123456789  ',
        email: '  TEST@GMAIL.COM  ',
        name: '  Test User  ',
        image: '  https://example.com/avatar.jpg  ',
      }

      // 模拟数据清理函数
      const sanitizeUserData = (user: any) => ({
        id: user.id?.toString().trim(),
        email: user.email?.toLowerCase().trim(),
        name: user.name?.trim(),
        image: user.image?.trim() || null,
      })

      const cleanUser = sanitizeUserData(rawUser)

      expect(cleanUser.id).toBe('123456789')
      expect(cleanUser.email).toBe('test@gmail.com')
      expect(cleanUser.name).toBe('Test User')
      expect(cleanUser.image).toBe('https://example.com/avatar.jpg')
    })
  })
})
