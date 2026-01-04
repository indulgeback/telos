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
  primary: 'from-emerald-500/40 dark:from-emerald-400/30',
  secondary: 'from-teal-400/30 dark:from-teal-500/20',
  accent: 'from-green-600/25 dark:from-emerald-600/15',
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
        'absolute bg-gradient-to-br to-transparent rounded-full blur-[100px] opacity-80 pointer-events-none',
        colorMap[color],
        sizeMap[size],
        positionMap[position],
        className
      )}
    />
  )
}
