'use client'

import { useRef } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms'
import { BrainCircuit, ClipboardList, ImagePlus, Plus } from 'lucide-react'

export interface ChatInputActionsProps {
  showImageUpload: boolean
  showReasoningEffort: boolean
  showReasoningControl?: boolean
  imageUploadLabel: string
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high'
  reasoningEffortLabel: string
  reasoningEffortMinimal: string
  reasoningEffortLow: string
  reasoningEffortMedium: string
  reasoningEffortHigh: string
  disableReasoningEffort: boolean
  onPickImages?: (files: FileList | null) => void
  onReasoningEffortChange: (
    value: 'minimal' | 'low' | 'medium' | 'high'
  ) => void
  // Plan 模式相关
  showPlanMode?: boolean
  planMode?: 'auto' | 'plan'
  planLabel?: string
  autoLabel?: string
  disablePlanMode?: boolean
  onPlanModeChange?: (value: 'auto' | 'plan') => void
}

export function ChatInputActions({
  showImageUpload,
  showReasoningEffort,
  showReasoningControl = false,
  imageUploadLabel,
  reasoningEffort,
  reasoningEffortLow,
  reasoningEffortMedium,
  reasoningEffortHigh,
  disableReasoningEffort,
  onPickImages,
  onReasoningEffortChange,
  showPlanMode = false,
  planMode = 'auto' as 'auto' | 'plan',
  planLabel,
  autoLabel,
  disablePlanMode = false,
  onPlanModeChange,
}: ChatInputActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!showImageUpload && !showReasoningEffort && !showPlanMode) {
    return null
  }

  return (
    <div className='flex min-w-0 flex-wrap items-center gap-2'>
      {showReasoningEffort && (
        <div className='flex items-center gap-1.5 shrink-0'>
          <button
            type='button'
            onClick={() =>
              onReasoningEffortChange(
                reasoningEffort !== 'minimal' ? 'minimal' : 'medium'
              )
            }
            disabled={disableReasoningEffort}
            className={`inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
              reasoningEffort !== 'minimal'
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border/70 bg-background text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            } ${disableReasoningEffort ? 'opacity-60' : ''}`}
            aria-pressed={reasoningEffort !== 'minimal'}
            title='Thinking Mode'
          >
            <BrainCircuit className='size-3.5 shrink-0' />
            <span className='truncate'>Thinking</span>
          </button>
          {reasoningEffort !== 'minimal' && showReasoningControl && (
            <div className='flex items-center rounded-md border border-border/70 bg-background h-8 px-2 text-xs shadow-xs'>
              <Select
                value={reasoningEffort}
                onValueChange={value =>
                  onReasoningEffortChange(
                    value as 'minimal' | 'low' | 'medium' | 'high'
                  )
                }
                disabled={disableReasoningEffort}
              >
                <SelectTrigger
                  size='sm'
                  className='h-6 border-none bg-transparent p-0 text-xs shadow-none hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-[48px]'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>{reasoningEffortLow}</SelectItem>
                  <SelectItem value='medium'>
                    {reasoningEffortMedium}
                  </SelectItem>
                  <SelectItem value='high'>{reasoningEffortHigh}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {showPlanMode && onPlanModeChange && (
        <button
          type='button'
          onClick={() =>
            onPlanModeChange(planMode === 'plan' ? 'auto' : 'plan')
          }
          disabled={disablePlanMode}
          className={`inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
            planMode === 'plan'
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border/70 bg-background text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          } ${disablePlanMode ? 'opacity-60' : ''}`}
          aria-pressed={planMode === 'plan'}
          title={planLabel}
        >
          <ClipboardList className='size-3.5 shrink-0' />
          <span className='truncate'>{planLabel}</span>
        </button>
      )}

      {showImageUpload && (
        <>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            multiple
            className='hidden'
            onChange={event => {
              onPickImages?.(event.target.files)
              event.currentTarget.value = ''
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='icon'
                radius='md'
                className='h-8 w-8 border-border/70 bg-background shadow-none hover:bg-accent/50'
                aria-label={imageUploadLabel}
                title={imageUploadLabel}
              >
                <Plus className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side='top' align='start' className='w-36'>
              <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                <ImagePlus className='size-3.5' />
                {imageUploadLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  )
}
