'use client'

import { type ReactNode } from 'react'
import BeautifulStreamingText from '@/components/primitives/StreamingText'

interface StreamingTextProps {
  children: ReactNode
  active?: boolean
  className?: string
}

export function StreamingText({
  children,
  active = false,
  className,
}: StreamingTextProps) {
  return (
    <div className='beautiful-ui'>
      <BeautifulStreamingText active={active} className={className}>
        {children}
      </BeautifulStreamingText>
    </div>
  )
}
