'use client'

import Lottie from 'lottie-react'
import aiAnimation from '@/assets/lottie/ai.json'
import { cn } from '@/lib/utils'

interface AiLottieIconProps {
  className?: string
  loop?: boolean
  autoplay?: boolean
}

export function AiLottieIcon({
  className,
  loop = true,
  autoplay = true,
}: AiLottieIconProps) {
  return (
    <Lottie
      animationData={aiAnimation}
      loop={loop}
      autoplay={autoplay}
      className={cn('size-5', className)}
    />
  )
}
