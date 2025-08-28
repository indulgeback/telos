import '@testing-library/jest-dom'

// 确保 jest 全局可用
global.jest = jest

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }) => children,
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(() => key => key),
  useLocale: jest.fn(() => 'en'),
}))

// Mock environment variables
process.env.AUTH_SECRET = 'test-secret-key-for-testing-purposes-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GITHUB_CLIENT_ID = 'test-github-client-id'
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.NODE_ENV = 'test'
