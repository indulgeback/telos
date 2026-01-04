'use client'

/**
 * 视频录制页面组件
 *
 * 预览使用 CSS object-fit 实现裁剪（高性能）
 * 录制使用 Canvas 实现实际裁剪（必须）
 */

import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/button'
import { Alert, AlertDescription } from '@/components/atoms/alert'
import {
  Play,
  Square,
  RotateCcw,
  Download,
  Video,
  AlertCircle,
  Monitor,
  Smartphone,
} from 'lucide-react'
import { useVideoRecorder } from './use-video-recorder'
import { Teleprompter, type TeleprompterRef } from './teleprompter'
import { RecordingTimer } from './recording-timer'
import type {
  VideoRecorderPageProps,
  RecordingState,
  AspectRatioType,
} from './types'

// 提词器默认文本
const DEFAULT_SCRIPT = `欢迎使用视频录制功能。
这是一个带有提词器的视频录制测试页面。您可以在录制过程中看到这段文字自动滚动，帮助您记住要说的内容。
提词器会在您开始录制时自动滚动，当您停止录制时暂停。如果您重新开始录制，提词器会重置到开头。
现在，请点击下方的"开始录制"按钮开始您的录制。
祝您录制顺利！
欢迎使用视频录制功能。
这是一个带有提词器的视频录制测试页面。您可以在录制过程中看到这段文字自动滚动，帮助您记住要说的内容。
提词器会在您开始录制时自动滚动，当您停止录制时暂停。如果您重新开始录制，提词器会重置到开头。
现在，请点击下方的"开始录制"按钮开始您的录制。
祝您录制顺利！
欢迎使用视频录制功能。
这是一个带有提词器的视频录制测试页面。您可以在录制过程中看到这段文字自动滚动，帮助您记住要说的内容。
提词器会在您开始录制时自动滚动，当您停止录制时暂停。如果您重新开始录制，提词器会重置到开头。
现在，请点击下方的"开始录制"按钮开始您的录制。
祝您录制顺利！
欢迎使用视频录制功能。
这是一个带有提词器的视频录制测试页面。您可以在录制过程中看到这段文字自动滚动，帮助您记住要说的内容。
提词器会在您开始录制时自动滚动，当您停止录制时暂停。如果您重新开始录制，提词器会重置到开头。
现在，请点击下方的"开始录制"按钮开始您的录制。
祝您录制顺利！
欢迎使用视频录制功能。
这是一个带有提词器的视频录制测试页面。您可以在录制过程中看到这段文字自动滚动，帮助您记住要说的内容。
提词器会在您开始录制时自动滚动，当您停止录制时暂停。如果您重新开始录制，提词器会重置到开头。
现在，请点击下方的"开始录制"按钮开始您的录制。
祝您录制顺利！
欢迎使用视频录制功能。
这是一个带有提词器的视频录制测试页面。您可以在录制过程中看到这段文字自动滚动，帮助您记住要说的内容。
提词器会在您开始录制时自动滚动，当您停止录制时暂停。如果您重新开始录制，提词器会重置到开头。
现在，请点击下方的"开始录制"按钮开始您的录制。
祝您录制顺利！`

export function VideoRecorderPage({
  scriptText = DEFAULT_SCRIPT,
  defaultAspectRatio = 'landscape',
}: VideoRecorderPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const teleprompterRef = useRef<TeleprompterRef>(null)
  const animationFrameRef = useRef<number | null>(null)

  const {
    stream,
    isRecording,
    error,
    duration,
    aspectRatio,
    startCamera,
    stopCamera,
    startRecording: hookStartRecording,
    stopRecording: hookStopRecording,
    clearRecording,
    setAspectRatio,
  } = useVideoRecorder({ aspectRatio: defaultAspectRatio })

  // 录制相关
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [localRecordedUrl, setLocalRecordedUrl] = useState<string | null>(null)
  const [localRecordedBlob, setLocalRecordedBlob] = useState<Blob | null>(null)

  // 从 hook 状态派生录制状态
  const recordingState: RecordingState = useMemo(() => {
    if (localRecordedUrl) return 'completed'
    if (isRecording) return 'recording'
    if (stream) return 'previewing'
    return 'idle'
  }, [localRecordedUrl, isRecording, stream])

  // 当视频流可用时，将其绑定到 video 元素
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // 组件挂载时初始化摄像头
  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** 获取录制区域的尺寸 */
  const getRecordingDimensions = useCallback(() => {
    if (aspectRatio === 'landscape') {
      return { width: 1280, height: 720 } // 16:9
    } else {
      return { width: 720, height: 1280 } // 9:16
    }
  }, [aspectRatio])

  /** 将视频帧绘制到 canvas（仅录制时使用） */
  const drawVideoToCanvas = useCallback(
    function draw() {
      const video = videoRef.current
      const canvas = canvasRef.current

      if (!video || !canvas || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(draw)
        return
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width: targetWidth, height: targetHeight } =
        getRecordingDimensions()
      canvas.width = targetWidth
      canvas.height = targetHeight

      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight
      const targetRatio = targetWidth / targetHeight
      const videoRatio = videoWidth / videoHeight

      let sourceX = 0
      let sourceY = 0
      let sourceWidth = videoWidth
      let sourceHeight = videoHeight

      // 计算裁剪区域（居中裁剪）
      if (videoRatio > targetRatio) {
        sourceWidth = videoHeight * targetRatio
        sourceX = (videoWidth - sourceWidth) / 2
      } else {
        sourceHeight = videoWidth / targetRatio
        sourceY = (videoHeight - sourceHeight) / 2
      }

      // 镜像翻转绘制
      ctx.save()
      ctx.scale(-1, 1)
      ctx.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        -targetWidth,
        0,
        targetWidth,
        targetHeight
      )
      ctx.restore()

      animationFrameRef.current = requestAnimationFrame(draw)
    },
    [getRecordingDimensions]
  )

  /** 开始录制 */
  const startCanvasRecording = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !stream) return

    // 开始 canvas 绘制循环
    drawVideoToCanvas()

    // 从 canvas 获取视频流
    const canvasVideoStream = canvas.captureStream(30)

    // 添加音频轨道
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length > 0) {
      canvasVideoStream.addTrack(audioTracks[0])
    }

    // 创建 MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm'

    const recorder = new MediaRecorder(canvasVideoStream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      // 停止 canvas 绘制
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setLocalRecordedBlob(blob)
        setLocalRecordedUrl(URL.createObjectURL(blob))
      }
    }

    mediaRecorderRef.current = recorder
    recorder.start(1000)
    hookStartRecording()
  }, [stream, drawVideoToCanvas, hookStartRecording])

  /** 停止录制 */
  const stopCanvasRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }
    hookStopRecording()
  }, [hookStopRecording])

  /** 处理开始录制 */
  const handleStartRecording = useCallback(() => {
    teleprompterRef.current?.reset()
    setLocalRecordedUrl(null)
    setLocalRecordedBlob(null)
    startCanvasRecording()
  }, [startCanvasRecording])

  /** 处理重新录制 */
  const handleRestartRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    teleprompterRef.current?.reset()
    setLocalRecordedUrl(null)
    setLocalRecordedBlob(null)
    chunksRef.current = []

    setTimeout(() => {
      startCanvasRecording()
    }, 100)
  }, [startCanvasRecording])

  /** 处理停止录制 */
  const handleStopRecording = useCallback(() => {
    stopCanvasRecording()
  }, [stopCanvasRecording])

  /** 处理下载视频 */
  const handleDownload = useCallback(() => {
    if (localRecordedUrl && localRecordedBlob) {
      const a = document.createElement('a')
      a.href = localRecordedUrl
      a.download = `recording-${aspectRatio}-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }, [localRecordedUrl, localRecordedBlob, aspectRatio])

  /** 处理新录制（录制完成后返回预览状态） */
  const handleNewRecording = useCallback(() => {
    // 清理录制的 URL
    if (localRecordedUrl) {
      URL.revokeObjectURL(localRecordedUrl)
    }
    // 重置本地状态，这会让 recordingState 变回 'previewing'
    setLocalRecordedUrl(null)
    setLocalRecordedBlob(null)
    chunksRef.current = []
    clearRecording()

    // 如果摄像头流不存在，重新启动
    if (!stream) {
      startCamera()
    }
  }, [localRecordedUrl, clearRecording, stream, startCamera])

  /** 切换宽高比 */
  const handleAspectRatioChange = useCallback(
    (ratio: AspectRatioType) => {
      if (!isRecording) {
        setAspectRatio(ratio)
      }
    },
    [isRecording, setAspectRatio]
  )

  // 视频预览容器的样式（用 CSS 实现裁剪效果）
  const videoContainerStyle = useMemo(() => {
    if (aspectRatio === 'landscape') {
      return 'aspect-video' // 16:9
    } else {
      return 'aspect-[9/16]' // 9:16
    }
  }, [aspectRatio])

  return (
    <div className='fixed inset-0 bg-black overflow-hidden flex items-center justify-center'>
      {/* 隐藏的录制 canvas */}
      <canvas ref={canvasRef} className='hidden' />

      {/* 视频预览容器 - 使用 CSS object-fit: cover 实现裁剪 */}
      {recordingState !== 'completed' && (
        <div className={cn('relative w-full h-full', videoContainerStyle)}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className='absolute inset-0 w-full h-full object-cover transform scale-x-[-1]'
          />
          <div className='absolute inset-0 bg-black/40' />
        </div>
      )}

      {/* 录制完成后的视频预览 */}
      {recordingState === 'completed' && localRecordedUrl && (
        <div
          className={cn(
            'relative',
            videoContainerStyle,
            'max-w-full max-h-full bg-black/40'
          )}
        >
          <video
            src={localRecordedUrl}
            controls
            className='w-full h-full object-contain'
          />
        </div>
      )}

      {/* 空闲状态占位符 */}
      {recordingState === 'idle' && !error && (
        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='text-center text-gray-400'>
            <Video className='w-16 h-16 mx-auto mb-4 opacity-50' />
            <p>正在启动摄像头...</p>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-30'>
          <Alert variant='destructive' className='max-w-md mx-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* 顶部提词器 */}
      <div className='absolute top-0 left-0 right-0 z-20'>
        <Teleprompter
          ref={teleprompterRef}
          text={scriptText}
          isScrolling={isRecording}
          scrollSpeed={40}
        />
      </div>

      {/* 录制中指示器 */}
      {isRecording && (
        <div className='absolute top-4 right-4 flex items-center gap-2 z-20'>
          <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse' />
          <span className='text-white text-sm font-medium'>录制中</span>
        </div>
      )}

      {/* 底部控制栏 */}
      <div className='absolute bottom-0 left-0 right-0 z-20'>
        <div className='py-2'>
          <RecordingTimer duration={duration} />
        </div>

        {recordingState === 'previewing' && (
          <div className='flex items-center justify-center gap-2 pb-2'>
            <Button
              variant={aspectRatio === 'landscape' ? 'default' : 'outline'}
              size='sm'
              onClick={() => handleAspectRatioChange('landscape')}
              className={cn(
                aspectRatio === 'landscape'
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'border-white/50 text-white hover:bg-white/20'
              )}
            >
              <Monitor className='w-4 h-4 mr-1' />
              16:9
            </Button>
            <Button
              variant={aspectRatio === 'portrait' ? 'default' : 'outline'}
              size='sm'
              onClick={() => handleAspectRatioChange('portrait')}
              className={cn(
                aspectRatio === 'portrait'
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'border-white/50 text-white hover:bg-white/20'
              )}
            >
              <Smartphone className='w-4 h-4 mr-1' />
              9:16
            </Button>
          </div>
        )}

        <div className='flex items-center justify-center gap-4 px-6 py-4'>
          {recordingState === 'previewing' && (
            <Button
              onClick={handleStartRecording}
              size='lg'
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              <Play className='w-5 h-5 mr-2' />
              开始录制
            </Button>
          )}

          {recordingState === 'recording' && (
            <>
              <Button
                onClick={handleRestartRecording}
                variant='outline'
                size='lg'
                className='border-white/50 text-white hover:bg-white/20'
              >
                <RotateCcw className='w-5 h-5 mr-2' />
                重新录制
              </Button>
              <Button
                onClick={handleStopRecording}
                size='lg'
                className='bg-red-600 hover:bg-red-700 text-white'
              >
                <Square className='w-5 h-5 mr-2' />
                结束录制
              </Button>
            </>
          )}

          {recordingState === 'completed' && (
            <>
              <Button
                onClick={handleNewRecording}
                variant='outline'
                size='lg'
                className='border-white/50 text-white hover:bg-white/20'
              >
                <RotateCcw className='w-5 h-5 mr-2' />
                重新录制
              </Button>
              <Button
                onClick={handleDownload}
                size='lg'
                className='bg-green-600 hover:bg-green-700 text-white'
              >
                <Download className='w-5 h-5 mr-2' />
                下载视频
              </Button>
            </>
          )}

          {recordingState === 'idle' && error && (
            <Button
              onClick={startCamera}
              size='lg'
              variant='outline'
              className='border-white/50 text-white hover:bg-white/20'
            >
              <RotateCcw className='w-5 h-5 mr-2' />
              重试
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
