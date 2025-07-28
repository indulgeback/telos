import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import type { NextAuthConfig } from 'next-auth'

// 扩展 NextAuth 类型
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
  }
}

// NextAuth 配置
const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    // 可以添加更多认证提供者
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
    updateAge: 24 * 60 * 60, // 24 小时更新一次
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登录时保存用户信息
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }

      // 保存账户信息（如 GitHub token）
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }

      return token
    },
    async session({ session, token }) {
      // 将 token 信息传递给客户端 session
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
      }

      return session
    },
    async authorized({ auth, request: { nextUrl } }) {
      // 这个回调用于中间件中的认证检查
      // 返回 true 表示允许访问，false 表示需要认证
      const isLoggedIn = !!auth?.user
      const isOnProtectedPage = [
        '/dashboard',
        '/profile',
        '/workflows',
        '/settings',
      ].some(path => nextUrl.pathname.includes(path))

      if (isOnProtectedPage) {
        return isLoggedIn
      }

      return true
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  // 事件回调
  events: {
    async signIn({ user, account, profile }) {
      console.log('用户登录:', {
        user: user.email,
        provider: account?.provider,
      })
    },
    async signOut({ session, token }) {
      console.log('用户登出:', { user: session?.user?.email })
    },
  },
  // 启用调试模式（开发环境）
  debug: process.env.NODE_ENV === 'development',
  // 信任主机设置
  trustHost: true,
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)
