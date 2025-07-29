import type {
  SignInData,
  SignOutData,
  UserData,
  ApiResponse,
  AuthResponse,
} from '@/types/auth'
import { JWTService } from './jwt-service'

// API 客户端配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// API 客户端类
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    // 获取 NextAuth JWT token
    const token = this.getAuthToken()

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // 获取认证 token - 直接从 NextAuth cookie 获取
  private getAuthToken(): string | null {
    return JWTService.getTokenFromCookie()
  }

  // 用户登录接口
  async signIn(userData: SignInData): Promise<ApiResponse<AuthResponse>> {
    return this.request<ApiResponse<AuthResponse>>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  // 用户登出接口
  async signOut(userId: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('/api/auth/signout', {
      method: 'POST',
      body: JSON.stringify({ userId } as SignOutData),
    })
  }

  // 同步用户信息接口
  async syncUser(userData: UserData): Promise<ApiResponse<AuthResponse>> {
    return this.request<ApiResponse<AuthResponse>>('/api/users/sync', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }
}

// 导出单例实例
export const apiClient = new ApiClient()
