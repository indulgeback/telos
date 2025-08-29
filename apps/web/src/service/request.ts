// API 基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8890'

// 请求配置接口
export interface RequestConfig extends RequestInit {
  baseURL?: string
  timeout?: number
}

// 响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 错误类
export class ApiError extends Error {
  public status: number
  public data?: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// 通用请求方法
export class RequestService {
  private baseURL: string
  private defaultTimeout: number

  constructor(baseURL: string = API_BASE_URL, timeout: number = 10000) {
    this.baseURL = baseURL
    this.defaultTimeout = timeout
  }

  // 构建请求头
  private buildHeaders(
    customHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }

    console.log('RequestService: 构建的请求头:', headers)

    return headers
  }

  // 处理响应
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch {
        // 如果无法解析JSON，使用默认错误信息
      }

      throw new ApiError(
        errorData.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      )
    }

    // 检查响应内容类型
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }

    return response.text() as T
  }

  // 通用请求方法
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      baseURL = this.baseURL,
      timeout = this.defaultTimeout,
      headers: customHeaders,
      ...restConfig
    } = config

    const url = `${baseURL}${endpoint}`
    const headers = this.buildHeaders(customHeaders as Record<string, string>)

    console.log('RequestService: 发送请求到:', url)
    console.log('RequestService: 请求方法:', restConfig.method || 'GET')

    // 创建 AbortController 用于超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        headers: headers as HeadersInit,
        signal: controller.signal,
        credentials: 'include', // 确保 cookie 自动发送
        ...restConfig,
      })

      clearTimeout(timeoutId)
      console.log('RequestService: 响应状态:', response.status)
      return await this.handleResponse<T>(response)
    } catch (error: unknown) {
      clearTimeout(timeoutId)

      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('请求超时', 408)
      }

      console.error(`API request failed: ${endpoint}`, error)
      throw new ApiError('网络请求失败', 0, error)
    }
  }

  // GET 请求
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...config })
  }

  // POST 请求
  async post<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    })
  }

  // PUT 请求
  async put<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    })
  }

  // DELETE 请求
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...config })
  }

  // PATCH 请求
  async patch<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    })
  }
}

// 导出默认实例
export const requestService = new RequestService()
