'use client'

import { useEffect, useRef } from 'react'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import aiAnimation from '@/assets/lottie/ai.json'
import { cn } from '@/lib/utils'

interface AiLottieIconProps {
  className?: string
  loop?: boolean
  autoplay?: boolean
  play?: boolean
}

export function AiLottieIcon({
  className,
  loop = true,
  autoplay = true,
  play,
}: AiLottieIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const shouldLoop = play === undefined ? loop : play
  const shouldAutoplay = play === undefined ? autoplay : play

  useEffect(() => {
    if (play === undefined || !lottieRef.current) return
    if (play) {
      lottieRef.current.play()
      return
    }
    lottieRef.current.pause()
  }, [play])

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={aiAnimation}
      loop={shouldLoop}
      autoplay={shouldAutoplay}
      className={cn('size-5', className)}
    />
  )
}
