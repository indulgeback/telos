'use client'

import { ReactNode, useEffect } from 'react'
import { OverlayScrollbars } from 'overlayscrollbars'
import 'overlayscrollbars/styles/overlayscrollbars.css'

interface OverlayScrollbarProviderProps {
  children: ReactNode
}

export function OverlayScrollbarProvider({
  children,
}: OverlayScrollbarProviderProps) {
  useEffect(() => {
    const instance = OverlayScrollbars(document.body, {
      scrollbars: {
        autoHide: 'move',
        autoHideDelay: 800,
        autoHideSuspend: true,
      },
      overflow: {
        x: 'hidden',
      },
    })

    return () => instance.destroy()
  }, [])

  return <>{children}</>
}
