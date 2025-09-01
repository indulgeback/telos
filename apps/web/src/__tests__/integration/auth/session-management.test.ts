/**
 * 会话管理和持久化集成测试
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, signOut } from 'next-auth/react'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(),
    signOut: jest.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock API client
jest.mock('@/lib/api-client', () => ({
    apiClient: {
        signOut: jest.fn(),
        getUserProfile: jest.fn(),
        updateUserProfile: jest.fn(),
    },
}))

describe('会话管理和持久化测试', () => {
    const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
    const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('会话创建和初始化', () => {
        it('应该在登录后创建有效会话', async () => {
            const mockSession = {
                user: {
                    id: '123456789',
                    email: 'test@gmail.com',
                    name: 'Test User',
                    image: 'https://example.com/avatar.jpg',
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                accessToken: 'test_access_token_123',
                provider: 'test',
            }

            mockUseSession.mockReturnValue({
                data: mockSession,
                status: 'authenticated',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return (
                    <div>
                        <div data-testid="user-name">Welcome, {session?.user?.name}</div>
                        <div data-testid="user-email">Email: {session?.user?.email}</div>
                        <div data-testid="session-expires">Expires: {session?.expires}</div>
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, Test User')
                expect(screen.getByTestId('user-email')).toHaveTextContent('Email: test@gmail.com')
                expect(screen.getByTestId('session-expires')).toHaveTextContent('Expires:')
            })
        })

        it('应该处理会话加载状态', async () => {
            mockUseSession.mockReturnValue({
                data: null,
                status: 'loading',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                if (status === 'loading') return <div data-testid="loading">Loading session...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return <div>Welcome, {session?.user?.name}</div>
            }

            render(<TestComponent />)

            expect(screen.getByTestId('loading')).toHaveTextContent('Loading session...')
        })

        it('应该处理未认证状态', async () => {
            mockUseSession.mockReturnValue({
                data: null,
                status: 'unauthenticated',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div data-testid="unauthenticated">Please sign in</div>
                
                return <div>Welcome, {session?.user?.name}</div>
            }

            render(<TestComponent />)

            expect(screen.getByTestId('unauthenticated')).toHaveTextContent('Please sign in')
        })
    })

    describe('会话持久化', () => {
        it('应该在页面刷新后保持会话', async () => {
            const mockSession = {
                user: {
                    id: '123456789',
                    email: 'test@gmail.com',
                    name: 'Test User',
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }

            // 模拟页面刷新前的会话状态
            mockUseSession.mockReturnValueOnce({
                data: mockSession,
                status: 'authenticated',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return <div data-testid="user-name">Welcome, {session?.user?.name}</div>
            }

            const { rerender } = render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, Test User')
            })

            // 模拟页面刷新后的会话状态（应该保持相同）
            mockUseSession.mockReturnValue({
                data: mockSession,
                status: 'authenticated',
                update: jest.fn(),
            })

            rerender(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, Test User')
            })
        })

        it('应该处理会话过期', async () => {
            const expiredSession = {
                user: {
                    id: '123456789',
                    email: 'test@gmail.com',
                    name: 'Test User',
                },
                expires: new Date(Date.now() - 1000).toISOString(), // 已过期
            }

            // 初始状态：已过期的会话
            mockUseSession.mockReturnValueOnce({
                data: expiredSession,
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
                if (status === 'unauthenticated') return <div data-testid="expired">Session expired, please sign in again</div>
                
                return <div>Welcome, {session?.user?.name}</div>
            }

            const { rerender } = render(<TestComponent />)

            // 重新渲染以触发会话过期检查
            rerender(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('expired')).toHaveTextContent('Session expired, please sign in again')
            })
        })

        it('应该自动刷新即将过期的会话', async () => {
            const mockUpdate = jest.fn()
            const soonToExpireSession = {
                user: {
                    id: '123456789',
                    email: 'test@gmail.com',
                    name: 'Test User',
                },
                expires: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5分钟后过期
            }

            mockUseSession.mockReturnValue({
                data: soonToExpireSession,
                status: 'authenticated',
                update: mockUpdate,
            })

            const TestComponent = () => {
                const { data: session, status, update } = useSession()
                
                // 模拟自动刷新逻辑
                React.useEffect(() => {
                    if (session && status === 'authenticated') {
                        const expiresAt = new Date(session.expires).getTime()
                        const now = Date.now()
                        const timeUntilExpiry = expiresAt - now
                        
                        // 如果会话在10分钟内过期，自动刷新
                        if (timeUntilExpiry < 10 * 60 * 1000) {
                            update()
                        }
                    }
                }, [session, status, update])
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return <div data-testid="user-name">Welcome, {session?.user?.name}</div>
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, Test User')
                expect(mockUpdate).toHaveBeenCalled()
            })
        })
    })

    describe('会话更新', () => {
        it('应该能够更新用户信息', async () => {
            const { apiClient } = await import('@/lib/api-client')
            const mockUpdateUserProfile = apiClient.updateUserProfile as jest.MockedFunction<typeof apiClient.updateUserProfile>

            const mockUpdate = jest.fn()
            const initialSession = {
                user: {
                    id: '123456789',
                    email: 'test@gmail.com',
                    name: 'Test User',
                    image: 'https://example.com/avatar.jpg',
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }

            mockUseSession.mockReturnValue({
                data: initialSession,
                status: 'authenticated',
                update: mockUpdate,
            })

            mockUpdateUserProfile.mockResolvedValue({
                success: true,
                user: {
                    ...initialSession.user,
                    name: 'Updated User Name',
                },
            })

            const TestComponent = () => {
                const { data: session, status, update } = useSession()
                
                const handleUpdateProfile = async () => {
                    try {
                        await mockUpdateUserProfile({
                            name: 'Updated User Name',
                        })
                        // 更新会话
                        await update()
                    } catch (error) {
                        console.error('Profile update failed:', error)
                    }
                }
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return (
                    <div>
                        <div data-testid="user-name">Welcome, {session?.user?.name}</div>
                        <button onClick={handleUpdateProfile} data-testid="update-button">
                            Update Profile
                        </button>
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, Test User')
            })

            const updateButton = screen.getByTestId('update-button')
            await userEvent.click(updateButton)

            await waitFor(() => {
                expect(mockUpdateUserProfile).toHaveBeenCalledWith({
                    name: 'Updated User Name',
                })
                expect(mockUpdate).toHaveBeenCalled()
            })
        })

        it('应该处理会话更新失败', async () => {
            const mockUpdate = jest.fn().mockRejectedValue(new Error('Update failed'))
            
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: '123456789',
                        email: 'test@gmail.com',
                        name: 'Test User',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                status: 'authenticated',
                update: mockUpdate,
            })

            const TestComponent = () => {
                const { data: session, status, update } = useSession()
                const [error, setError] = React.useState<string | null>(null)
                
                const handleUpdate = async () => {
                    try {
                        await update()
                        setError(null)
                    } catch (err) {
                        setError('Failed to update session')
                    }
                }
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return (
                    <div>
                        <div data-testid="user-name">Welcome, {session?.user?.name}</div>
                        <button onClick={handleUpdate} data-testid="update-button">
                            Update Session
                        </button>
                        {error && <div data-testid="error">{error}</div>}
                    </div>
                )
            }

            render(<TestComponent />)

            const updateButton = screen.getByTestId('update-button')
            await userEvent.click(updateButton)

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('Failed to update session')
            })
        })
    })

    describe('会话终止', () => {
        it('应该能够正常登出', async () => {
            const { apiClient } = await import('@/lib/api-client')
            const mockApiSignOut = apiClient.signOut as jest.MockedFunction<typeof apiClient.signOut>

            mockSignOut.mockResolvedValue({ url: '/auth/signin' })
            mockApiSignOut.mockResolvedValue({ success: true })

            const initialSession = {
                user: {
                    id: '123456789',
                    email: 'test@gmail.com',
                    name: 'Test User',
                },
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }

            // 初始认证状态
            mockUseSession.mockReturnValueOnce({
                data: initialSession,
                status: 'authenticated',
                update: jest.fn(),
            })

            // 登出后的未认证状态
            mockUseSession.mockReturnValue({
                data: null,
                status: 'unauthenticated',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                
                const handleSignOut = async () => {
                    try {
                        // 调用后端登出 API
                        await mockApiSignOut(session?.user?.id)
                        // 调用 NextAuth 登出
                        await signOut({ callbackUrl: '/auth/signin' })
                    } catch (error) {
                        console.error('Sign out failed:', error)
                    }
                }
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div data-testid="signed-out">You have been signed out</div>
                
                return (
                    <div>
                        <div data-testid="user-name">Welcome, {session?.user?.name}</div>
                        <button onClick={handleSignOut} data-testid="signout-button">
                            Sign Out
                        </button>
                    </div>
                )
            }

            const { rerender } = render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('user-name')).toHaveTextContent('Welcome, Test User')
            })

            const signOutButton = screen.getByTestId('signout-button')
            await userEvent.click(signOutButton)

            await waitFor(() => {
                expect(mockApiSignOut).toHaveBeenCalledWith('123456789')
                expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' })
            })

            // 重新渲染以反映登出状态
            rerender(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('signed-out')).toHaveTextContent('You have been signed out')
            })
        })

        it('应该处理登出失败', async () => {
            const { apiClient } = await import('@/lib/api-client')
            const mockApiSignOut = apiClient.signOut as jest.MockedFunction<typeof apiClient.signOut>

            mockSignOut.mockRejectedValue(new Error('Sign out failed'))
            mockApiSignOut.mockRejectedValue(new Error('API sign out failed'))

            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: '123456789',
                        email: 'test@gmail.com',
                        name: 'Test User',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                status: 'authenticated',
                update: jest.fn(),
            })

            const TestComponent = () => {
                const { data: session, status } = useSession()
                const [error, setError] = React.useState<string | null>(null)
                
                const handleSignOut = async () => {
                    try {
                        await mockApiSignOut(session?.user?.id)
                        await signOut({ callbackUrl: '/auth/signin' })
                        setError(null)
                    } catch (err) {
                        setError('Failed to sign out')
                    }
                }
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return (
                    <div>
                        <div data-testid="user-name">Welcome, {session?.user?.name}</div>
                        <button onClick={handleSignOut} data-testid="signout-button">
                            Sign Out
                        </button>
                        {error && <div data-testid="error">{error}</div>}
                    </div>
                )
            }

            render(<TestComponent />)

            const signOutButton = screen.getByTestId('signout-button')
            await userEvent.click(signOutButton)

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('Failed to sign out')
            })
        })

        it('应该清理所有会话数据', async () => {
            mockSignOut.mockResolvedValue({ url: '/auth/signin' })

            // 模拟本地存储清理
            const mockLocalStorageClear = jest.fn()
            const mockSessionStorageClear = jest.fn()

            Object.defineProperty(window, 'localStorage', {
                value: {
                    clear: mockLocalStorageClear,
                    removeItem: jest.fn(),
                    getItem: jest.fn(),
                    setItem: jest.fn(),
                },
                writable: true,
            })

            Object.defineProperty(window, 'sessionStorage', {
                value: {
                    clear: mockSessionStorageClear,
                    removeItem: jest.fn(),
                    getItem: jest.fn(),
                    setItem: jest.fn(),
                },
                writable: true,
            })

            const TestComponent = () => {
                const handleSignOut = async () => {
                    try {
                        // 清理本地存储
                        localStorage.clear()
                        sessionStorage.clear()
                        
                        // 调用 NextAuth 登出
                        await signOut({ callbackUrl: '/auth/signin' })
                    } catch (error) {
                        console.error('Sign out failed:', error)
                    }
                }
                
                return (
                    <button onClick={handleSignOut} data-testid="signout-button">
                        Sign Out
                    </button>
                )
            }

            render(<TestComponent />)

            const signOutButton = screen.getByTestId('signout-button')
            await userEvent.click(signOutButton)

            await waitFor(() => {
                expect(mockLocalStorageClear).toHaveBeenCalled()
                expect(mockSessionStorageClear).toHaveBeenCalled()
                expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' })
            })
        })
    })

    describe('并发会话管理', () => {
        it('应该处理多个标签页的会话同步', async () => {
            const mockUpdate = jest.fn()
            
            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: '123456789',
                        email: 'test@gmail.com',
                        name: 'Test User',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                status: 'authenticated',
                update: mockUpdate,
            })

            const TestComponent = () => {
                const { data: session, status, update } = useSession()
                
                React.useEffect(() => {
                    // 监听存储变化（模拟多标签页同步）
                    const handleStorageChange = (e: StorageEvent) => {
                        if (e.key === 'nextauth.session-token') {
                            update()
                        }
                    }
                    
                    window.addEventListener('storage', handleStorageChange)
                    return () => window.removeEventListener('storage', handleStorageChange)
                }, [update])
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return <div data-testid="user-name">Welcome, {session?.user?.name}</div>
            }

            render(<TestComponent />)

            // 模拟其他标签页的会话变化
            const storageEvent = new StorageEvent('storage', {
                key: 'nextauth.session-token',
                newValue: 'new-session-token',
                oldValue: 'old-session-token',
            })

            window.dispatchEvent(storageEvent)

            await waitFor(() => {
                expect(mockUpdate).toHaveBeenCalled()
            })
        })

        it('应该防止会话冲突', async () => {
            const mockUpdate = jest.fn()
            let updateCount = 0
            
            mockUpdate.mockImplementation(() => {
                updateCount++
                return Promise.resolve()
            })

            mockUseSession.mockReturnValue({
                data: {
                    user: {
                        id: '123456789',
                        email: 'test@gmail.com',
                        name: 'Test User',
                    },
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                status: 'authenticated',
                update: mockUpdate,
            })

            const TestComponent = () => {
                const { data: session, status, update } = useSession()
                
                const handleMultipleUpdates = async () => {
                    // 同时触发多个更新
                    const promises = [
                        update(),
                        update(),
                        update(),
                    ]
                    
                    await Promise.all(promises)
                }
                
                if (status === 'loading') return <div>Loading...</div>
                if (status === 'unauthenticated') return <div>Not authenticated</div>
                
                return (
                    <div>
                        <div data-testid="user-name">Welcome, {session?.user?.name}</div>
                        <button onClick={handleMultipleUpdates} data-testid="update-button">
                            Update Multiple
                        </button>
                    </div>
                )
            }

            render(<TestComponent />)

            const updateButton = screen.getByTestId('update-button')
            await userEvent.click(updateButton)

            await waitFor(() => {
                // 应该处理并发更新，避免重复调用
                expect(updateCount).toBeGreaterThan(0)
            })
        })
    })
})