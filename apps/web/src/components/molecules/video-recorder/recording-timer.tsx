'use client'

import { cn } from '@/lib/utils'
import type { RecordingTimerProps } from './types'
import { formatDuration } from './utils'

/**
 * 录制计时器组件
 *
 * 以 HH:MM:SS 格式显示当前录制时长
 * 位于视频预览区域下方
 */
export function RecordingTimer({ duration, className }: RecordingTimerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'text-2xl font-mono font-semibold text-white',
        'py-2',
        className
      )}
      role='timer'
      aria-live='polite'
      aria-label={`录制时长: ${formatDuration(duration)}`}
    >
      {formatDuration(duration)}
    </div>
  )
}
