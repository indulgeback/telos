import { Header, FooterSection } from '@/components/organisms'
import { LenisProvider, OverlayScrollbarProvider } from '@/components/providers'
import React from 'react'

interface Iprops {
  children: React.ReactNode
}

const DefaultLayout: React.FC<Iprops> = ({ children }) => {
  return (
    <LenisProvider>
      <OverlayScrollbarProvider>
        <div className='min-h-screen bg-background text-foreground'>
          <Header />
          {children}
          <FooterSection />
        </div>
      </OverlayScrollbarProvider>
    </LenisProvider>
  )
}

export default DefaultLayout
