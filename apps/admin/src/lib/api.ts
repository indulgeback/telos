// API 客户端 - 封装 fetch, 自动带 token, 统一错误处理
const TOKEN_KEY = 'telos-admin-token'

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

interface ApiOptions extends RequestInit {
  // 是否跳过自动重定向 (登录接口用)
  skipAuthRedirect?: boolean
}

export async function api<T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(path, { ...options, headers })

  // 401 → 清 token 跳登录
  if (res.status === 401 && !options.skipAuthRedirect) {
    clearToken()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    throw new Error('未登录或会话已过期')
  }

  const data = await res.json()
  if (!res.ok || data.code !== 0) {
    throw new Error(data.message || `请求失败 (${res.status})`)
  }
  return data.data as T
}

// ========== 业务 API ==========
export const authApi = {
  login: (username: string, password: string) =>
    api<{ token: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuthRedirect: true,
    }),
  me: () => api<{ username: string; role: string }>('/api/auth/me'),
}

export const dashboardApi = {
  get: () =>
    api<{
      counts: Record<string, number>
      runsTrend: { date: string; count: number }[]
    }>('/api/admin/dashboard'),
}

export const agentsApi = {
  list: (params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.pageSize) q.set('pageSize', String(params.pageSize))
    if (params.search) q.set('search', params.search)
    return api<{
      items: any[]
      total: number
      page: number
      totalPages: number
    }>(`/api/admin/agents?${q}`)
  },
  get: (id: string) => api<any>(`/api/admin/agents/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api<any>(`/api/admin/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<void>(`/api/admin/agents/${id}`, { method: 'DELETE' }),
}

export const skillsApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; system?: boolean } = {}) => {
    const q = new URLSearchParams()
    if (params.page) q.set('page', String(params.page))
    if (params.pageSize) q.set('pageSize', String(params.pageSize))
    if (params.search) q.set('search', params.search)
    if (params.system) q.set('system', 'true')
    return api<{ items: any[]; total: number; totalPages: number }>(`/api/admin/skills?${q}`)
  },
  update: (id: string, data: Record<string, unknown>) =>
    api<any>(`/api/admin/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<void>(`/api/admin/skills/${id}`, { method: 'DELETE' }),
}

export const modelsApi = {
  list: () => api<{ items: any[] }>('/api/admin/models'),
  update: (id: string, data: Record<string, unknown>) =>
    api<any>(`/api/admin/models/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    api<void>(`/api/admin/models/${id}`, { method: 'DELETE' }),
}
