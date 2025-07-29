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

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
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
