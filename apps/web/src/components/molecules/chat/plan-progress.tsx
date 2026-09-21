'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, ChevronDown, CircleX, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import TaskRows, { type TaskRowItem } from '@/components/primitives/TaskRows'
import type {
  PlanPanelStep,
  PlanStepStatus,
} from '@/components/molecules/chat/PlanPanel'

export interface PlanProgressStripProps {
  summary?: string
  steps: PlanPanelStep[]
  status:
    'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'
  stepStatuses?: PlanStepStatus[]
}

/**
 * 计划进度的紧凑形态：一行状态（图标 + 进度计数 + 当前步骤）+ 细进度条，
 * 点击展开完整步骤列表（内部滚动）。
 * 用于执行中/已完成/失败/历史消息，取代原先全量铺开的大面板，
 * 避免把消息区挤到无法滚动。
 */
export function PlanProgressStrip({
  summary,
  steps,
  status,
  stepStatuses,
}: PlanProgressStripProps) {
  const t = useTranslations('Chat')
  const [expanded, setExpanded] = useState(false)

  const normalizedStatuses = steps.map(
    (_, index) => stepStatuses?.[index] ?? 'pending'
  )
  const total = steps.length
  const done = normalizedStatuses.filter(
    stepStatus => stepStatus === 'completed' || stepStatus === 'skipped'
  ).length
  const failed = normalizedStatuses.some(stepStatus => stepStatus === 'failed')
  const currentIndex = normalizedStatuses.findIndex(
    stepStatus => stepStatus === 'in_progress'
  )
  const current =
    currentIndex >= 0 ? steps[currentIndex]?.description : undefined
  const progress =
    total > 0
      ? status === 'completed'
        ? 100
        : Math.round((done / total) * 100)
      : 0
  const isExecuting =
    status === 'executing' ||
    (status === 'approved' && normalizedStatuses.some(s => s === 'in_progress'))

  const statusLabel =
    status === 'completed'
      ? t('plan.completed')
      : status === 'failed' || status === 'rejected'
        ? t('plan.failed')
        : status === 'approved'
          ? t('plan.approved')
          : status === 'pending'
            ? t('plan.pending')
            : t('plan.executing')

  const items: TaskRowItem[] = steps.map((step, index) => {
    const stepStatus = normalizedStatuses[index]
    return {
      key: `${index}-${step.description}`,
      label: step.description,
      amount: step.tool_hint,
      status: stepStatus,
      details: [],
    }
  })

  const title = t('plan.executing')

  return (
    <section
      data-plan-progress='strip'
      className='beautiful-ui w-full rounded-card bg-surface shadow-card'
    >
      <button
        type='button'
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
        className='flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-inset/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20'
      >
        {isExecuting ? (
          <Loader2 className='size-3.5 shrink-0 animate-spin text-primary' />
        ) : status === 'completed' ? (
          <Check className='size-3.5 shrink-0 text-green' />
        ) : status === 'failed' || status === 'rejected' ? (
          <CircleX className='size-3.5 shrink-0 text-red' />
        ) : (
          <Clock className='size-3.5 shrink-0 text-muted-foreground' />
        )}
        <span className='shrink-0 text-[12px] font-medium text-ink'>
          {title}
        </span>
        {total > 0 && (
          <span className='shrink-0 font-mono text-[10px] tabular-nums text-ink-2'>
            {statusLabel} {done}/{total}
          </span>
        )}
        {total === 0 && (
          <span className='shrink-0 font-mono text-[10px] text-ink-2'>
            {statusLabel}
          </span>
        )}
        {isExecuting && current && (
          <span className='min-w-0 flex-1 truncate text-[11.5px] text-ink-3'>
            {current}
          </span>
        )}
        {isExecuting && !current && summary && (
          <span className='min-w-0 flex-1 truncate text-[11.5px] text-ink-3'>
            {summary}
          </span>
        )}
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {total > 0 && (
        <div
          className='mx-3 mb-2 h-0.5 overflow-hidden rounded-full bg-field'
          role='progressbar'
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              failed ? 'bg-red' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div
        className='grid transition-[grid-template-rows,opacity] duration-300'
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className='overflow-hidden'>
          <div className='max-h-60 overflow-y-auto px-1.5 pb-1.5'>
            <TaskRows items={items} variant='List' />
          </div>
        </div>
      </div>
    </section>
  )
}
