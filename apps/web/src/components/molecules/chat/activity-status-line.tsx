'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import type { AssistantActivity } from '@/app/[locale]/(dashboard)/chat/chat-activity'

/**
 * 消息内动态状态行：随流式事件切换「正在准备 → 调用工具 → 执行计划」，
 * 让用户随时知道 agent 在做什么；文本开始输出后由父组件隐藏，
 * 把视觉焦点让给答案。
 */
export function ActivityStatusLine({
  activity,
}: {
  activity: AssistantActivity
}) {
  const t = useTranslations('Chat')
  const [elapsed, setElapsed] = useState(0)
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (startedAtRef.current === null) startedAtRef.current = Date.now()
    const timer = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const elapsedLabel =
    elapsed > 0 ? t('activity.elapsed', { seconds: elapsed }) : null

  let icon = <span className='size-1.5 animate-pulse rounded-full bg-primary' />
  let label: string
  let hint: string | null = null

  if (activity.phase === 'preparing') {
    label = t('activity.preparing')
  } else if (activity.phase === 'tool') {
    icon = <Loader2 className='size-3 animate-spin text-primary' />
    label = t('activity.tool', { tool: activity.tool.toolName })
    hint = null
  } else if (activity.phase === 'plan') {
    icon = <Loader2 className='size-3 animate-spin text-primary' />
    label = t('activity.planStep', {
      step: Math.min(activity.done + 1, activity.total),
      total: activity.total,
    })
    hint = activity.current ?? null
  } else {
    return null
  }

  return (
    <div
      className='flex items-center gap-2 px-0.5 font-mono text-[11px] text-muted-foreground'
      role='status'
      aria-live='polite'
    >
      {icon}
      <span className='shrink-0'>{label}</span>
      {hint && (
        <span className='min-w-0 flex-1 truncate text-muted-foreground/70'>
          {hint}
        </span>
      )}
      {elapsedLabel && (
        <span className='ml-auto shrink-0 tabular-nums text-muted-foreground/70'>
          {elapsedLabel}
        </span>
      )}
    </div>
  )
}
