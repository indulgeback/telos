import { Header, FooterSection } from '@/components/organisms'
import { LenisProvider } from '@/components/providers'
import React from 'react'

interface Iprops {
  children: React.ReactNode
}

const DefaultLayout: React.FC<Iprops> = ({ children }) => {
  return (
    <LenisProvider>
      <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
        <Header />
        {children}
        <FooterSection />
      </div>
    </LenisProvider>
  )
}

export default DefaultLayout
