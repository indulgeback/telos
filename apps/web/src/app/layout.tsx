import type { Metadata } from 'next'
import {
  Geist,
  Geist_Mono,
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Poppins,
} from 'next/font/google'
import '@/styles/globals.css'
import NextTopLoader from 'nextjs-toploader'
import { headers } from 'next/headers'
import appConfig from '@/appConfig'
import { ThemeProvider, SessionProvider } from '@/components/providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfairDisplay.variable} ${jetbrainsMono.variable} ${poppins.variable} antialiased`}
      >
        <NextTopLoader color={appConfig.subjectColor} showSpinner={false} />
        <SessionProvider>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
