'use client'

import { Check, X } from 'lucide-react'
import { Button } from '@/components/atoms'
import TaskRows, { type TaskRowItem } from '@/components/primitives/TaskRows'

export type PlanStepStatus =
  'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'

export interface PlanPanelStep {
  description: string
  tool_hint?: string
}

export interface PlanPanelProps {
  summary?: string
  steps: PlanPanelStep[]
  status:
    'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'
  stepStatuses?: PlanStepStatus[]
  titleLabel: string
  approveLabel: string
  rejectLabel: string
  approvedLabel: string
  rejectedLabel: string
  pendingLabel: string
  completedLabel?: string
  failedLabel?: string
  executingLabel?: string
  onApprove?: () => void
  onReject?: () => void
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
  completedLabel = approvedLabel,
  failedLabel = rejectedLabel,
  executingLabel,
  onApprove,
  onReject,
}: PlanPanelProps) {
  const hasStepStatuses = Boolean(stepStatuses?.length)
  const normalizedStatuses = steps.map(
    (_, index) => stepStatuses?.[index] ?? 'pending'
  )
  const completedCount = normalizedStatuses.filter(
    stepStatus => stepStatus === 'completed' || stepStatus === 'skipped'
  ).length
  const isExecuting =
    status === 'executing' || (status === 'approved' && hasStepStatuses)
  const statusText =
    status === 'completed'
      ? completedLabel
      : status === 'failed'
        ? failedLabel
        : isExecuting
          ? `${completedCount}/${steps.length}`
          : status === 'approved'
            ? approvedLabel
            : status === 'rejected'
              ? rejectedLabel
              : pendingLabel
  const items: TaskRowItem[] = steps.map((step, index) => {
    const stepStatus = normalizedStatuses[index]
    const statusLabel =
      stepStatus === 'completed' || stepStatus === 'skipped'
        ? completedLabel
        : stepStatus === 'failed'
          ? failedLabel
          : stepStatus === 'in_progress'
            ? executingLabel || titleLabel
            : pendingLabel

    return {
      key: `${index}-${step.description}`,
      label: step.description,
      amount: step.tool_hint,
      status: stepStatus,
      statusLabel,
      details: [],
    }
  })

  return (
    <section data-plan-layout='list' className='beautiful-ui w-full py-1'>
      <div className='mb-3 flex min-w-0 items-start gap-4 px-0.5'>
        <div className='min-w-0 flex-1'>
          <p className='text-[13px] font-semibold tracking-[-0.01em] text-ink'>
            {isExecuting ? executingLabel || titleLabel : titleLabel}
          </p>
          {summary && (
            <p className='mt-1 line-clamp-3 max-w-[72ch] text-[12px] leading-5 text-ink-3'>
              {summary}
            </p>
          )}
        </div>
        <span className='inline-flex h-6 shrink-0 items-center rounded-control bg-field px-2 font-mono text-[10px] text-ink-2 shadow-hairline'>
          {statusText}
        </span>
      </div>
      <TaskRows items={items} variant='List' />

      {(status === 'pending' || status === 'approved') && onApprove && (
        <div className='flex flex-wrap items-center gap-2 px-0.5 pt-3'>
          <Button
            type='button'
            size='sm'
            radius='full'
            onClick={onApprove}
            className='min-w-28'
          >
            <Check className='size-3.5' />
            {approveLabel}
          </Button>
          {status === 'pending' && onReject && (
            <Button
              type='button'
              size='sm'
              radius='full'
              variant='outline'
              onClick={onReject}
              className='min-w-24 bg-background'
            >
              <X className='size-3.5' />
              {rejectLabel}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
