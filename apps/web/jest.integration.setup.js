import '@testing-library/jest-dom'

// 确保 jest 全局可用
global.jest = jest

// Mock Next.js router for integration tests
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

// Mock next-intl for integration tests
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(() => key => {
    // 返回更真实的翻译，用于集成测试
    const translations = {
      'Auth.signIn.signInWithGoogle': 'Sign in with Google',
      'Auth.signIn.signInWithGitHub': 'Sign in with GitHub',
      'Auth.signIn.loginFailed': 'Login failed',
      'Auth.signIn.signingIn': 'Signing in...',
      'Auth.error.accessDenied': 'Access denied',
      'Auth.error.configurationError': 'Configuration error',
      'Auth.error.default': 'An error occurred during authentication',
    }
    return translations[key] || key
  }),
  useLocale: jest.fn(() => 'en'),
}))

// Mock environment variables for integration tests
process.env.AUTH_SECRET =
  'integration-test-secret-key-for-testing-purposes-only-32-chars'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GITHUB_CLIENT_ID = 'integration-test-github-client-id'
process.env.GITHUB_CLIENT_SECRET = 'integration-test-github-client-secret'
process.env.GOOGLE_CLIENT_ID = 'integration-test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'integration-test-google-client-secret'
process.env.NODE_ENV = 'test'

// 设置全局测试超时
jest.setTimeout(30000)

// 模拟 fetch API
global.fetch = jest.fn()

// 模拟 window.location
delete window.location
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

// 清理函数
afterEach(() => {
  jest.clearAllMocks()
  if (global.fetch) {
    global.fetch.mockClear()
  }
})
