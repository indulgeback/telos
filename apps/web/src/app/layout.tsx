import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import '@/styles/globals.css'
import NextTopLoader from 'nextjs-toploader'
import { headers } from 'next/headers'
import appConfig from '@/appConfig'
import { ThemeProvider } from '@/components/providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

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
        <link rel='icon' type='image/png' href='/favicon.png' />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader color={appConfig.subjectColor} showSpinner={false} />
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
