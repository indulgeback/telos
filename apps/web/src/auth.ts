import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import { AuthService } from '@/service/auth'
import { SECURITY_CONFIG, validateSecurityConfig } from '@/lib/security'

// 验证安全配置
const securityValidation = validateSecurityConfig()
if (!securityValidation.isValid) {
  console.warn('安全配置验证警告:', securityValidation.errors)
  // 只在真正的生产运行时（非构建时）抛出错误
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV === 'production'
  ) {
    throw new Error('生产环境安全配置不完整，请检查环境变量')
  }
}

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
    // OAuth 提供者已移除，可以在此添加其他认证方式
  ],
  session: {
    strategy: 'jwt',
    maxAge: SECURITY_CONFIG.SESSION.MAX_AGE,
    updateAge: SECURITY_CONFIG.SESSION.UPDATE_AGE,
  },
  // JWT 配置
  jwt: {
    maxAge: SECURITY_CONFIG.SESSION.MAX_AGE,
  },
  // Cookie 安全配置
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: SECURITY_CONFIG.COOKIES.HTTP_ONLY,
        sameSite: SECURITY_CONFIG.COOKIES.SAME_SITE,
        path: '/',
        secure: SECURITY_CONFIG.COOKIES.SECURE,
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_DOMAIN
            : undefined,
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: SECURITY_CONFIG.COOKIES.HTTP_ONLY,
        sameSite: SECURITY_CONFIG.COOKIES.SAME_SITE,
        path: '/',
        secure: SECURITY_CONFIG.COOKIES.SECURE,
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXT_PUBLIC_DOMAIN
            : undefined,
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: SECURITY_CONFIG.COOKIES.HTTP_ONLY,
        sameSite: SECURITY_CONFIG.COOKIES.SAME_SITE,
        path: '/',
        secure: SECURITY_CONFIG.COOKIES.SECURE,
      },
    },
  },
  // 使用状态参数进行 CSRF 保护
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登录时保存用户信息
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image

        // 首次登录时同步用户信息到后端
        try {
          await AuthService.syncUser({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account?.provider || 'local',
          })
          console.log(
            `用户信息同步成功 - Provider: ${account?.provider || 'local'}, User: ${user.email}`
          )
        } catch (error) {
          console.error(
            `用户信息同步失败 - Provider: ${account?.provider || 'local'}, User: ${user.email}`,
            error
          )
          // 不抛出错误，避免影响登录流程
        }
      }

      // 保存账户信息
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
    // authorized 回调已移至 middleware 中处理
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

        console.log(
          `后端登录接口调用成功 - Provider: ${account?.provider}, User: ${user.email}`
        )
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
