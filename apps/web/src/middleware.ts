import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// 创建国际化中间件
const intlMiddleware = createIntlMiddleware(routing)

export default intlMiddleware

export const config = {
  // 匹配所有需要国际化处理的路径
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
  ],
}
