/**
 * 认证错误页面单元测试
 */

import { render, screen } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import AuthErrorPage from '@/app/[locale]/(default-layout)/auth/error/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(namespace => {
    const translations: Record<string, Record<string, string>> = {
      'Auth.error': {
        title: 'Authentication Error',
        subtitle: 'An error occurred during the login process',
        oauthSignin: 'Third-party login service is temporarily unavailable',
        oauthCallback: 'Login callback processing failed',
        oauthCreateAccount: 'Account creation failed',
        accessDenied: 'Access denied',
        verification: 'Verification failed',
        oauthAccountNotLinked:
          'This email is already associated with another account',
        unknownError: 'An unknown error occurred',
        contactSupport:
          'If the problem persists, please contact technical support',
      },
      'Auth.signIn': {
        tryAgain: 'Try Again',
        backToHome: 'Back to Home',
      },
    }
    return (key: string) => translations[namespace]?.[key] || key
  }),
}))

// Mock CustomLink component
jest.mock('@/components/molecules')

describe('AuthErrorPage', () => {
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该显示默认错误信息', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())

    render(<AuthErrorPage />)

    expect(screen.getByText('Authentication Error')).toBeInTheDocument()
    expect(
      screen.getByText('An error occurred during the login process')
    ).toBeInTheDocument()
  })

  it('应该显示 OAuth 登录错误', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('error=OAuthSignin')
    )

    render(<AuthErrorPage />)

    expect(
      screen.getByText('Third-party login service is temporarily unavailable')
    ).toBeInTheDocument()
  })

  it('应该显示 OAuth 回调错误', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('error=OAuthCallback')
    )

    render(<AuthErrorPage />)

    expect(
      screen.getByText('Login callback processing failed')
    ).toBeInTheDocument()
  })

  it('应该显示账户创建错误', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('error=OAuthCreateAccount')
    )

    render(<AuthErrorPage />)

    expect(screen.getByText('Account creation failed')).toBeInTheDocument()
  })

  it('应该显示访问拒绝错误', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('error=AccessDenied')
    )

    render(<AuthErrorPage />)

    expect(screen.getByText('Access denied')).toBeInTheDocument()
  })

  it('应该显示验证失败错误', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('error=Verification')
    )

    render(<AuthErrorPage />)

    expect(screen.getByText('Verification failed')).toBeInTheDocument()
  })

  it('应该显示账户关联错误', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('error=OAuthAccountNotLinked')
    )

    render(<AuthErrorPage />)

    expect(
      screen.getByText('This email is already associated with another account')
    ).toBeInTheDocument()
  })

  it('应该显示未知错误', () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams('error=UnknownError')
    )

    render(<AuthErrorPage />)

    expect(screen.getByText('An unknown error occurred')).toBeInTheDocument()
  })

  it('应该包含重试按钮', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())

    render(<AuthErrorPage />)

    const tryAgainButton = screen.getByText('Try Again')
    expect(tryAgainButton).toBeInTheDocument()
    expect(tryAgainButton.closest('a')).toHaveAttribute('href', '/auth/signin')
  })

  it('应该包含返回首页按钮', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())

    render(<AuthErrorPage />)

    const backHomeButton = screen.getByText('Back to Home')
    expect(backHomeButton).toBeInTheDocument()
    expect(backHomeButton.closest('a')).toHaveAttribute('href', '/')
  })

  it('应该显示技术支持联系信息', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())

    render(<AuthErrorPage />)

    expect(
      screen.getByText(
        'If the problem persists, please contact technical support'
      )
    ).toBeInTheDocument()
  })

  it('应该包含错误图标', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())

    render(<AuthErrorPage />)

    // 检查是否有 AlertCircle 图标
    const alertIcons = document.querySelectorAll('[data-lucide="alert-circle"]')
    expect(alertIcons.length).toBeGreaterThan(0)
  })

  describe('错误消息映射', () => {
    const errorTestCases = [
      { error: 'Configuration', expectedMessage: 'An unknown error occurred' },
      { error: 'AccessDenied', expectedMessage: 'Access denied' },
      { error: 'Verification', expectedMessage: 'Verification failed' },
      {
        error: 'OAuthSignin',
        expectedMessage: 'Third-party login service is temporarily unavailable',
      },
      {
        error: 'OAuthCallback',
        expectedMessage: 'Login callback processing failed',
      },
      {
        error: 'OAuthCreateAccount',
        expectedMessage: 'Account creation failed',
      },
      {
        error: 'EmailCreateAccount',
        expectedMessage: 'Account creation failed',
      },
      {
        error: 'Callback',
        expectedMessage: 'Login callback processing failed',
      },
      {
        error: 'OAuthAccountNotLinked',
        expectedMessage:
          'This email is already associated with another account',
      },
      { error: 'EmailSignin', expectedMessage: 'An unknown error occurred' },
      {
        error: 'CredentialsSignin',
        expectedMessage: 'An unknown error occurred',
      },
      { error: 'SessionRequired', expectedMessage: 'Access denied' },
    ]

    errorTestCases.forEach(({ error, expectedMessage }) => {
      it(`应该正确映射 ${error} 错误`, () => {
        mockUseSearchParams.mockReturnValue(
          new URLSearchParams(`error=${error}`)
        )

        render(<AuthErrorPage />)

        expect(screen.getByText(expectedMessage)).toBeInTheDocument()
      })
    })
  })
})
