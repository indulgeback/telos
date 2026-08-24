'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  createLiquidOrbRenderer,
  type LiquidOrbRenderer,
} from './liquid-orb-renderer'

interface LiquidOrbIconProps {
  className?: string
  play?: boolean
}

export function LiquidOrbIcon({ className, play = true }: LiquidOrbIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<LiquidOrbRenderer | null>(null)
  const playRef = useRef(play)
  const visibleRef = useRef(true)
  const reduceMotionRef = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    playRef.current = play
    rendererRef.current?.requestFrame()
  }, [play])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduceMotionRef.current = motionQuery.matches
    const handleMotionChange = () => {
      reduceMotionRef.current = motionQuery.matches
      rendererRef.current?.requestFrame()
    }
    const handleVisibilityChange = () => {
      rendererRef.current?.requestFrame()
    }
    motionQuery.addEventListener('change', handleMotionChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const observer = new IntersectionObserver(entries => {
      visibleRef.current = entries[0]?.isIntersecting ?? true
      if (visibleRef.current) rendererRef.current?.requestFrame()
    })
    observer.observe(canvas)

    rendererRef.current = createLiquidOrbRenderer({
      canvas,
      shouldAnimate: () =>
        playRef.current && visibleRef.current && !reduceMotionRef.current,
      onReady: () => setReady(true),
      onError: error => {
        console.info('Liquid orb is using its CSS fallback', error.message)
        setReady(false)
      },
    })

    return () => {
      observer.disconnect()
      motionQuery.removeEventListener('change', handleMotionChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  return (
    <span
      aria-hidden='true'
      className={cn(
        'relative inline-flex size-5 shrink-0 overflow-hidden rounded-full',
        className
      )}
    >
      <span
        className={cn(
          'absolute inset-[8%] rounded-full transition-opacity duration-300',
          ready ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          background:
            'radial-gradient(circle at 31% 19%, rgba(255,255,255,.92) 0 7%, transparent 19%), radial-gradient(circle at 75% 66%, #fff6e8 0 13%, transparent 34%), conic-gradient(from 215deg, #756bff, #ff91d8 34%, #6ef2cf 57%, #fff6e8 74%, #756bff)',
          boxShadow:
            'inset 0 0 0 1px rgba(220,234,255,.9), inset -4px -6px 10px rgba(117,107,255,.25), 0 0 5px rgba(158,140,255,.2)',
        }}
      />
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 size-full transition-opacity duration-300',
          ready ? 'opacity-100' : 'opacity-0'
        )}
      />
    </span>
  )
}
