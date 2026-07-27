'use client'

import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MinusCircle,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/atoms'

export type PlanStepStatus =
  'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'

export interface PlanPanelStep {
  description: string
  tool_hint?: string
}

export interface PlanPanelProps {
  summary?: string
  steps: PlanPanelStep[]
  status: 'pending' | 'approved' | 'rejected'
  /** 每步的执行状态（execute 阶段实时更新）。长度与 steps 一致 */
  stepStatuses?: PlanStepStatus[]
  // 文案
  titleLabel: string
  approveLabel: string
  rejectLabel: string
  approvedLabel: string
  rejectedLabel: string
  pendingLabel: string
  executingLabel?: string
  onApprove?: () => void
  onReject?: () => void
}

function StepIcon({ status }: { status: PlanStepStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className='size-4 shrink-0 text-emerald-500' />
    case 'in_progress':
      return <Loader2 className='size-4 shrink-0 animate-spin text-blue-500' />
    case 'failed':
      return <XCircle className='size-4 shrink-0 text-rose-500' />
    case 'skipped':
      return <MinusCircle className='size-4 shrink-0 text-muted-foreground' />
    default:
      return <Circle className='size-4 shrink-0 text-muted-foreground/40' />
  }
}

export function PlanPanel({
  summary,
  steps,
  status,
  stepStatuses,
  titleLabel,
  approveLabel,
  rejectLabel,
  approvedLabel,
  rejectedLabel,
  pendingLabel,
  executingLabel,
  onApprove,
  onReject,
}: PlanPanelProps) {
  const hasStepStatuses = stepStatuses && stepStatuses.length > 0
  const completedCount = hasStepStatuses
    ? stepStatuses!.filter(s => s === 'completed' || s === 'skipped').length
    : 0
  const isExecuting = status === 'approved' && hasStepStatuses

  return (
    <div className='rounded-xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-md'>
      {/* 头部：标题 + 进度/badge */}
      <div className='flex items-center gap-2 border-b border-border/40 px-3 py-2'>
        <ClipboardList className='size-4 shrink-0 text-primary' />
        <span className='text-sm font-medium text-foreground'>
          {isExecuting ? executingLabel || titleLabel : titleLabel}
        </span>
        {summary && (
          <span className='truncate text-xs text-muted-foreground'>
            {summary}
          </span>
        )}
        <span className='ml-auto flex items-center gap-2 text-xs'>
          {isExecuting && (
            <span className='text-muted-foreground'>
              {completedCount}/{steps.length}
            </span>
          )}
          {status === 'approved' && !isExecuting && (
            <span className='inline-flex items-center gap-1 text-emerald-500'>
              <CheckCircle2 className='size-3' />
              {approvedLabel}
            </span>
          )}
          {status === 'rejected' && (
            <span className='inline-flex items-center gap-1 text-rose-500'>
              <XCircle className='size-3' />
              {rejectedLabel}
            </span>
          )}
          {status === 'pending' && (
            <span className='inline-flex items-center gap-1 text-amber-500'>
              <Clock className='size-3' />
              {pendingLabel}
            </span>
          )}
        </span>
      </div>

      {/* 步骤列表 */}
      <ol className='space-y-0.5 px-3 py-2'>
        {steps.map((step, i) => {
          const sStatus = stepStatuses?.[i] ?? 'pending'
          const isDone = sStatus === 'completed'
          const isActive = sStatus === 'in_progress'
          return (
            <li
              key={i}
              className='flex items-start gap-2 rounded-md px-1.5 py-1 text-sm transition-colors'
            >
              <span className='mt-0.5'>
                {hasStepStatuses ? (
                  <StepIcon status={sStatus} />
                ) : (
                  <span className='text-xs font-medium text-muted-foreground'>
                    {i + 1}.
                  </span>
                )}
              </span>
              <span
                className={`flex-1 leading-relaxed ${
                  isDone
                    ? 'text-muted-foreground line-through/0'
                    : isActive
                      ? 'text-foreground'
                      : 'text-foreground/70'
                }`}
              >
                {step.description}
                {step.tool_hint && (
                  <span className='ml-1.5 text-[11px] text-muted-foreground/70'>
                    ({step.tool_hint})
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      {/* 操作按钮（仅 pending 状态）*/}
      {status === 'pending' && onApprove && onReject && (
        <div className='flex items-center gap-2 border-t border-border/40 px-3 py-2'>
          <Button type='button' size='sm' radius='md' onClick={onApprove}>
            <CheckCircle2 className='size-3.5' />
            {approveLabel}
          </Button>
          <Button
            type='button'
            size='sm'
            radius='md'
            variant='outline'
            onClick={onReject}
          >
            <XCircle className='size-3.5' />
            {rejectLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
