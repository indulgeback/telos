// JWT 服务类 - 简化版，直接使用 NextAuth cookie 中的 token
export class JWTService {
  // 从 NextAuth cookie 获取 JWT token
  static getTokenFromCookie(): string | null {
    try {
      if (typeof window === 'undefined') {
        return null
      }

      // NextAuth 在不同环境下使用不同的 cookie 名称
      const cookieName =
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token'

      const cookies = document.cookie.split(';')
      const sessionCookie = cookies.find(cookie =>
        cookie.trim().startsWith(`${cookieName}=`)
      )

      if (sessionCookie) {
        const token = sessionCookie.split('=')[1]
        return decodeURIComponent(token)
      }

      return null
    } catch (error) {
      console.error('从 cookie 获取 token 失败:', error)
      return null
    }
  }

  // 检查是否有有效的认证 token
  static hasValidToken(): boolean {
    const token = this.getTokenFromCookie()
    return !!token
  }
}
