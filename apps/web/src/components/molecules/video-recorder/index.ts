/**
 * Video Recorder Module Exports
 */

// Types
export type {
  RecordingState,
  CameraError,
  UseVideoRecorderOptions,
  UseVideoRecorderReturn,
  RecorderState,
  TeleprompterProps,
  RecordingTimerProps,
  VideoRecorderPageProps,
} from './types'

export { ERROR_MESSAGES } from './types'

// Utilities
export { formatDuration } from './utils'

// Hooks
export { useVideoRecorder } from './use-video-recorder'

// Components
export { Teleprompter, type TeleprompterRef } from './teleprompter'
export { RecordingTimer } from './recording-timer'
export { VideoRecorderPage } from './video-recorder-page'
