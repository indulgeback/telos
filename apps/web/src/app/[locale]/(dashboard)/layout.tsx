import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from '@/i18n/navigation'
import { ReactNode } from 'react'
import { AppRail } from '@/components/organisms'

interface Iprops {
  children: ReactNode
  params: Promise<{
    locale: string
  }>
}

export default async function DashboardLayout({ children, params }: Iprops) {
  const { locale } = await params
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect({ href: '/auth/signin', locale })
  }

  return (
    <div className='flex h-screen bg-background'>
      <AppRail />
      <main className='min-w-0 flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
