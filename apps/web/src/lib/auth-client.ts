import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from './auth'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:8800',
  plugins: [inferAdditionalFields<typeof auth>()],
})
