'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ThinkingTraceProps {
  text: string
  state?: 'streaming' | 'done'
  title?: string
  /** 兼容旧调用方的覆盖文案；缺省时使用 i18n */
  thinkingLabel?: string
  doneLabel?: string
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  if (safeSeconds < 60) return `${safeSeconds}s`
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${minutes}m ${String(rest).padStart(2, '0')}s`
}

/**
 * 思考轨迹：全程保持折叠，只在摘要行展示状态。
 * - 流式中：「思考中… Ns ▸」点击展开实时内容（max-h 内滚动，不干扰全局滚动）
 * - 完成后：「已思考 · 用时 Ns ▸」收起为摘要，把视觉焦点留给答案
 */
export function ThinkingTrace({
  text,
  state = 'done',
  title,
  thinkingLabel,
  doneLabel,
}: ThinkingTraceProps) {
  const t = useTranslations('Chat')
  const streaming = state === 'streaming'
  const [expanded, setExpanded] = useState(false)
  const [liveElapsed, setLiveElapsed] = useState<number | null>(null)
  const [frozenDuration, setFrozenDuration] = useState<number | null>(null)

  // 记录本次思考的起始时间；结束后冻结为用时（历史消息无时长则不显示）
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!streaming) {
      if (startedAtRef.current !== null) {
        const seconds = Math.round((Date.now() - startedAtRef.current) / 1000)
        setFrozenDuration(previous => previous ?? seconds)
        setLiveElapsed(null)
        startedAtRef.current = null
      }
      return
    }
    if (startedAtRef.current === null) startedAtRef.current = Date.now()
    const timer = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setLiveElapsed(Math.round((Date.now() - startedAtRef.current) / 1000))
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [streaming])

  const liveLabel = thinkingLabel ?? t('reasoning.thinking')
  const doneFallback = doneLabel ?? t('reasoning.done')
  const durationSeconds = streaming ? liveElapsed : frozenDuration
  const duration =
    durationSeconds !== null && durationSeconds !== undefined
      ? formatDuration(durationSeconds)
      : null
  const summaryLabel = streaming
    ? duration
      ? `${liveLabel} · ${duration}`
      : liveLabel
    : duration
      ? t('reasoning.doneElapsed', { duration })
      : doneFallback

  return (
    <section
      className='beautiful-ui w-full py-0.5'
      aria-label={title ?? t('reasoning.title')}
    >
      <button
        type='button'
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        className='group flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20'
      >
        {streaming ? (
          <Loader2 className='size-3.5 shrink-0 animate-spin text-muted-foreground' />
        ) : (
          <Sparkles className='size-3.5 shrink-0 text-muted-foreground/70' />
        )}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-[12px]',
            streaming ? 'shimmer-text font-medium' : 'text-muted-foreground'
          )}
        >
          {summaryLabel}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>
      <div
        className='grid transition-[grid-template-rows,opacity] duration-300'
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className='overflow-hidden'>
          <div className='mb-1 grid grid-cols-[16px_1fr] gap-1 px-1'>
            <span aria-hidden className='mx-auto h-full w-px bg-border' />
            <div
              className='max-h-56 overflow-y-auto whitespace-pre-wrap break-words py-1 pr-2 text-[12.5px] leading-5 text-muted-foreground/90'
              aria-live={streaming ? 'polite' : undefined}
            >
              {text}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
