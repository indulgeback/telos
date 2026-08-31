'use client'

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/atoms'
import { cn } from '@/lib/utils'
import { AudioLines, Mic, MicOff, PhoneOff, Square } from 'lucide-react'
import { VoiceAuraOrb, type VoiceAuraState } from './VoiceAuraOrb'

interface RealtimeVoiceControlProps {
  state: VoiceAuraState
  amplitude: number
  active: boolean
  muted: boolean
  available: boolean
  statusLabel: string
  stateLabel: string
  elapsedLabel: string
  errorText?: string | null
  configurationText?: string | null
  muteLabel: string
  unmuteLabel: string
  interruptLabel: string
  disconnectLabel: string
  mutedLabel: string
  canInterrupt: boolean
  onMutedChange: () => void
  onInterrupt: () => void
  onDisconnect: () => void
}

export function RealtimeVoiceControl({
  state,
  amplitude,
  active,
  muted,
  available,
  statusLabel,
  stateLabel,
  elapsedLabel,
  errorText,
  configurationText,
  muteLabel,
  unmuteLabel,
  interruptLabel,
  disconnectLabel,
  mutedLabel,
  canInterrupt,
  onMutedChange,
  onInterrupt,
  onDisconnect,
}: RealtimeVoiceControlProps) {
  const detailText = errorText || configurationText
  const displayState = muted && active ? mutedLabel : stateLabel

  return (
    <section
      className='agent-surface-shadow overflow-hidden rounded-xl border border-border bg-card/95'
      aria-live='polite'
      aria-label={displayState}
    >
      <div className='flex min-h-12 items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <span
            className={cn(
              'relative grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors',
              active && 'bg-foreground text-background',
              state === 'error' &&
                'bg-destructive/10 text-destructive ring-1 ring-destructive/20'
            )}
          >
            <AudioLines className='size-3.5' />
            {active && !muted && (
              <span className='absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-card bg-foreground' />
            )}
          </span>

          <div className='min-w-0'>
            <p className='truncate text-[12px] font-medium leading-4 text-foreground'>
              {displayState}
            </p>
            <p className='truncate font-mono text-[9px] leading-4 text-muted-foreground'>
              {active ? elapsedLabel : statusLabel}
            </p>
          </div>
        </div>

        <VoiceAuraOrb
          state={muted ? 'idle' : state}
          amplitude={muted ? 0 : amplitude}
          className='mx-1 min-w-16 flex-1 sm:min-w-32'
        />

        <div className='flex shrink-0 items-center gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                radius='md'
                onClick={onMutedChange}
                disabled={!available}
                aria-label={muted ? unmuteLabel : muteLabel}
                aria-pressed={muted}
                className={cn(
                  'size-8 text-muted-foreground hover:bg-muted hover:text-foreground',
                  muted && 'bg-muted text-foreground'
                )}
              >
                {muted ? (
                  <MicOff className='size-3.5' />
                ) : (
                  <Mic className='size-3.5' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side='top'>
              {muted ? unmuteLabel : muteLabel}
            </TooltipContent>
          </Tooltip>

          {canInterrupt && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  radius='md'
                  onClick={onInterrupt}
                  aria-label={interruptLabel}
                  className='size-8 text-muted-foreground hover:bg-muted hover:text-foreground'
                >
                  <Square className='size-3 fill-current' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>{interruptLabel}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                radius='md'
                onClick={onDisconnect}
                aria-label={disconnectLabel}
                className='size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              >
                <PhoneOff className='size-3.5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='top'>{disconnectLabel}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {detailText && (
        <p
          className={cn(
            'border-t border-border px-3 py-2 text-[11px] leading-4 text-muted-foreground',
            errorText && 'text-destructive'
          )}
          title={detailText}
        >
          {detailText}
        </p>
      )}
    </section>
  )
}
