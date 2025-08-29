import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { auth } from './auth'

// 创建国际化中间件
const intlMiddleware = createIntlMiddleware(routing)

// 定义需要认证保护的路径（不包含语言前缀）
const protectedPaths = ['/dashboard', '/profile', '/workflows', '/settings']

// 定义认证相关路径（不需要保护）
const authPaths = [
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/signout',
]

// 检查路径是否需要认证保护
function isProtectedPath(pathname: string): boolean {
  // 移除语言前缀来检查路径
  const pathWithoutLocale =
    pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, '') || '/'
  return protectedPaths.some(path => pathWithoutLocale.startsWith(path))
}

// 检查是否为认证相关路径
function isAuthPath(pathname: string): boolean {
  const pathWithoutLocale =
    pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, '') || '/'
  return authPaths.some(path => pathWithoutLocale.startsWith(path))
}

// 从路径中提取语言代码
function getLocaleFromPathname(pathname: string): string | null {
  const potentialLocale = pathname.split('/')[1]
  if (routing.locales.includes(potentialLocale)) {
    return potentialLocale
  }
  return null
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. HTTPS 强制重定向（生产环境）
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 301)
  }

  // 2. 首先让 next-intl 处理国际化路由
  // 这一步会处理语言前缀的重定向和路由匹配
  const intlResponse = intlMiddleware(request)

  // 如果 intl 中间件返回重定向，我们需要先处理它
  if (intlResponse && intlResponse.status !== 200) {
    return intlResponse
  }

  // 2. 获取处理后的路径（可能已经被 intl 中间件修改）
  const processedPathname = intlResponse?.headers.get('x-pathname') || pathname

  // 3. 现在处理认证逻辑
  try {
    const session = await auth()
    const currentLocale =
      getLocaleFromPathname(pathname) || routing.defaultLocale

    // 检查是否为受保护的路径
    if (isProtectedPath(pathname)) {
      if (!session) {
        // 构建带语言前缀的登录页面 URL
        const signInPath =
          currentLocale === routing.defaultLocale
            ? '/auth/signin'
            : `/${currentLocale}/auth/signin`

        const signInUrl = new URL(signInPath, request.url)
        signInUrl.searchParams.set('callbackUrl', request.url)

        return NextResponse.redirect(signInUrl)
      }
    }

    // 如果已认证用户访问登录页，重定向到首页
    if (session && isAuthPath(pathname)) {
      const homePath =
        currentLocale === routing.defaultLocale ? '/' : `/${currentLocale}`

      return NextResponse.redirect(new URL(homePath, request.url))
    }
  } catch (error) {
    // 认证检查失败时，记录错误但不阻止请求
    console.error('认证中间件错误:', error)
  }

  // 4. 添加安全头
  const response = intlResponse || NextResponse.next()

  // 设置安全头
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // 内容安全策略（CSP）
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' blob: data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://api.github.com https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspHeader)

  // 严格传输安全（HSTS）- 仅在生产环境的 HTTPS 下设置
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') === 'https'
  ) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

export const config = {
  // 匹配所有路径，除了 API 路由、静态文件等
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的路径：
     * - api (API 路由)
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     * - public 文件夹中的文件
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
