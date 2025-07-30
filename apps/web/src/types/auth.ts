// NextAuth 相关类型定义
import { DefaultSession } from 'next-auth'

// 扩展 NextAuth 的 Session 类型
export interface ExtendedSession extends DefaultSession {
  user: {
    id: string
    provider: string
  } & DefaultSession['user']
}

// NextAuth 配置类型
export interface AuthConfig {
  providers: any[]
  callbacks: {
    jwt: (params: any) => any
    session: (params: any) => any
  }
  pages: {
    signIn: string
    error: string
  }
}
