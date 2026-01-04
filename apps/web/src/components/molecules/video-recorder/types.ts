/**
 * 视频录制器类型定义
 * 定义视频录制功能的所有 TypeScript 类型
 */

/**
 * 录制状态机状态
 * - idle: 初始状态，未访问摄像头
 * - previewing: 摄像头已激活，显示预览
 * - recording: 正在录制视频
 * - completed: 录制完成，视频可用
 */
export type RecordingState = 'idle' | 'previewing' | 'recording' | 'completed'

/**
 * 摄像头错误类型，用于友好的错误处理
 */
export interface CameraError {
  type: 'permission_denied' | 'not_found' | 'not_supported' | 'unknown'
  message: string
}

/**
 * 各类摄像头错误的提示消息
 */
export const ERROR_MESSAGES: Record<CameraError['type'], string> = {
  permission_denied: '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头',
  not_found: '未找到摄像头设备，请确保设备已连接',
  not_supported: '您的浏览器不支持视频录制功能',
  unknown: '发生未知错误，请刷新页面重试',
}

/**
 * 视频宽高比类型
 * - landscape: 横屏 16:9
 * - portrait: 竖屏 9:16
 */
export type AspectRatioType = 'landscape' | 'portrait'

/**
 * useVideoRecorder Hook 的配置选项
 */
export interface UseVideoRecorderOptions {
  mimeType?: string
  aspectRatio?: AspectRatioType
}

/**
 * useVideoRecorder Hook 的返回类型
 */
export interface UseVideoRecorderReturn {
  // 状态
  stream: MediaStream | null
  isRecording: boolean
  isPaused: boolean
  recordedBlob: Blob | null
  recordedUrl: string | null
  error: string | null
  duration: number // 秒
  aspectRatio: AspectRatioType

  // 操作
  startCamera: () => Promise<void>
  stopCamera: () => void
  startRecording: () => void
  stopRecording: () => void
  restartRecording: () => void
  clearRecording: () => void
  setAspectRatio: (ratio: AspectRatioType) => void
}

/**
 * 内部录制器状态，用于管理录制生命周期
 */
export interface RecorderState {
  state: RecordingState
  stream: MediaStream | null
  recorder: MediaRecorder | null
  chunks: Blob[]
  duration: number
  error: string | null
}

/**
 * 提词器组件属性
 */
export interface TeleprompterProps {
  text: string
  isScrolling: boolean
  scrollSpeed?: number // 每秒像素数
  onScrollEnd?: () => void
  onReset?: () => void
}

/**
 * 录制计时器组件属性
 */
export interface RecordingTimerProps {
  duration: number // 秒
  className?: string
}

/**
 * 视频录制页面组件属性
 */
export interface VideoRecorderPageProps {
  scriptText?: string
  defaultAspectRatio?: AspectRatioType
}
