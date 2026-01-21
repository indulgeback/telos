import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db'

function getSecret() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BETTER_AUTH_SECRET must be set in production')
    }
    console.warn(
      '⚠️  Using default BETTER_AUTH_SECRET for development. Set BETTER_AUTH_SECRET in .env.local'
    )
    return 'dev-secret-only-change-in-production'
  }
  return secret
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8800',
  basePath: '/api/auth',
  secret: getSecret(),
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7天
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    cookiePrefix: 'telos',
    skipTrailingSlashes: true,
  },
})
