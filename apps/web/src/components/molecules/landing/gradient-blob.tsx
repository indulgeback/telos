'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { cn } from '@/lib/utils'

interface GradientBlobProps {
  className?: string
  color?: 'primary' | 'secondary' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  position?:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center'
  animate?: boolean
}

const colorMap = {
  primary:
    'from-[#4285F4]/55 via-[#9B51E0]/40 to-transparent dark:from-[#4285F4]/35 dark:via-[#9B51E0]/25',
  secondary:
    'from-[#34A853]/45 via-[#4285F4]/35 to-transparent dark:from-[#34A853]/30 dark:via-[#4285F4]/25',
  accent:
    'from-[#C8B27C]/40 via-[#9B51E0]/25 to-transparent dark:from-[#C8B27C]/25 dark:via-[#9B51E0]/20',
}

const sizeMap = {
  sm: 'w-[30vw] h-[20vw]',
  md: 'w-[40vw] h-[30vw]',
  lg: 'w-[50vw] h-[35vw]',
}

const positionMap = {
  'top-left': 'left-[-10vw] top-[-10vw]',
  'top-right': 'right-[-10vw] top-[-10vw]',
  'bottom-left': 'left-[-10vw] bottom-[-10vw]',
  'bottom-right': 'right-[-10vw] bottom-[-10vw]',
  center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
}

export function GradientBlob({
  className,
  color = 'primary',
  size = 'md',
  position = 'top-right',
  animate = true,
}: GradientBlobProps) {
  const blobRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animate || !blobRef.current) return

    gsap.to(blobRef.current, {
      scale: 1.1,
      opacity: 0.9,
      duration: 2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  }, [animate])

  return (
    <div
      ref={blobRef}
      className={cn(
        'absolute bg-gradient-to-br rounded-full blur-[100px] opacity-80 pointer-events-none',
        colorMap[color],
        sizeMap[size],
        positionMap[position],
        className
      )}
    />
  )
}
