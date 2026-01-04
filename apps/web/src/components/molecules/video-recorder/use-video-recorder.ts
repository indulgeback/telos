/**
 * useVideoRecorder Hook
 * 视频录制自定义 Hook，管理摄像头访问和视频录制功能
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type {
  UseVideoRecorderOptions,
  UseVideoRecorderReturn,
  CameraError,
  AspectRatioType,
} from './types'
import { ERROR_MESSAGES } from './types'

/**
 * 获取支持的视频 MIME 类型
 * 检查浏览器支持并返回可用格式
 */
function getSupportedMimeType(preferredMimeType?: string): string {
  const mimeTypes = [
    preferredMimeType,
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].filter(Boolean) as string[]

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }

  return 'video/webm'
}

/**
 * 将 getUserMedia 错误映射为 CameraError 类型
 */
function mapMediaError(error: unknown): CameraError {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          type: 'permission_denied',
          message: ERROR_MESSAGES.permission_denied,
        }
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return {
          type: 'not_found',
          message: ERROR_MESSAGES.not_found,
        }
      case 'NotSupportedError':
        return {
          type: 'not_supported',
          message: ERROR_MESSAGES.not_supported,
        }
      default:
        return {
          type: 'unknown',
          message: ERROR_MESSAGES.unknown,
        }
    }
  }

  return {
    type: 'unknown',
    message: ERROR_MESSAGES.unknown,
  }
}

/**
 * 视频录制自定义 Hook
 *
 * 提供摄像头访问、视频录制和 Blob 生成功能
 * 包含完善的错误处理和状态管理
 *
 * @param options - 录制器配置选项
 * @returns 包含状态和操作函数的对象
 */
export function useVideoRecorder(
  options?: UseVideoRecorderOptions
): UseVideoRecorderReturn {
  // 状态
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>(
    options?.aspectRatio || 'landscape'
  )

  // Refs 用于存储不应触发重新渲染的可变值
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeTypeRef = useRef<string>('')
  const aspectRatioRef = useRef<AspectRatioType>(aspectRatio)

  /** 清理录制的 URL 以防止内存泄漏 */
  const cleanupRecordedUrl = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
      setRecordedUrl(null)
    }
  }, [recordedUrl])

  /** 停止计时器 */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /** 启动计时器 */
  const startTimer = useCallback(() => {
    stopTimer()
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1)
    }, 1000)
  }, [stopTimer])

  // 提取 mimeType 以保持依赖稳定
  const preferredMimeType = options?.mimeType

  // 同步 aspectRatio ref
  useEffect(() => {
    aspectRatioRef.current = aspectRatio
  }, [aspectRatio])

  /** 启动摄像头并请求权限 */
  const startCamera = useCallback(async () => {
    try {
      // 清除之前的错误
      setError(null)

      // 检查 MediaDevices API 是否支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(ERROR_MESSAGES.not_supported)
        return
      }

      // 请求摄像头和麦克风访问权限（始终请求最高分辨率，裁剪在 canvas 中处理）
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      })

      setStream(mediaStream)

      // 确定支持的 MIME 类型
      mimeTypeRef.current = getSupportedMimeType(preferredMimeType)
    } catch (err) {
      const cameraError = mapMediaError(err)
      setError(cameraError.message)
    }
  }, [preferredMimeType])

  /** 停止摄像头并释放所有资源 */
  const stopCamera = useCallback(() => {
    // 停止流中的所有轨道
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }

    // 停止正在进行的录制
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    // 停止计时器
    stopTimer()

    // 重置状态
    setIsRecording(false)
    setIsPaused(false)
    setDuration(0)
    chunksRef.current = []
  }, [stream, stopTimer])

  /** 开始视频录制 */
  const startRecording = useCallback(() => {
    if (!stream) {
      setError('请先启动摄像头')
      return
    }

    try {
      // 清理之前的录制
      cleanupRecordedUrl()
      setRecordedBlob(null)
      chunksRef.current = []

      // 创建 MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeTypeRef.current,
      })

      // 处理数据可用事件
      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // 处理录制停止
      recorder.onstop = () => {
        // 从数据块生成 Blob
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, {
            type: mimeTypeRef.current,
          })
          setRecordedBlob(blob)

          // 创建可下载的 URL
          const url = URL.createObjectURL(blob)
          setRecordedUrl(url)
        }
      }

      // 处理错误
      recorder.onerror = () => {
        setError('录制过程中发生错误')
        stopTimer()
        setIsRecording(false)
      }

      // 开始录制
      mediaRecorderRef.current = recorder
      recorder.start(1000) // 每秒收集一次数据

      // 启动计时器
      setDuration(0)
      startTimer()
      setIsRecording(true)
      setIsPaused(false)
    } catch (err) {
      setError('无法启动录制')
      console.error('录制错误:', err)
    }
  }, [stream, cleanupRecordedUrl, startTimer, stopTimer])

  /** 停止视频录制 */
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop()
    }

    stopTimer()
    setIsRecording(false)
    setIsPaused(false)
  }, [stopTimer])

  /** 重新开始视频录制（丢弃当前录制并开始新录制） */
  const restartRecording = useCallback(() => {
    // 停止当前录制但不生成 Blob
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      // 移除 onstop 处理器以防止生成 Blob
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }

    // 重置状态
    stopTimer()
    chunksRef.current = []
    cleanupRecordedUrl()
    setRecordedBlob(null)
    setDuration(0)
    setIsRecording(false)
    setIsPaused(false)

    // 短暂延迟后开始新录制
    setTimeout(() => {
      startRecording()
    }, 100)
  }, [stopTimer, cleanupRecordedUrl, startRecording])

  /** 清除录制的视频并返回预览状态 */
  const clearRecording = useCallback(() => {
    cleanupRecordedUrl()
    setRecordedBlob(null)
    setDuration(0)
  }, [cleanupRecordedUrl])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 停止所有轨道
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // 停止计时器
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // 释放 URL
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // 状态
    stream,
    isRecording,
    isPaused,
    recordedBlob,
    recordedUrl,
    error,
    duration,
    aspectRatio,

    // 操作
    startCamera,
    stopCamera,
    startRecording,
    stopRecording,
    restartRecording,
    clearRecording,
    setAspectRatio,
  }
}
