import { requestService, ApiResponse } from './request'

// 认证相关类型定义
export interface UserData {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  provider: string
}

export interface SignInData extends UserData {
  accessToken?: string
}

export interface SignOutData {
  userId: string
}

// 后端用户模型
export interface BackendUser {
  id: string
  email: string
  name?: string
  avatar?: string
  provider: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 后端认证响应
export interface AuthResponse {
  user: BackendUser
  token?: string
  refreshToken?: string
}

// 认证服务类
export class AuthService {
  // 用户登录
  static async signIn(
    userData: SignInData
  ): Promise<ApiResponse<AuthResponse>> {
    return requestService.post<ApiResponse<AuthResponse>>(
      '/api/auth/signin',
      userData
    )
  }

  // 用户登出
  static async signOut(userId: string): Promise<ApiResponse> {
    return requestService.post<ApiResponse>('/api/auth/signout', { userId })
  }

  // 同步用户信息
  static async syncUser(
    userData: UserData
  ): Promise<ApiResponse<AuthResponse>> {
    return requestService.post<ApiResponse<AuthResponse>>(
      '/api/users/sync',
      userData
    )
  }

  // 获取当前用户信息
  static async getCurrentUser(): Promise<ApiResponse<BackendUser>> {
    return requestService.get<ApiResponse<BackendUser>>('/api/users/profile')
  }

  // 更新用户信息
  static async updateUser(
    userId: string,
    userData: Partial<BackendUser>
  ): Promise<ApiResponse<BackendUser>> {
    return requestService.put<ApiResponse<BackendUser>>(
      `/api/users/${userId}`,
      userData
    )
  }

  // 刷新token
  static async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    return requestService.post<
      ApiResponse<{ token: string; refreshToken: string }>
    >('/api/auth/refresh', { refreshToken })
  }

  // 验证token
  static async validateToken(
    token: string
  ): Promise<ApiResponse<{ valid: boolean; user?: BackendUser }>> {
    return requestService.post<
      ApiResponse<{ valid: boolean; user?: BackendUser }>
    >('/api/auth/validate', { token })
  }
}
