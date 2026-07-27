'use client'

import { useState } from 'react'
import { HelpCircle, Check, HelpCircle as HelpIcon } from 'lucide-react'
import { Button } from '@/components/atoms'
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
        'my-3 rounded-xl border p-4 transition-all duration-300 shadow-xs',
        isPending
          ? 'border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10'
          : 'border-border bg-card/50'
      )}
    >
      {/* 头部区域：图标 + 问题文本 */}
      <div className='flex gap-2.5'>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-300',
            isPending
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-500 animate-pulse'
              : 'border-border bg-muted text-muted-foreground'
          )}
        >
          <HelpCircle className='size-4' />
        </div>
        <div className='flex-1 space-y-1.5'>
          <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground/80'>
            澄清请求 (Clarification Needed)
          </h4>
          <p className='text-sm font-medium text-foreground leading-relaxed'>
            {question}
          </p>
        </div>
      </div>

      {/* 选项区：按钮列表 */}
      <div className='mt-4 flex flex-wrap gap-2'>
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
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium border transition-all duration-300',
                // 未回答且悬停状态
                isPending &&
                  'bg-background hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-600 border-border active:scale-[0.98] cursor-pointer shadow-xs',
                // 被选中的选项高亮
                isSelected &&
                  'bg-blue-500 text-white border-blue-500 font-semibold shadow-md shadow-blue-500/10 scale-[1.01]',
                // 未被选中但已被回答的选项置灰弱化
                hasSelected &&
                  !isSelected &&
                  'opacity-40 bg-muted/30 border-muted text-muted-foreground/60 cursor-not-allowed'
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
