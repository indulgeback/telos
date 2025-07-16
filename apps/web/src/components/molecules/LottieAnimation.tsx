'use client'

import Lottie from 'lottie-react'

interface Iprops {
  animationData: any
  loop?: boolean
  autoplay?: boolean
  className?: string
}

const LottieAnimation: React.FC<Iprops> = ({
  animationData,
  loop = true,
  autoplay = true,
  className = 'size-60',
}) => {
  return (
    <Lottie
      animationData={animationData}
      className={className}
      loop={loop}
      autoplay={autoplay}
    />
  )
}

export { LottieAnimation }
