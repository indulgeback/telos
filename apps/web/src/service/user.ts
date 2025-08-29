import { requestService, ApiResponse } from './request'
import { BackendUser } from './auth'

// 用户相关类型定义
export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar?: string
  provider: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpdateUserProfileRequest {
  name?: string
  avatar?: string
}

export interface UserListResponse {
  users: BackendUser[]
  total: number
  page: number
  pageSize: number
}

export interface UserListParams {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

// 用户服务类
export class UserService {
  // 获取用户列表
  static async getUsers(
    params: UserListParams = {}
  ): Promise<ApiResponse<UserListResponse>> {
    const searchParams = new URLSearchParams()

    if (params.page) searchParams.append('page', params.page.toString())
    if (params.pageSize)
      searchParams.append('pageSize', params.pageSize.toString())
    if (params.search) searchParams.append('search', params.search)
    if (params.isActive !== undefined)
      searchParams.append('isActive', params.isActive.toString())

    const queryString = searchParams.toString()
    const endpoint = `/api/users${queryString ? `?${queryString}` : ''}`

    return requestService.get<ApiResponse<UserListResponse>>(endpoint)
  }

  // 根据ID获取用户
  static async getUserById(userId: string): Promise<ApiResponse<BackendUser>> {
    return requestService.get<ApiResponse<BackendUser>>(`/api/users/${userId}`)
  }

  // 更新用户信息
  static async updateUser(
    userId: string,
    userData: UpdateUserProfileRequest
  ): Promise<ApiResponse<BackendUser>> {
    return requestService.put<ApiResponse<BackendUser>>(
      `/api/users/${userId}`,
      userData
    )
  }

  // 删除用户
  static async deleteUser(userId: string): Promise<ApiResponse> {
    return requestService.delete<ApiResponse>(`/api/users/${userId}`)
  }

  // 激活/停用用户
  static async toggleUserStatus(
    userId: string,
    isActive: boolean
  ): Promise<ApiResponse<BackendUser>> {
    return requestService.patch<ApiResponse<BackendUser>>(
      `/api/users/${userId}/status`,
      { isActive }
    )
  }

  // 重置用户密码
  static async resetUserPassword(
    userId: string
  ): Promise<ApiResponse<{ temporaryPassword: string }>> {
    return requestService.post<ApiResponse<{ temporaryPassword: string }>>(
      `/api/users/${userId}/reset-password`
    )
  }

  // 获取用户统计信息
  static async getUserStats(): Promise<
    ApiResponse<{
      totalUsers: number
      activeUsers: number
      inactiveUsers: number
      newUsersThisMonth: number
    }>
  > {
    return requestService.get<
      ApiResponse<{
        totalUsers: number
        activeUsers: number
        inactiveUsers: number
        newUsersThisMonth: number
      }>
    >('/api/users/stats')
  }
}
