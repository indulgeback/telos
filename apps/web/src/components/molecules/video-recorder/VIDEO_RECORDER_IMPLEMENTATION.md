# Video Recorder 视频录制组件实现文档

## 概述

这是一个功能完整的 Web 视频录制组件，支持：

- 摄像头预览与录制
- 提词器自动滚动
- 横屏/竖屏切换（16:9 / 9:16）
- 视频下载
- 完善的错误处理

## 技术栈

- React 18+ (Hooks)
- TypeScript
- MediaRecorder API
- Canvas API（用于视频裁剪）
- requestAnimationFrame（用于流畅动画）

---

## 文件结构

```
video-recorder/
├── index.ts                 # 模块导出
├── types.ts                 # TypeScript 类型定义
├── utils.ts                 # 工具函数
├── use-video-recorder.ts    # 核心 Hook
├── teleprompter.tsx         # 提词器组件
├── recording-timer.tsx      # 录制计时器组件
└── video-recorder-page.tsx  # 完整页面组件
```

---

## 核心类型定义 (types.ts)

```typescript
/**
 * 录制状态机
 * idle -> previewing -> recording -> completed
 */
export type RecordingState = 'idle' | 'previewing' | 'recording' | 'completed'

/**
 * 宽高比类型
 */
export type AspectRatioType = 'landscape' | 'portrait'

/**
 * 摄像头错误类型
 */
export interface CameraError {
  type: 'permission_denied' | 'not_found' | 'not_supported' | 'unknown'
  message: string
}

/**
 * Hook 返回类型
 */
export interface UseVideoRecorderReturn {
  // 状态
  stream: MediaStream | null
  isRecording: boolean
  isPaused: boolean
  recordedBlob: Blob | null
  recordedUrl: string | null
  error: string | null
  duration: number
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
```

---

## 核心 Hook: useVideoRecorder

### 功能

1. 管理摄像头权限和媒体流
2. 处理 MediaRecorder 生命周期
3. 管理录制时长计时器
4. 生成录制的 Blob 和 URL

### 关键实现

#### 1. 获取支持的 MIME 类型

```typescript
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
```

#### 2. 错误映射

```typescript
function mapMediaError(error: unknown): CameraError {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return { type: 'permission_denied', message: '...' }
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return { type: 'not_found', message: '...' }
      case 'NotSupportedError':
        return { type: 'not_supported', message: '...' }
      default:
        return { type: 'unknown', message: '...' }
    }
  }
  return { type: 'unknown', message: '...' }
}
```

#### 3. 启动摄像头

```typescript
const startCamera = useCallback(async () => {
  try {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('浏览器不支持')
      return
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: true,
    })

    setStream(mediaStream)
    mimeTypeRef.current = getSupportedMimeType()
  } catch (err) {
    const cameraError = mapMediaError(err)
    setError(cameraError.message)
  }
}, [])
```

#### 4. 开始录制

```typescript
const startRecording = useCallback(() => {
  if (!stream) {
    setError('请先启动摄像头')
    return
  }

  // 清理之前的录制
  cleanupRecordedUrl()
  setRecordedBlob(null)
  chunksRef.current = []

  const recorder = new MediaRecorder(stream, {
    mimeType: mimeTypeRef.current,
  })

  recorder.ondataavailable = event => {
    if (event.data?.size > 0) {
      chunksRef.current.push(event.data)
    }
  }

  recorder.onstop = () => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current })
      setRecordedBlob(blob)
      setRecordedUrl(URL.createObjectURL(blob))
    }
  }

  recorder.start(1000) // 每秒收集一次数据
  startTimer()
  setIsRecording(true)
}, [stream])
```

#### 5. 内存清理

```typescript
// 组件卸载时清理
useEffect(() => {
  return () => {
    stream?.getTracks().forEach(track => track.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
  }
}, [])
```

---

## 提词器组件: Teleprompter

### 功能

- 显示滚动文本
- 边缘渐变效果（CSS mask）
- 可控制的滚动速度
- 支持重置

### 关键实现

#### 1. 边缘渐变效果

```tsx
<div
  style={{
    maskImage:
      'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
    WebkitMaskImage:
      'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
  }}
>
  {/* 内容 */}
</div>
```

#### 2. 平滑滚动动画

```typescript
const animate = (timestamp: number) => {
  if (!containerRef.current || !isScrollingRef.current) return

  // 初始化时间
  if (lastTimeRef.current === 0) {
    lastTimeRef.current = timestamp
  }

  // 计算时间增量
  const deltaTime = (timestamp - lastTimeRef.current) / 1000
  lastTimeRef.current = timestamp

  // 计算滚动增量
  const scrollIncrement = scrollSpeed * deltaTime
  scrollPositionRef.current += scrollIncrement
  containerRef.current.scrollTop = scrollPositionRef.current

  // 检查是否到达末尾
  const maxScroll =
    containerRef.current.scrollHeight - containerRef.current.clientHeight
  if (scrollPositionRef.current >= maxScroll) {
    onScrollEnd?.()
    return
  }

  animationFrameRef.current = requestAnimationFrame(animate)
}
```

#### 3. 暴露 reset 方法

```typescript
useImperativeHandle(ref, () => ({
  reset: () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
      scrollPositionRef.current = 0
    }
  },
}))
```

---

## 视频裁剪: Canvas 实现

### 为什么需要 Canvas？

- CSS `object-fit: cover` 只能实现视觉裁剪
- 实际录制需要真正裁剪视频帧
- Canvas 可以实现精确的宽高比裁剪

### 关键实现

#### 1. 计算裁剪区域

```typescript
const drawVideoToCanvas = useCallback(
  function draw() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext('2d')
    const { width: targetWidth, height: targetHeight } =
      getRecordingDimensions()
    canvas.width = targetWidth
    canvas.height = targetHeight

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight
    const targetRatio = targetWidth / targetHeight
    const videoRatio = videoWidth / videoHeight

    let sourceX = 0,
      sourceY = 0
    let sourceWidth = videoWidth,
      sourceHeight = videoHeight

    // 居中裁剪
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
```

#### 2. 从 Canvas 录制

```typescript
const startCanvasRecording = useCallback(() => {
  const canvas = canvasRef.current
  if (!canvas || !stream) return

  // 开始 canvas 绘制循环
  drawVideoToCanvas()

  // 从 canvas 获取视频流
  const canvasVideoStream = canvas.captureStream(30) // 30fps

  // 添加音频轨道
  const audioTracks = stream.getAudioTracks()
  if (audioTracks.length > 0) {
    canvasVideoStream.addTrack(audioTracks[0])
  }

  // 创建 MediaRecorder
  const recorder = new MediaRecorder(canvasVideoStream, { mimeType })
  // ... 设置事件处理器
  recorder.start(1000)
}, [stream, drawVideoToCanvas])
```

---

## 状态机流转

```
┌─────────┐  startCamera()  ┌────────────┐
│  idle   │ ───────────────>│ previewing │
└─────────┘                 └────────────┘
     ^                            │
     │                   startRecording()
     │                            │
     │                            v
     │                     ┌───────────┐
     │                     │ recording │
     │                     └───────────┘
     │                            │
     │                   stopRecording()
     │                            │
     │                            v
     │                     ┌───────────┐
     │  clearRecording()   │ completed │
     └─────────────────────┴───────────┘
```

---

## 使用示例

### 基础使用

```tsx
import { VideoRecorderPage } from './video-recorder'

export default function RecordPage() {
  return (
    <VideoRecorderPage
      scriptText='这是提词器文本...'
      defaultAspectRatio='landscape'
    />
  )
}
```

### 仅使用 Hook

```tsx
import { useVideoRecorder } from './video-recorder'

function MyRecorder() {
  const {
    stream,
    isRecording,
    recordedUrl,
    startCamera,
    startRecording,
    stopRecording,
  } = useVideoRecorder()

  useEffect(() => {
    startCamera()
  }, [])

  return (
    <div>
      <video ref={videoRef} autoPlay muted />
      {!isRecording ? (
        <button onClick={startRecording}>开始</button>
      ) : (
        <button onClick={stopRecording}>停止</button>
      )}
      {recordedUrl && <video src={recordedUrl} controls />}
    </div>
  )
}
```

---

## 注意事项

1. **HTTPS 要求**: `getUserMedia` 需要安全上下文（HTTPS 或 localhost）
2. **浏览器兼容性**: MediaRecorder 在 Safari 中支持有限
3. **内存管理**: 务必在组件卸载时释放 `URL.createObjectURL` 创建的 URL
4. **性能**: Canvas 录制会消耗更多 CPU，建议限制帧率（30fps）
5. **音频同步**: 使用 `stream.getAudioTracks()` 确保音视频同步

---

## 依赖

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "lucide-react": "^0.x.x" // 图标（可替换）
  }
}
```

UI 组件（Button, Alert 等）可根据项目替换为任意 UI 库。
