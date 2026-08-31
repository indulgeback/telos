'use client'

import { cn } from '@/lib/utils'

export type VoiceAuraState =
  'connecting' | 'reconnecting' | 'listening' | 'speaking' | 'error' | 'idle'

interface VoiceAuraOrbProps {
  state: VoiceAuraState
  amplitude: number
  className?: string
}

const BAR_HEIGHTS = [7, 12, 18, 10, 22, 15, 9, 19, 13, 8, 16, 11]

export function VoiceAuraOrb({
  state,
  amplitude,
  className,
}: VoiceAuraOrbProps) {
  const active =
    state === 'connecting' ||
    state === 'reconnecting' ||
    state === 'listening' ||
    state === 'speaking'
  const responsive = state === 'listening' || state === 'speaking'
  const energy = responsive
    ? Math.max(0.28, Math.min(1, amplitude * 1.6))
    : active
      ? 0.52
      : 0.2

  return (
    <div
      className={cn(
        'flex h-7 min-w-20 items-center justify-center gap-[3px] overflow-hidden',
        className
      )}
      aria-hidden='true'
    >
      {BAR_HEIGHTS.map((height, index) => {
        const variedEnergy = Math.min(
          1,
          energy * (0.72 + ((index * 7) % 5) * 0.1)
        )

        return (
          <span
            key={`${height}-${index}`}
            className={cn(
              'w-[2px] shrink-0 rounded-full bg-foreground transition-[height,opacity] duration-100 ease-out',
              state === 'error' ? 'opacity-20' : 'opacity-55',
              (state === 'connecting' || state === 'reconnecting') &&
                'animate-[agent-voice-bar_900ms_ease-in-out_infinite]'
            )}
            style={{
              height: `${Math.max(2, Math.round(height * variedEnergy))}px`,
              animationDelay:
                state === 'connecting' || state === 'reconnecting'
                  ? `${index * 65}ms`
                  : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
