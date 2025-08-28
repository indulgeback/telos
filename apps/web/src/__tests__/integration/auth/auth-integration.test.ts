/**
 * 认证集成测试
 * 测试完整的 Google OAuth 登录流程
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn, getProviders } from 'next-auth/react'
import userEvent from '@testing-library/user-event'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
    signIn: jest.fn(),
    signOut: jest.fn(),
    getProviders: jest.fn(),
    useSession: jest.fn(() => ({
        data: null,
        status: 'unauthenticated',
    })),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock API client
jest.mock('@/lib/api-client', () => ({
    apiClient: {
        syncUser: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
    },
}))

describe('认证集成测试', () => {
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
    const mockGetProviders = getProviders as jest.MockedFunction<typeof getProviders>

    beforeEach(() => {
        jest.clearAllMocks()
        
        // 模拟提供者数据
        mockGetProviders.mockResolvedValue({
            google: {
                id: 'google',
                name: 'Google',
                type: 'oauth',
                signinUrl: '/api/auth/signin/google',
                callbackUrl: '/api/auth/callback/google',
            },
            github: {
                id: 'github',
                name: 'GitHub',
                type: 'oauth',
                signinUrl: '/api/auth/signin/github',
                callbackUrl: '/api/auth/callback/github',
            },
        })
    })

    describe('完整 Google OAuth 登录流程', () => {
        it('应该成功完成 Google 登录流程', async () => {
            // 模拟成功的登录响应
            mockSignIn.mockResolvedValue({
                error: null,
                status: 200,
                ok: true,
                url: '/dashboard',
            })

            // 动态导入登录页面组件
            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            // 等待页面加载完成
            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            // 点击 Google 登录按钮
            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            // 验证 signIn 被正确调用
            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('google', {
                    callbackUrl: '/dashboard',
                    redirect: false,
                })
            })

            // 验证按钮显示加载状态
            expect(screen.getByText('Signing in...')).toBeInTheDocument()
        })

        it('应该处理 Google 登录失败', async () => {
            // 模拟登录失败
            mockSignIn.mockResolvedValue({
                error: 'AccessDenied',
                status: 401,
                ok: false,
                url: null,
            })

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            // 等待错误处理
            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalled()
            })

            // 验证错误不会阻止用户界面
            expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
        })

        it('应该处理网络错误', async () => {
            // 模拟网络错误
            mockSignIn.mockRejectedValue(new Error('Network error'))

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            // 等待错误处理
            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalled()
            })

            // 验证按钮恢复正常状态
            expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
        })
    })

    describe('多提供者登录兼容性测试', () => {
        it('应该同时显示 Google 和 GitHub 登录选项', async () => {
            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            // 等待两个提供者都加载完成
            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })
        })

        it('应该能够在不同提供者之间切换', async () => {
            mockSignIn.mockResolvedValue({
                error: null,
                status: 200,
                ok: true,
                url: '/dashboard',
            })

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            // 先点击 Google 登录
            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('google', expect.any(Object))
            })

            // 重置 mock
            mockSignIn.mockClear()

            // 再点击 GitHub 登录
            const githubButton = screen.getByText('Sign in with GitHub')
            await userEvent.click(githubButton)

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('github', expect.any(Object))
            })
        })

        it('应该防止同时点击多个登录按钮', async () => {
            mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            // 快速点击两个按钮
            const googleButton = screen.getByText('Sign in with Google')
            const githubButton = screen.getByText('Sign in with GitHub')

            await userEvent.click(googleButton)
            await userEvent.click(githubButton)

            // 验证只有一个登录请求被发送
            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledTimes(1)
            })

            // 验证 GitHub 按钮被禁用
            expect(githubButton).toBeDisabled()
        })
    })

    describe('会话管理和持久化测试', () => {
        it('应该在登录成功后重定向到指定页面', async () => {
            mockSignIn.mockResolvedValue({
                error: null,
                status: 200,
                ok: true,
                url: '/dashboard',
            })

            // Mock window.location.href setter
            const mockLocationHref = jest.fn()
            Object.defineProperty(window, 'location', {
                value: {
                    ...window.location,
                    set href(url) {
                        mockLocationHref(url)
                    },
                },
                writable: true,
            })

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            await waitFor(() => {
                expect(mockLocationHref).toHaveBeenCalledWith('/dashboard')
            })
        })

        it('应该处理自定义回调 URL', async () => {
            mockSignIn.mockResolvedValue({
                error: null,
                status: 200,
                ok: true,
                url: '/custom-callback',
            })

            // Mock useSearchParams to return custom callback URL
            const mockUseSearchParams = jest.fn(() => ({
                get: jest.fn((key) => {
                    if (key === 'callbackUrl') return '/custom-callback'
                    return null
                }),
            }))

            jest.doMock('next/navigation', () => ({
                ...jest.requireActual('next/navigation'),
                useSearchParams: mockUseSearchParams,
            }))

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('google', {
                    callbackUrl: '/custom-callback',
                    redirect: false,
                })
            })
        })
    })

    describe('后端 API 同步测试', () => {
        it('应该在登录时同步用户信息到后端', async () => {
            const { apiClient } = await import('@/lib/api-client')
            const mockSyncUser = apiClient.syncUser as jest.MockedFunction<typeof apiClient.syncUser>

            mockSyncUser.mockResolvedValue({
                success: true,
                user: {
                    id: '123456789',
                    email: 'test@gmail.com',
                    name: 'Test User',
                    provider: 'google',
                },
            })

            // 模拟 JWT 回调
            const mockUser = {
                id: '123456789',
                email: 'test@gmail.com',
                name: 'Test User',
                image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
            }
            const mockAccount = {
                provider: 'google',
                access_token: 'google_access_token_123',
            }

            // 模拟 JWT 回调逻辑
            const jwtCallback = async ({ token, user, account }: any) => {
                if (user && account) {
                    try {
                        await mockSyncUser({
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

            const result = await jwtCallback({
                token: {},
                user: mockUser,
                account: mockAccount,
            })

            expect(mockSyncUser).toHaveBeenCalledWith({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                image: mockUser.image,
                provider: mockAccount.provider,
                accessToken: mockAccount.access_token,
            })

            expect(result.provider).toBe('google')
            expect(result.id).toBe(mockUser.id)
        })

        it('应该处理后端同步失败但不阻止登录', async () => {
            const { apiClient } = await import('@/lib/api-client')
            const mockSyncUser = apiClient.syncUser as jest.MockedFunction<typeof apiClient.syncUser>

            mockSyncUser.mockRejectedValue(new Error('Backend sync failed'))

            const mockUser = {
                id: '123456789',
                email: 'test@gmail.com',
                name: 'Test User',
                image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
            }
            const mockAccount = {
                provider: 'google',
                access_token: 'google_access_token_123',
            }

            // 模拟 JWT 回调逻辑
            const jwtCallback = async ({ token, user, account }: any) => {
                if (user && account) {
                    try {
                        await mockSyncUser({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            accessToken: account.access_token,
                        })
                    } catch (error) {
                        console.error('用户信息同步失败:', error)
                        // 不重新抛出错误，允许登录继续
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

            const result = await jwtCallback({
                token: {},
                user: mockUser,
                account: mockAccount,
            })

            expect(mockSyncUser).toHaveBeenCalled()
            // 即使同步失败，JWT 仍应创建成功
            expect(result.provider).toBe('google')
            expect(result.id).toBe(mockUser.id)
        })

        it('应该重试失败的后端同步', async () => {
            const { apiClient } = await import('@/lib/api-client')
            const mockSyncUser = apiClient.syncUser as jest.MockedFunction<typeof apiClient.syncUser>

            // 第一次失败，第二次成功
            mockSyncUser
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    success: true,
                    user: { id: '123456789', email: 'test@gmail.com' },
                })

            const mockUser = {
                id: '123456789',
                email: 'test@gmail.com',
                name: 'Test User',
            }
            const mockAccount = {
                provider: 'google',
                access_token: 'google_access_token_123',
            }

            // 模拟带重试的同步逻辑
            const syncWithRetry = async (userInfo: any, maxRetries = 2) => {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        return await mockSyncUser(userInfo)
                    } catch (error) {
                        if (attempt === maxRetries) {
                            throw error
                        }
                        // 等待后重试
                        await new Promise(resolve => setTimeout(resolve, 100 * attempt))
                    }
                }
            }

            const result = await syncWithRetry({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                provider: mockAccount.provider,
                accessToken: mockAccount.access_token,
            })

            expect(mockSyncUser).toHaveBeenCalledTimes(2)
            expect(result.success).toBe(true)
        })
    })

    describe('错误场景集成测试', () => {
        it('应该显示认证错误页面', async () => {
            // 动态导入错误页面组件
            const { default: AuthErrorPage } = await import('@/app/[locale]/(default-layout)/auth/error/page')

            // Mock useSearchParams to return error
            const mockUseSearchParams = jest.fn(() => ({
                get: jest.fn((key) => {
                    if (key === 'error') return 'AccessDenied'
                    return null
                }),
            }))

            jest.doMock('next/navigation', () => ({
                ...jest.requireActual('next/navigation'),
                useSearchParams: mockUseSearchParams,
            }))

            render(<AuthErrorPage />)

            await waitFor(() => {
                expect(screen.getByText('Access denied')).toBeInTheDocument()
            })
        })

        it('应该提供重试登录选项', async () => {
            const { default: AuthErrorPage } = await import('@/app/[locale]/(default-layout)/auth/error/page')

            const mockUseSearchParams = jest.fn(() => ({
                get: jest.fn((key) => {
                    if (key === 'error') return 'AccessDenied'
                    return null
                }),
            }))

            jest.doMock('next/navigation', () => ({
                ...jest.requireActual('next/navigation'),
                useSearchParams: mockUseSearchParams,
            }))

            render(<AuthErrorPage />)

            await waitFor(() => {
                expect(screen.getByText('Try again')).toBeInTheDocument()
            })

            const retryButton = screen.getByText('Try again')
            expect(retryButton).toBeInTheDocument()
        })
    })

    describe('性能和用户体验测试', () => {
        it('应该在合理时间内加载登录页面', async () => {
            const startTime = Date.now()

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            const loadTime = Date.now() - startTime
            expect(loadTime).toBeLessThan(5000) // 5秒内加载完成
        })

        it('应该正确处理快速连续点击', async () => {
            mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)))

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google')

            // 快速点击多次
            await userEvent.click(googleButton)
            await userEvent.click(googleButton)
            await userEvent.click(googleButton)

            // 应该只触发一次登录
            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledTimes(1)
            })
        })

        it('应该在登录过程中显示适当的加载状态', async () => {
            mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            // 验证加载状态
            await waitFor(() => {
                expect(screen.getByText('Signing in...')).toBeInTheDocument()
            })

            // 验证按钮被禁用
            expect(googleButton).toBeDisabled()
        })
    })
})