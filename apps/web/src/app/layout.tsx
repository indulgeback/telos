import type { Metadata } from 'next'
import '@/styles/globals.css'
import NextTopLoader from 'nextjs-toploader'
import { headers } from 'next/headers'
import appConfig from '@/appConfig'
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
  const headersList = await headers()
  const path = headersList.get('x-invoke-path') || '/'

  let lang = path.split('/')[1]

  if (!lang || !appConfig.locales.includes(lang)) {
    lang = appConfig.defaultLocale
  }

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel='icon' type='image/svg+xml' href='/favicon.svg' />
        <link rel='icon' type='image/png' href='/favicon.png' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
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
