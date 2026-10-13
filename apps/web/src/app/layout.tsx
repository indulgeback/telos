import type { Metadata } from 'next'
import '@/styles/globals.css'
import NextTopLoader from 'nextjs-toploader'
import { getLocale } from 'next-intl/server'
import { ThemeProvider } from '@/components/providers'

export const metadata: Metadata = {
  title: 'Telos',
  description:
    'A modern, scalable intelligent workflow orchestration platform that supports automated task scheduling and management.',
}

interface Iprops {
  children: React.ReactNode
}

export default async function RootLayout({ children }: Iprops) {
  // x-invoke-path 是已废弃的 Vercel 专有头,本项目无人设置,之前永远落到默认语言
  const lang = await getLocale()

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link
          rel='icon'
          type='image/svg+xml'
          href='/brand/telos-01/app-icon.svg'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/brand/telos-01/icon-32.png'
        />
        <link rel='apple-touch-icon' href='/brand/telos-01/icon-180.png' />
        {/* Libre Baskerville: 衬线标题字体(对标 youmind 设计规范) */}
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap'
          rel='stylesheet'
        />
      </head>
      <body className='antialiased'>
        <NextTopLoader color='hsl(var(--foreground))' showSpinner={false} />
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
