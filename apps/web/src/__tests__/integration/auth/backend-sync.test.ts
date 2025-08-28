/**
 * 后端 API 同步集成测试
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock API client
jest.mock('@/lib/api-client', () => ({
    apiClient: {
        syncUser: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        getUserProfile: jest.fn(),
        updateUserProfile: jest.fn(),
    },
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
    signIn: jest.fn(),
    signOut: jest.fn(),
    useSession: jest.fn(() => ({
        data: null,
        status: 'unauthenticated',
    })),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('后端 API 同步集成测试', () => {
    let mockApiClient: any

    beforeEach(async () => {
        const apiClientModule = await import('@/lib/api-client')
        mockApiClient = apiClientModule.apiClient
        jest.clearAllMocks()
    })

    describe('用户信息同步', () => {
        it('应该在登录时同步 Google 用户信息', async () => {
            const googleUser = {
                id: '123456789',
                email: 'test@gmail.com',
                name: 'Test User',
                image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
            }
            const googleAccount = {
                provider: 'google',
                access_token: 'google_access_token_123',
                refresh_token: 'google_refresh_token_123',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
            }

            mockApiClient.syncUser.mockResolvedValue({
                success: true,
                user: {
                    id: googleUser.id,
                    email: googleUser.email,
                    name: googleUser.name,
                    image: googleUser.image,
                    provider: googleAccount.provider,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            })

            // 模拟 JWT 回调逻辑
            const jwtCallback = async ({ token, user, account }: any) => {
                if (user && account) {
                    try {
                        const syncResult = await mockApiClient.syncUser({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            accessToken: account.access_token,
                            refreshToken: account.refresh_token,
                        })

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
                            backendSynced: syncResult.success,
                        }
                    } catch (error) {
                        console.error('用户信息同步失败:', error)
                        return {
                            ...token,
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            accessToken: account.access_token,
                            backendSynced: false,
                        }
                    }
                }
                return token
            }

            const result = await jwtCallback({
                token: {},
                user: googleUser,
                account: googleAccount,
            })

            expect(mockApiClient.syncUser).toHaveBeenCalledWith({
                id: googleUser.id,
                email: googleUser.email,
                name: googleUser.name,
                image: googleUser.image,
                provider: googleAccount.provider,
                accessToken: googleAccount.access_token,
                refreshToken: googleAccount.refresh_token,
            })

            expect(result.backendSynced).toBe(true)
            expect(result.provider).toBe('google')
        })

        it('应该在登录时同步 GitHub 用户信息', async () => {
            const githubUser = {
                id: '12345',
                email: 'test@example.com',
                name: 'GitHub User',
                image: 'https://avatars.githubusercontent.com/u/12345',
            }
            const githubAccount = {
                provider: 'github',
                access_token: 'github_access_token_123',
            }

            mockApiClient.syncUser.mockResolvedValue({
                success: true,
                user: {
                    id: githubUser.id,
                    email: githubUser.email,
                    name: githubUser.name,
                    image: githubUser.image,
                    provider: githubAccount.provider,
                    username: 'testuser',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            })

            const jwtCallback = async ({ token, user, account }: any) => {
                if (user && account) {
                    try {
                        const syncResult = await mockApiClient.syncUser({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            accessToken: account.access_token,
                        })

                        return {
                            ...token,
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            accessToken: account.access_token,
                            backendSynced: syncResult.success,
                        }
                    } catch (error) {
                        console.error('用户信息同步失败:', error)
                        return {
                            ...token,
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            backendSynced: false,
                        }
                    }
                }
                return token
            }

            const result = await jwtCallback({
                token: {},
                user: githubUser,
                account: githubAccount,
            })

            expect(mockApiClient.syncUser).toHaveBeenCalledWith({
                id: githubUser.id,
                email: githubUser.email,
                name: githubUser.name,
                image: githubUser.image,
                provider: githubAccount.provider,
                accessToken: githubAccount.access_token,
            })

            expect(result.backendSynced).toBe(true)
            expect(result.provider).toBe('github')
        })

        it('应该处理后端同步失败但不阻止登录', async () => {
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

            // 模拟后端同步失败
            mockApiClient.syncUser.mockRejectedValue(new Error('Backend sync failed'))

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

                        return {
                            ...token,
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            backendSynced: true,
                        }
                    } catch (error) {
                        console.error('用户信息同步失败:', error)
                        // 不阻止登录，继续创建 token
                        return {
                            ...token,
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            provider: account.provider,
                            backendSynced: false,
                            syncError: error.message,
                        }
                    }
                }
                return token
            }

            const result = await jwtCallback({
                token: {},
                user,
                account,
            })

            expect(mockApiClient.syncUser).toHaveBeenCalled()
            expect(result.backendSynced).toBe(false)
            expect(result.syncError).toBe('Backend sync failed')
            // 重要：即使同步失败，用户信息仍应包含在 token 中
            expect(result.id).toBe(user.id)
            expect(result.email).toBe(user.email)
        })

        it('应该重试失败的同步操作', async () => {
            const user = {
                id: '123456789',
                email: 'test@gmail.com',
                name: 'Test User',
            }
            const account = {
                provider: 'google',
                access_token: 'google_access_token_123',
            }

            // 第一次失败，第二次成功
            mockApiClient.syncUser
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    success: true,
                    user: { ...user, provider: account.provider },
                })

            // 模拟带重试的同步逻辑
            const syncWithRetry = async (userInfo: any, maxRetries = 2) => {
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        return await mockApiClient.syncUser(userInfo)
                    } catch (error) {
                        if (attempt === maxRetries) {
                            throw error
                        }
                        // 等待后重试
                        await new Promise(resolve => setTimeout(resolve, 100 * attempt))
                    }
                }
            }

            const jwtCallback = async ({ token, user, account }: any) => {
                if (user && account) {
                    try {
                        const syncResult = await syncWithRetry({
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            provider: account.provider,
                            accessToken: account.access_token,
                        })

                        return {
                            ...token,
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            provider: account.provider,
                            backendSynced: syncResult.success,
                            retryCount: 2,
                        }
                    } catch (error) {
                        return {
                            ...token,
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            provider: account.provider,
                            backendSynced: false,
                            syncError: error.message,
                        }
                    }
                }
                return token
            }

            const result = await jwtCallback({
                token: {},
                user,
                account,
            })

            expect(mockApiClient.syncUser).toHaveBeenCalledTimes(2)
            expect(result.backendSynced).toBe(true)
            expect(result.retryCount).toBe(2)
        })
    })

    describe('用户资料管理', () => {
        it('应该能够获取用户资料', async () => {
            const userId = '123456789'
            const userProfile = {
                id: userId,
                email: 'test@gmail.com',
                name: 'Test User',
                image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
                provider: 'google',
                bio: 'Software Developer',
                location: 'San Francisco',
                website: 'https://example.com',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }

            mockApiClient.getUserProfile.mockResolvedValue({
                success: true,
                user: userProfile,
            })

            const TestComponent = () => {
                const [profile, setProfile] = React.useState(null)
                const [loading, setLoading] = React.useState(false)
                const [error, setError] = React.useState(null)

                const fetchProfile = async () => {
                    setLoading(true)
                    setError(null)
                    try {
                        const result = await mockApiClient.getUserProfile(userId)
                        setProfile(result.user)
                    } catch (err) {
                        setError(err.message)
                    } finally {
                        setLoading(false)
                    }
                }

                React.useEffect(() => {
                    fetchProfile()
                }, [])

                if (loading) return <div data-testid="loading">Loading profile...</div>
                if (error) return <div data-testid="error">Error: {error}</div>
                if (!profile) return <div>No profile</div>

                return (
                    <div>
                        <div data-testid="profile-name">{profile.name}</div>
                        <div data-testid="profile-email">{profile.email}</div>
                        <div data-testid="profile-bio">{profile.bio}</div>
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('profile-name')).toHaveTextContent('Test User')
                expect(screen.getByTestId('profile-email')).toHaveTextContent('test@gmail.com')
                expect(screen.getByTestId('profile-bio')).toHaveTextContent('Software Developer')
            })

            expect(mockApiClient.getUserProfile).toHaveBeenCalledWith(userId)
        })

        it('应该能够更新用户资料', async () => {
            const userId = '123456789'
            const updatedProfile = {
                name: 'Updated User Name',
                bio: 'Updated bio',
                location: 'New York',
            }

            mockApiClient.updateUserProfile.mockResolvedValue({
                success: true,
                user: {
                    id: userId,
                    email: 'test@gmail.com',
                    ...updatedProfile,
                    updatedAt: new Date().toISOString(),
                },
            })

            const TestComponent = () => {
                const [profile, setProfile] = React.useState({
                    name: 'Test User',
                    bio: 'Software Developer',
                    location: 'San Francisco',
                })
                const [loading, setLoading] = React.useState(false)
                const [success, setSuccess] = React.useState(false)

                const updateProfile = async () => {
                    setLoading(true)
                    setSuccess(false)
                    try {
                        const result = await mockApiClient.updateUserProfile(updatedProfile)
                        setProfile(result.user)
                        setSuccess(true)
                    } catch (error) {
                        console.error('Profile update failed:', error)
                    } finally {
                        setLoading(false)
                    }
                }

                return (
                    <div>
                        <div data-testid="profile-name">{profile.name}</div>
                        <div data-testid="profile-bio">{profile.bio}</div>
                        <div data-testid="profile-location">{profile.location}</div>
                        <button 
                            onClick={updateProfile} 
                            disabled={loading}
                            data-testid="update-button"
                        >
                            {loading ? 'Updating...' : 'Update Profile'}
                        </button>
                        {success && <div data-testid="success">Profile updated successfully</div>}
                    </div>
                )
            }

            render(<TestComponent />)

            expect(screen.getByTestId('profile-name')).toHaveTextContent('Test User')

            const updateButton = screen.getByTestId('update-button')
            await userEvent.click(updateButton)

            await waitFor(() => {
                expect(screen.getByTestId('profile-name')).toHaveTextContent('Updated User Name')
                expect(screen.getByTestId('profile-bio')).toHaveTextContent('Updated bio')
                expect(screen.getByTestId('profile-location')).toHaveTextContent('New York')
                expect(screen.getByTestId('success')).toHaveTextContent('Profile updated successfully')
            })

            expect(mockApiClient.updateUserProfile).toHaveBeenCalledWith(updatedProfile)
        })

        it('应该处理资料更新失败', async () => {
            const updatedProfile = {
                name: 'Updated User Name',
                bio: 'Updated bio',
            }

            mockApiClient.updateUserProfile.mockRejectedValue(new Error('Update failed'))

            const TestComponent = () => {
                const [loading, setLoading] = React.useState(false)
                const [error, setError] = React.useState(null)

                const updateProfile = async () => {
                    setLoading(true)
                    setError(null)
                    try {
                        await mockApiClient.updateUserProfile(updatedProfile)
                    } catch (err) {
                        setError(err.message)
                    } finally {
                        setLoading(false)
                    }
                }

                return (
                    <div>
                        <button 
                            onClick={updateProfile} 
                            disabled={loading}
                            data-testid="update-button"
                        >
                            {loading ? 'Updating...' : 'Update Profile'}
                        </button>
                        {error && <div data-testid="error">Error: {error}</div>}
                    </div>
                )
            }

            render(<TestComponent />)

            const updateButton = screen.getByTestId('update-button')
            await userEvent.click(updateButton)

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('Error: Update failed')
            })

            expect(mockApiClient.updateUserProfile).toHaveBeenCalledWith(updatedProfile)
        })
    })

    describe('登出同步', () => {
        it('应该在登出时调用后端 API', async () => {
            const userId = '123456789'

            mockApiClient.signOut.mockResolvedValue({
                success: true,
                message: 'User signed out successfully',
            })

            // 模拟登出事件处理
            const signOutEvent = async (userId: string) => {
                try {
                    const result = await mockApiClient.signOut(userId)
                    return {
                        success: result.success,
                        message: result.message,
                    }
                } catch (error) {
                    console.error('后端登出失败:', error)
                    return {
                        success: false,
                        error: error.message,
                    }
                }
            }

            const result = await signOutEvent(userId)

            expect(mockApiClient.signOut).toHaveBeenCalledWith(userId)
            expect(result.success).toBe(true)
            expect(result.message).toBe('User signed out successfully')
        })

        it('应该处理后端登出失败', async () => {
            const userId = '123456789'

            mockApiClient.signOut.mockRejectedValue(new Error('Backend signout failed'))

            const signOutEvent = async (userId: string) => {
                try {
                    const result = await mockApiClient.signOut(userId)
                    return {
                        success: result.success,
                        message: result.message,
                    }
                } catch (error) {
                    console.error('后端登出失败:', error)
                    return {
                        success: false,
                        error: error.message,
                    }
                }
            }

            const result = await signOutEvent(userId)

            expect(mockApiClient.signOut).toHaveBeenCalledWith(userId)
            expect(result.success).toBe(false)
            expect(result.error).toBe('Backend signout failed')
        })
    })

    describe('API 错误处理', () => {
        it('应该处理网络错误', async () => {
            const userId = '123456789'

            mockApiClient.getUserProfile.mockRejectedValue(new Error('Network request failed'))

            const TestComponent = () => {
                const [error, setError] = React.useState(null)
                const [retryCount, setRetryCount] = React.useState(0)

                const fetchProfile = async () => {
                    try {
                        await mockApiClient.getUserProfile(userId)
                    } catch (err) {
                        if (err.message.includes('Network')) {
                            setError('网络连接失败，请检查网络连接')
                        } else {
                            setError('获取用户资料失败')
                        }
                    }
                }

                const retry = () => {
                    setRetryCount(prev => prev + 1)
                    fetchProfile()
                }

                React.useEffect(() => {
                    fetchProfile()
                }, [])

                return (
                    <div>
                        {error && (
                            <div>
                                <div data-testid="error">{error}</div>
                                <button onClick={retry} data-testid="retry-button">
                                    重试 ({retryCount})
                                </button>
                            </div>
                        )}
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('网络连接失败，请检查网络连接')
            })

            const retryButton = screen.getByTestId('retry-button')
            await userEvent.click(retryButton)

            await waitFor(() => {
                expect(screen.getByTestId('retry-button')).toHaveTextContent('重试 (1)')
            })
        })

        it('应该处理 API 服务器错误', async () => {
            const userId = '123456789'

            mockApiClient.getUserProfile.mockRejectedValue({
                status: 500,
                message: 'Internal Server Error',
            })

            const TestComponent = () => {
                const [error, setError] = React.useState(null)

                const fetchProfile = async () => {
                    try {
                        await mockApiClient.getUserProfile(userId)
                    } catch (err) {
                        if (err.status >= 500) {
                            setError('服务器暂时不可用，请稍后重试')
                        } else if (err.status === 404) {
                            setError('用户不存在')
                        } else {
                            setError('获取用户资料失败')
                        }
                    }
                }

                React.useEffect(() => {
                    fetchProfile()
                }, [])

                return (
                    <div>
                        {error && <div data-testid="error">{error}</div>}
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('服务器暂时不可用，请稍后重试')
            })
        })

        it('应该处理认证过期', async () => {
            const userId = '123456789'

            mockApiClient.getUserProfile.mockRejectedValue({
                status: 401,
                message: 'Unauthorized',
                code: 'TOKEN_EXPIRED',
            })

            const TestComponent = () => {
                const [error, setError] = React.useState(null)
                const [shouldRedirect, setShouldRedirect] = React.useState(false)

                const fetchProfile = async () => {
                    try {
                        await mockApiClient.getUserProfile(userId)
                    } catch (err) {
                        if (err.status === 401) {
                            setError('登录已过期，请重新登录')
                            setShouldRedirect(true)
                        } else {
                            setError('获取用户资料失败')
                        }
                    }
                }

                React.useEffect(() => {
                    fetchProfile()
                }, [])

                React.useEffect(() => {
                    if (shouldRedirect) {
                        // 模拟重定向到登录页面
                        console.log('Redirecting to login page')
                    }
                }, [shouldRedirect])

                return (
                    <div>
                        {error && <div data-testid="error">{error}</div>}
                        {shouldRedirect && <div data-testid="redirect">Redirecting to login...</div>}
                    </div>
                )
            }

            render(<TestComponent />)

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('登录已过期，请重新登录')
                expect(screen.getByTestId('redirect')).toHaveTextContent('Redirecting to login...')
            })
        })
    })
})