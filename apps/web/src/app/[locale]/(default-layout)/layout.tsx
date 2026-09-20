import { Header, FooterSection } from '@/components/organisms'
import React from 'react'

interface Iprops {
  children: React.ReactNode
}

const DefaultLayout: React.FC<Iprops> = ({ children }) => {
  return (
    <div className='min-h-screen bg-background text-foreground'>
      <Header />
      {children}
      <FooterSection />
    </div>
  )
}

export default DefaultLayout
