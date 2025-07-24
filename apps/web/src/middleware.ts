import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export const middleware = createMiddleware(routing)

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
}
