import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

// JWT 工具函数
export class JWTUtils {
  // 从请求中获取 JWT token
  static async getTokenFromRequest(req: NextRequest): Promise<any> {
    try {
      const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
      })
      return token
    } catch (error) {
      console.error('JWT token 解析失败:', error)
      return null
    }
  }

  // 验证 token 是否有效
  static isTokenValid(token: any): boolean {
    if (!token) return false

    // 检查 token 是否过期
    const now = Math.floor(Date.now() / 1000)
    if (token.exp && token.exp < now) {
      return false
    }

    // 检查必要字段
    return !!(token.id && token.email)
  }

  // 从 token 中提取用户信息
  static extractUserInfo(token: any) {
    if (!token) return null

    return {
      id: token.id,
      email: token.email,
      name: token.name,
      image: token.image,
      provider: token.provider,
    }
  }
}

// 用于 API 路由的中间件
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, user: any) => Promise<Response>
): Promise<Response> {
  const token = await JWTUtils.getTokenFromRequest(req)

  if (!JWTUtils.isTokenValid(token)) {
    return Response.json({ error: '未授权或 token 已过期' }, { status: 401 })
  }

  const user = JWTUtils.extractUserInfo(token)
  return handler(req, user)
}
