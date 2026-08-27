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
    <section className='agent-surface-shadow overflow-hidden rounded-2xl border border-border bg-card'>
      <div className='flex items-center gap-2.5 border-b border-border px-4 py-3'>
        <span className='grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground'>
          <ClipboardList className='size-3.5' />
        </span>
        <span className='text-[13px] font-medium text-foreground'>
          {isExecuting ? executingLabel || titleLabel : titleLabel}
        </span>
        {summary && (
          <span className='min-w-0 truncate text-[12px] text-muted-foreground'>
            {summary}
          </span>
        )}
        <span className='ml-auto flex shrink-0 items-center gap-2 font-mono text-[10px]'>
          {isExecuting && (
            <span className='rounded-full bg-accent px-2 py-0.5 text-accent-foreground'>
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

      <ol className='divide-y divide-border'>
        {steps.map((step, i) => {
          const sStatus = stepStatuses?.[i] ?? 'pending'
          const isDone = sStatus === 'completed'
          const isActive = sStatus === 'in_progress'
          return (
            <li
              key={i}
              className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors duration-300 ${
                isActive ? 'bg-accent/55' : ''
              }`}
            >
              <span className='mt-0.5 grid size-4 shrink-0 place-items-center'>
                {hasStepStatuses ? (
                  <StepIcon status={sStatus} />
                ) : (
                  <span className='font-mono text-[10px] text-muted-foreground'>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
              </span>
              <span
                className={`flex-1 leading-relaxed ${
                  isDone
                    ? 'text-muted-foreground'
                    : isActive
                      ? 'font-medium text-foreground'
                      : 'text-foreground/65'
                }`}
              >
                {step.description}
                {step.tool_hint && (
                  <span className='ml-2 font-mono text-[10px] text-muted-foreground'>
                    {step.tool_hint}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      {status === 'pending' && onApprove && onReject && (
        <div className='flex items-center gap-2 border-t border-border px-4 py-3'>
          <Button
            type='button'
            size='sm'
            radius='md'
            onClick={onApprove}
            className='min-w-28'
          >
            <CheckCircle2 className='size-3.5' />
            {approveLabel}
          </Button>
          <Button
            type='button'
            size='sm'
            radius='md'
            variant='outline'
            onClick={onReject}
            className='min-w-24 bg-card'
          >
            <XCircle className='size-3.5' />
            {rejectLabel}
          </Button>
        </div>
      )}
    </section>
  )
}
