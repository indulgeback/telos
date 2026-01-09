import { authOptions } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { ReactNode } from 'react'
import { Navbar } from '@/components/organisms'

interface Iprops {
  children: ReactNode
  params: Promise<{
    locale: string
  }>
}

export default async function DashboardLayout({ children, params }: Iprops) {
  const { locale } = await params
  const session = await authOptions

  if (!session) {
    redirect({ href: '/auth/signin', locale })
  }

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
