import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import type { NextAuthConfig } from 'next-auth'
import { AuthService } from '@/service/auth'

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

  interface JWT {
    id?: string
    accessToken?: string
    provider?: string
  }
}

// NextAuth 配置
const authConfig: NextAuthConfig = {
  // 密钥配置（NextAuth v5 中在顶层）
  secret: process.env.AUTH_SECRET!,

  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    // 可以添加更多认证提供者
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 小时
    updateAge: 24 * 60 * 60, // 24 小时更新一次
  },
  // NextAuth v5 cookies 配置
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.callback-url'
          : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Host-next-auth.csrf-token'
          : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
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
      const sessionWithUser = session as any
      if (token && sessionWithUser?.user) {
        sessionWithUser.user.id = token.id as string
        sessionWithUser.user.email = token.email
        sessionWithUser.user.name = token.name
        sessionWithUser.user.image = token.image
      }

      return sessionWithUser
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
    async redirect({ url, baseUrl }) {
      // 自定义重定向逻辑，减少不必要的页面刷新
      // 如果 URL 是相对路径，添加 baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // 如果 URL 是同一域名，直接返回
      else if (new URL(url).origin === baseUrl) {
        return url
      }
      // 默认返回 baseUrl
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  // 事件回调
  events: {
    async signIn({ user, account }) {
      try {
        console.log('用户登录:', {
          user: user.email,
          provider: account?.provider,
        })

        // 调用后端登录接口
        await AuthService.signIn({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account?.provider || 'unknown',
          accessToken: account?.access_token,
        })

        console.log('后端登录接口调用成功')
      } catch (error) {
        console.error('后端登录接口调用失败:', error)
        // 注意：这里不要抛出错误，否则会阻止用户登录
      }
    },
  },
  // 启用调试模式（开发环境）
  debug: process.env.NODE_ENV === 'development',
  // 信任主机设置
  trustHost: true,
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)
