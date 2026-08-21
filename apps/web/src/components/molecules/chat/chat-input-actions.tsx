'use client'

import { useId, useRef } from 'react'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/atoms'
import {
  BrainCircuit,
  ClipboardList,
  ImagePlus,
  LoaderCircle,
} from 'lucide-react'

export interface ChatInputActionsProps {
  showImageUpload: boolean
  showReasoningEffort: boolean
  showReasoningControl?: boolean
  imageUploadLabel: string
  imageUploadDisabledLabel?: string
  imageUploadingLabel?: string
  imageUploadSupported?: boolean
  disableImageUpload?: boolean
  isUploadingImages?: boolean
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
  imageUploadDisabledLabel = 'The selected model cannot view images',
  imageUploadingLabel = 'Uploading image',
  imageUploadSupported = true,
  disableImageUpload = false,
  isUploadingImages = false,
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
  const imageUploadHintId = useId()

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
            disabled={disableImageUpload}
            onChange={event => {
              onPickImages?.(event.target.files)
              event.currentTarget.value = ''
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='inline-flex shrink-0'>
                <Button
                  type='button'
                  variant='outline'
                  radius='md'
                  disabled={disableImageUpload}
                  onClick={() => fileInputRef.current?.click()}
                  className='h-8 gap-1.5 border-border/70 bg-background px-2.5 text-xs font-normal shadow-none hover:bg-accent/50 disabled:cursor-not-allowed disabled:bg-muted/35 disabled:text-muted-foreground/55 disabled:opacity-100'
                  aria-label={imageUploadLabel}
                  aria-describedby={
                    !imageUploadSupported ? imageUploadHintId : undefined
                  }
                >
                  {isUploadingImages ? (
                    <LoaderCircle className='size-3.5 animate-spin' />
                  ) : (
                    <ImagePlus className='size-3.5' />
                  )}
                  <span className='hidden sm:inline'>
                    {isUploadingImages ? imageUploadingLabel : imageUploadLabel}
                  </span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side='top' sideOffset={8}>
              {!imageUploadSupported
                ? imageUploadDisabledLabel
                : isUploadingImages
                  ? imageUploadingLabel
                  : imageUploadLabel}
            </TooltipContent>
          </Tooltip>
          {!imageUploadSupported && (
            <span id={imageUploadHintId} className='sr-only'>
              {imageUploadDisabledLabel}
            </span>
          )}
        </>
      )}
    </div>
  )
}
