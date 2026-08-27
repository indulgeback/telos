'use client'

import { useState } from 'react'
import { HelpCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ClarifyPanelProps {
  messageId: string
  question: string
  options: string[]
  status: 'pending' | 'answered'
  selectedOption?: string | null
  onSelect?: (option: string) => void
}

export function ClarifyPanel({
  messageId,
  question,
  options,
  status,
  selectedOption,
  onSelect,
}: ClarifyPanelProps) {
  const [selected, setSelected] = useState<string | null>(
    selectedOption || null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPending = status === 'pending' && !selected

  const handleSelect = async (option: string) => {
    if (!isPending || isSubmitting) return
    setIsSubmitting(true)
    setSelected(option)
    try {
      if (onSelect) {
        await onSelect(option)
      }
    } catch (err) {
      console.error('Failed to select clarify option:', err)
      setSelected(null) // 失败回滚
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        'agent-surface-shadow my-3 overflow-hidden rounded-2xl border bg-card transition-all duration-300',
        isPending ? 'border-primary/35' : 'border-border'
      )}
    >
      <div className='flex gap-3 p-4'>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
            isPending
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <HelpCircle className='size-4' />
        </div>
        <div className='flex-1 space-y-1.5'>
          <h4 className='font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground'>
            澄清请求 (Clarification Needed)
          </h4>
          <p className='text-[14px] font-medium leading-relaxed text-foreground'>
            {question}
          </p>
        </div>
      </div>

      <div className='flex flex-wrap gap-2 border-t border-border bg-muted/35 px-4 py-3'>
        {options.map((option, index) => {
          const isSelected = selected === option
          const hasSelected = !!selected

          return (
            <button
              key={`${option}-${index}`}
              type='button'
              disabled={hasSelected || isSubmitting}
              onClick={() => handleSelect(option)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-200 active:scale-[0.98]',
                isPending &&
                  'border-border bg-card text-foreground hover:border-primary/45 hover:bg-accent hover:text-accent-foreground',
                isSelected &&
                  'border-primary bg-primary font-semibold text-primary-foreground',
                hasSelected &&
                  !isSelected &&
                  'cursor-not-allowed border-border bg-muted/30 text-muted-foreground/60 opacity-45'
              )}
            >
              {isSelected && <Check className='size-3 shrink-0 stroke-[3]' />}
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
