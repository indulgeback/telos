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
import { BrainCircuit, ImagePlus, Plus } from 'lucide-react'

export interface ChatInputActionsProps {
  showImageUpload: boolean
  showReasoningEffort: boolean
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
}

export function ChatInputActions({
  showImageUpload,
  showReasoningEffort,
  imageUploadLabel,
  reasoningEffort,
  reasoningEffortLabel,
  reasoningEffortMinimal,
  reasoningEffortLow,
  reasoningEffortMedium,
  reasoningEffortHigh,
  disableReasoningEffort,
  onPickImages,
  onReasoningEffortChange,
}: ChatInputActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!showImageUpload && !showReasoningEffort) {
    return null
  }

  return (
    <div className='flex w-full flex-wrap items-center gap-2'>
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
                className='h-8 w-8'
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

      {showReasoningEffort && (
        <Select
          value={reasoningEffort}
          onValueChange={value =>
            onReasoningEffortChange(
              value as 'minimal' | 'low' | 'medium' | 'high'
            )
          }
          disabled={disableReasoningEffort}
        >
          <SelectTrigger className='h-8 w-[190px] rounded-md text-xs'>
            <div className='flex items-center gap-1.5'>
              <BrainCircuit className='size-3.5' />
              <span className='text-muted-foreground'>
                {reasoningEffortLabel}
              </span>
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='minimal'>{reasoningEffortMinimal}</SelectItem>
            <SelectItem value='low'>{reasoningEffortLow}</SelectItem>
            <SelectItem value='medium'>{reasoningEffortMedium}</SelectItem>
            <SelectItem value='high'>{reasoningEffortHigh}</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
