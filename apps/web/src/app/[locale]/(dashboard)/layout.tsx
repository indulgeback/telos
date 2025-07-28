import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { Navbar } from '@/components/organisms'

interface DashboardLayoutProps {
  children: ReactNode
  params: {
    locale?: string
  }
}

export default async function DashboardLayout({
  children,
  params: { locale },
}: DashboardLayoutProps) {
  const session = await auth()

  if (!session) {
    redirect(`/${locale}/auth/signin`)
  }

  return (
    <div className='min-h-screen bg-background'>
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
