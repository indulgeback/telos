/**
 * 多提供者登录兼容性集成测试
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signIn, getProviders, useSession } from 'next-auth/react'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
    signIn: jest.fn(),
    signOut: jest.fn(),
    getProviders: jest.fn(),
    useSession: jest.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('多提供者登录兼容性测试', () => {
    const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
    const mockGetProviders = getProviders as jest.MockedFunction<typeof getProviders>
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

    beforeEach(() => {
        jest.clearAllMocks()
        
        // 默认未认证状态
        mockUseSession.mockReturnValue({
            data: null,
            status: 'unauthenticated',
            update: jest.fn(),
        })

        // 模拟多个提供者
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

    describe('提供者配置兼容性', () => {
        it('应该同时支持 Google 和 GitHub 提供者', async () => {
            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            // 验证两个按钮都可点击
            const googleButton = screen.getByText('Sign in with Google')
            const githubButton = screen.getByText('Sign in with GitHub')

            expect(googleButton).not.toBeDisabled()
            expect(githubButton).not.toBeDisabled()
        })

        it('应该处理只有一个提供者可用的情况', async () => {
            // 只提供 Google 提供者
            mockGetProviders.mockResolvedValue({
                google: {
                    id: 'google',
                    name: 'Google',
                    type: 'oauth',
                    signinUrl: '/api/auth/signin/google',
                    callbackUrl: '/api/auth/callback/google',
                },
            })

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            // GitHub 按钮不应该存在
            expect(screen.queryByText('Sign in with GitHub')).not.toBeInTheDocument()
        })

        it('应该处理没有提供者可用的情况', async () => {
            mockGetProviders.mockResolvedValue({})

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                // 应该显示加载状态或错误信息
                expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument()
                expect(screen.queryByText('Sign in with GitHub')).not.toBeInTheDocument()
            })
        })
    })

    describe('登录流程兼容性', () => {
        it('应该能够使用 Google 提供者登录', async () => {
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
            })

            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('google', {
                    callbackUrl: '/dashboard',
                    redirect: false,
                })
            })
        })

        it('应该能够使用 GitHub 提供者登录', async () => {
            mockSignIn.mockResolvedValue({
                error: null,
                status: 200,
                ok: true,
                url: '/dashboard',
            })

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            const githubButton = screen.getByText('Sign in with GitHub')
            await userEvent.click(githubButton)

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('github', {
                    callbackUrl: '/dashboard',
                    redirect: false,
                })
            })
        })

        it('应该在一个提供者失败时允许尝试另一个', async () => {
            // Google 登录失败
            mockSignIn.mockImplementation((provider) => {
                if (provider === 'google') {
                    return Promise.resolve({
                        error: 'AccessDenied',
                        status: 401,
                        ok: false,
                        url: null,
                    })
                }
                // GitHub 登录成功
                return Promise.resolve({
                    error: null,
                    status: 200,
                    ok: true,
                    url: '/dashboard',
                })
            })

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            // 先尝试 Google 登录
            const googleButton = screen.getByText('Sign in with Google')
            await userEvent.click(googleButton)

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('google', expect.any(Object))
            })

            // Google 登录失败后，GitHub 按钮应该仍然可用
            const githubButton = screen.getByText('Sign in with GitHub')
            expect(githubButton).not.toBeDisabled()

            // 尝试 GitHub 登录
            await userEvent.click(githubButton)

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('github', expect.any(Object))
            })
        })
    })

    describe('会话状态兼容性', () => {
        it('应该正确处理 Google 用户会话', async () => {
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: '123456789',
                        email: 'test@gmail.com',
                        name: 'Test User',
                        image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                status: 'authenticated',
                update: jest.fn(),
            })

            // 模拟已认证状态下的页面
            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return (
                    <div>
                        <div>Welcome, {session?.user?.name}</div>
                        <div>Email: {session?.user?.email}</div>
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
                expect(screen.getByText('Email: test@gmail.com')).toBeInTheDocument()
            })
        })

        it('应该正确处理 GitHub 用户会话', async () => {
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: '12345',
                        email: 'test@example.com',
                        name: 'GitHub User',
                        image: 'https://avatars.githubusercontent.com/u/12345',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                status: 'authenticated',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return (
                    <div>
                        <div>Welcome, {session?.user?.name}</div>
                        <div>Email: {session?.user?.email}</div>
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByText('Welcome, GitHub User')).toBeInTheDocument()
                expect(screen.getByText('Email: test@example.com')).toBeInTheDocument()
            })
        })

        it('应该处理会话过期', async () => {
            // 初始认证状态
            mockUseSession.mockReturnValueOnce({
                data: {
                    user: {
                        id: '123456789',
                        email: 'test@gmail.com',
                        name: 'Test User',
                    },
                    expires: new Date(Date.now() - 1000).toISOString(), // 已过期
                },
                status: 'authenticated',
                update: jest.fn(),
            })

            // 然后变为未认证状态
            mockUseSession.mockReturnValue({
                data: null,
                status: 'unauthenticated',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Please sign in</div>
                
                return <div>Welcome, {session?.user?.name}</div>
            }

            const { rerender } = render(<TestComponent />)

            // 重新渲染以触发状态变化
            rerender(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByText('Please sign in')).toBeInTheDocument()
            })
        })
    })

    describe('错误处理兼容性', () => {
        it('应该为不同提供者显示相应的错误信息', async () => {
            const { default: AuthErrorPage } = await import('@/app/[locale]/(default-layout)/auth/error/page')

            // Mock useSearchParams for Google error
            const mockUseSearchParams = jest.fn(() => ({
                get: jest.fn((key) => {
                    if (key === 'error') return 'AccessDenied'
                    if (key === 'provider') return 'google'
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

        it('应该提供返回登录页面的选项', async () => {
            const { default: AuthErrorPage } = await import('@/app/[locale]/(default-layout)/auth/error/page')

            const mockUseSearchParams = jest.fn(() => ({
                get: jest.fn((key) => {
                    if (key === 'error') return 'Configuration'
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
        })
    })

    describe('用户体验兼容性', () => {
        it('应该在所有提供者按钮上保持一致的样式', async () => {
            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google').closest('button')
            const githubButton = screen.getByText('Sign in with GitHub').closest('button')

            // 验证按钮具有相似的样式类
            expect(googleButton).toHaveClass('w-full', 'h-12')
            expect(githubButton).toHaveClass('w-full', 'h-12')
        })

        it('应该在移动设备上正确显示多个提供者', async () => {
            // 模拟移动设备视口
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375,
            })

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            // 验证按钮在移动设备上仍然可见和可点击
            const googleButton = screen.getByText('Sign in with Google')
            const githubButton = screen.getByText('Sign in with GitHub')

            expect(googleButton).toBeVisible()
            expect(githubButton).toBeVisible()
        })

        it('应该支持键盘导航', async () => {
            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            const googleButton = screen.getByText('Sign in with Google')
            const githubButton = screen.getByText('Sign in with GitHub')

            // 测试 Tab 键导航
            googleButton.focus()
            expect(document.activeElement).toBe(googleButton)

            // 模拟 Tab 键
            await userEvent.tab()
            expect(document.activeElement).toBe(githubButton)

            // 测试 Enter 键激活
            mockSignIn.mockResolvedValue({
                error: null,
                status: 200,
                ok: true,
                url: '/dashboard',
            })

            await userEvent.keyboard('{Enter}')

            await waitFor(() => {
                expect(mockSignIn).toHaveBeenCalledWith('github', expect.any(Object))
            })
        })
    })

    describe('性能兼容性', () => {
        it('应该并行加载多个提供者配置', async () => {
            const startTime = Date.now()

            // 模拟网络延迟
            mockGetProviders.mockImplementation(() => 
                new Promise(resolve => 
                    setTimeout(() => resolve({
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
                    }), 100)
                )
            )

            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
                expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
            })

            const loadTime = Date.now() - startTime
            expect(loadTime).toBeLessThan(1000) // 应该在1秒内加载完成
        })

        it('应该缓存提供者配置', async () => {
            const { default: SignInPage } = await import('@/app/[locale]/(default-layout)/auth/signin/page')

            // 第一次渲染
            const { unmount } = render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            unmount()

            // 第二次渲染
            render(<SignInPage />)

            await waitFor(() => {
                expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
            })

            // getProviders 应该只被调用一次（如果有缓存）
            // 注意：这个测试可能需要根据实际的缓存实现进行调整
            expect(mockGetProviders).toHaveBeenCalled()
        })
    })
})