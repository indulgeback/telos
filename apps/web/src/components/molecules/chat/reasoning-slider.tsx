'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type ReasoningEffortLevel = 'minimal' | 'low' | 'medium' | 'high'

const LEVEL_ORDER: ReasoningEffortLevel[] = ['minimal', 'low', 'medium', 'high']

// 填充条内的闪烁粒子：位置/大小/延迟固定，渲染稳定且无需随机数
const SPARKS = [
  { left: 8, bottom: 30, size: 3, delay: 0 },
  { left: 20, bottom: 60, size: 2, delay: 0.5 },
  { left: 33, bottom: 25, size: 4, delay: 1.1 },
  { left: 46, bottom: 55, size: 2, delay: 0.3 },
  { left: 58, bottom: 35, size: 3, delay: 0.9 },
  { left: 71, bottom: 60, size: 2, delay: 1.5 },
  { left: 84, bottom: 30, size: 3, delay: 0.7 },
]

/**
 * DeepSeek 风格的思考强度滑条：绿→蓝渐变填充 + 闪烁粒子 + 大号白色圆钮，
 * 四个档位吸附（minimal/low/medium/high）。支持点击、拖拽与方向键。
 */
export function ReasoningSliderPanel({
  value,
  onChange,
  levelLabels,
  title,
  className,
}: {
  value: ReasoningEffortLevel
  onChange: (value: ReasoningEffortLevel) => void
  /** 四档的本地化标签，键为 minimal/low/medium/high */
  levelLabels: Record<ReasoningEffortLevel, string>
  title: string
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const index = LEVEL_ORDER.indexOf(value)
  const safeIndex = index >= 0 ? index : 2
  const position = safeIndex / (LEVEL_ORDER.length - 1)

  const setFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const next = Math.round(ratio * (LEVEL_ORDER.length - 1))
    onChange(LEVEL_ORDER[next])
  }

  return (
    <div
      className={cn('w-64 select-none', className)}
      data-testid='reasoning-slider'
    >
      <style>{`
        @keyframes reasoning-sparkle {
          0%, 100% { opacity: 0.15; transform: scale(0.6); }
          50% { opacity: 0.95; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-reasoning-spark] { animation: none !important; }
        }
      `}</style>

      <div className='mb-2.5 flex items-center justify-between px-0.5'>
        <span className='text-xs text-muted-foreground'>{title}</span>
        <span className='text-xs font-medium text-foreground'>
          {levelLabels[value]}
        </span>
      </div>

      <div
        ref={trackRef}
        role='slider'
        tabIndex={0}
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={LEVEL_ORDER.length - 1}
        aria-valuenow={safeIndex}
        aria-valuetext={levelLabels[value]}
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
          setFromClientX(event.clientX)
        }}
        onPointerMove={event => {
          if (dragging) setFromClientX(event.clientX)
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault()
            onChange(LEVEL_ORDER[Math.max(0, safeIndex - 1)])
          } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault()
            onChange(
              LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, safeIndex + 1)]
            )
          }
        }}
        className={cn(
          'relative h-3.5 cursor-pointer rounded-full bg-muted outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring',
          dragging && 'cursor-grabbing'
        )}
      >
        {/* 渐变填充 + 闪烁粒子 */}
        <div
          className='absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-500 transition-[width] duration-200 ease-out'
          style={{ width: `${Math.max(position * 100, 6)}%` }}
        >
          {SPARKS.map((spark, sparkIndex) => (
            <span
              key={sparkIndex}
              data-reasoning-spark
              className='absolute rounded-full bg-white/80'
              style={{
                left: `${spark.left}%`,
                bottom: `${spark.bottom}%`,
                width: spark.size,
                height: spark.size,
                animation: `reasoning-sparkle 1.8s ease-in-out ${spark.delay}s infinite`,
              }}
            />
          ))}
        </div>

        {/* 大号白色圆钮 */}
        <span
          className={cn(
            'absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] ring-1 ring-black/5 transition-[left] duration-200 ease-out',
            dragging && 'scale-110 transition-none'
          )}
          style={{ left: `${position * 100}%` }}
        />
      </div>
    </div>
  )
}
