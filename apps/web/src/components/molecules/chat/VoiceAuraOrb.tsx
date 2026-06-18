'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import SiriWave from 'siriwave'

export type VoiceAuraState = 'connecting' | 'listening' | 'speaking' | 'idle'

interface VoiceAuraOrbProps {
  state: VoiceAuraState
  amplitude: number // 0 到 1 之间，实时音频振幅
  className?: string
  width?: number
  height?: number
}

// 客户端挂载标记：仅在浏览器侧为 true，避免 SiriWave 在 SSR 阶段访问 DOM。
// 使用 useSyncExternalStore 实现 hydration 安全的 isClient 检测，等价于原
// mounted 状态，但不会触发 react-hooks/set-state-in-effect 规则。
const emptySubscribe = () => () => {}

export function VoiceAuraOrb({
  state,
  amplitude,
  className,
  width = 144,
  height = 144,
}: VoiceAuraOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const siriWaveRef = useRef<SiriWave | null>(null)
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    // 实例化 SiriWave 经典 Siri 彩虹波动画库
    const siriWave = new SiriWave({
      container: containerRef.current,
      style: 'ios9', // 使用经典的 iOS 9+ 多色彩虹流光融合曲线
      width, // 动态宽度参数
      height, // 动态高度参数
      speed: 0.05,
      amplitude: 0.05,
      autostart: true,
      cover: true,
    })

    siriWaveRef.current = siriWave

    // 卸载时优雅清理，释放 canvas 资源
    return () => {
      siriWave.stop()
      siriWaveRef.current = null
    }
  }, [mounted, width, height])

  // 根据当前实时状态与音频输入振幅（amplitude），高频平滑控制波形速度与高度
  useEffect(() => {
    const siriWave = siriWaveRef.current
    if (!siriWave) return

    let targetSpeed = 0.05
    let targetAmplitude = 0.05

    // 采用非线性平方根算法放大弱信号振幅，提升表现张力，同时拉高基础底值以防扁平一条线
    switch (state) {
      case 'connecting':
        // 连接中：速度稍微变快，展现明显但轻柔的彩虹流光
        targetSpeed = 0.1
        targetAmplitude = 0.35
        break
      case 'listening':
        // 倾听中：速度响应极其灵敏，使用平方根非线性放大麦克风音量振幅，避免淡淡一线
        targetSpeed = 0.2 + amplitude * 0.1
        targetAmplitude = Math.max(0.18, Math.sqrt(amplitude) * 0.95)
        break
      case 'speaking':
        // 说话中：AI 播报声音大小起伏，大幅波动，展现富含生命力的饱满彩虹声波
        targetSpeed = 0.15 + amplitude * 0.08
        targetAmplitude = Math.max(0.25, Math.sqrt(amplitude) * 0.85)
        break
      case 'idle':
      default:
        // 闲置：缓慢悠长的呼吸起伏，有微微彩虹折射
        targetSpeed = 0.03
        targetAmplitude = 0.08
        break
    }

    siriWave.setSpeed(targetSpeed)
    siriWave.setAmplitude(targetAmplitude)
  }, [state, amplitude])

  if (!mounted) return null

  // 根据当前状态计算背后的“情绪光晕（Aura Glow）”渐变色与阴影，实现不同状态颜色的优雅感知
  const getAuraBackground = () => {
    switch (state) {
      case 'connecting':
        // 紫罗兰与靛蓝发光
        return 'from-indigo-600/35 via-purple-600/20 to-transparent shadow-[0_0_35px_rgba(139,92,246,0.35)]'
      case 'listening':
        // 系统青绿与翠绿发光
        return 'from-teal-500/40 via-emerald-500/20 to-transparent shadow-[0_0_35px_rgba(20,184,166,0.4)]'
      case 'speaking':
        // 皇家蓝与洋红发光
        return 'from-blue-600/40 via-pink-500/20 to-transparent shadow-[0_0_40px_rgba(59,130,246,0.45)]'
      case 'idle':
      default:
        // 静止淡灰呼吸
        return 'from-gray-500/15 via-gray-400/5 to-transparent shadow-[0_0_20px_rgba(156,163,175,0.15)] animate-pulse'
    }
  }

  // 默认如果外部未显式传入指定宽高的 className，则使用 size-36 rounded-full 进行兜底
  const hasDimensions =
    className?.includes('w-') || className?.includes('size-')
  const defaultLayoutClass = hasDimensions ? '' : 'size-36 rounded-full'

  return (
    <div
      className={cn(
        'relative flex items-center justify-center select-none overflow-hidden bg-black border border-neutral-900 shadow-2xl',
        defaultLayoutClass,
        className
      )}
    >
      {/* 情绪色彩大光圈层（根据状态改变，提供环境色氛围） */}
      <div
        className={cn(
          'absolute inset-2 bg-gradient-to-tr rounded-full transition-all duration-700 ease-out blur-xl opacity-60 pointer-events-none',
          getAuraBackground()
        )}
      />

      {/* SiriWave canvas 挂载容器 */}
      <div
        ref={containerRef}
        className='absolute inset-0 size-full pointer-events-none z-10 flex items-center justify-center scale-90'
      />
    </div>
  )
}
