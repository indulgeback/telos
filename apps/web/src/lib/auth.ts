import NextAuth, { NextAuthOptions, Session } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

// 扩展 NextAuth 类型
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    accessToken?: string
    provider?: string
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

// NextAuth 配置（仅 GitHub OAuth，不使用数据库）
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log('用户登录:', {
        user: user.email,
        provider: account?.provider,
      })
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)
