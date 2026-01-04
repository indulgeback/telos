'use client'

import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react'
import { cn } from '@/lib/utils'
import type { TeleprompterProps } from './types'

/**
 * 提词器组件
 *
 * 显示带有边缘渐变效果的滚动文本
 * 使用 background-clip: text 实现文字渐变效果
 * 支持录制时自动滚动和手动重置
 */

export interface TeleprompterRef {
  reset: () => void
}

const Teleprompter = forwardRef<TeleprompterRef, TeleprompterProps>(
  (
    {
      text,
      isScrolling,
      scrollSpeed = 50, // 每秒像素数
      onScrollEnd,
      onReset,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const animationFrameRef = useRef<number | null>(null)
    const lastTimeRef = useRef<number>(0)
    const scrollPositionRef = useRef<number>(0)
    const isScrollingRef = useRef(isScrolling)

    // 保持 isScrolling ref 同步
    useEffect(() => {
      isScrollingRef.current = isScrolling
    }, [isScrolling])

    /** 重置滚动位置到开头 */
    const reset = useCallback(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0
        scrollPositionRef.current = 0
      }
      onReset?.()
    }, [onReset])

    // 通过 ref 暴露 reset 方法
    useImperativeHandle(ref, () => ({
      reset,
    }))

    /** 根据 isScrolling 属性启动/停止自动滚动 */
    useEffect(() => {
      /** 自动滚动的动画循环 */
      const animate = (timestamp: number) => {
        if (!containerRef.current || !contentRef.current) return
        if (!isScrollingRef.current) return

        // 在第一帧初始化 lastTime
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = timestamp
        }

        // 计算时间增量（秒）
        const deltaTime = (timestamp - lastTimeRef.current) / 1000
        lastTimeRef.current = timestamp

        // 计算滚动增量
        const scrollIncrement = scrollSpeed * deltaTime
        scrollPositionRef.current += scrollIncrement

        // 应用滚动位置
        containerRef.current.scrollTop = scrollPositionRef.current

        // 检查是否到达末尾
        const maxScroll =
          containerRef.current.scrollHeight - containerRef.current.clientHeight

        if (scrollPositionRef.current >= maxScroll) {
          // 到达末尾
          scrollPositionRef.current = maxScroll
          containerRef.current.scrollTop = maxScroll
          onScrollEnd?.()
          return
        }

        // 继续动画
        animationFrameRef.current = requestAnimationFrame(animate)
      }

      if (isScrolling) {
        // 开始时重置 lastTime
        lastTimeRef.current = 0
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // 暂停滚动
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = null
        }
      }

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }, [isScrolling, scrollSpeed, onScrollEnd])

    return (
      <div className='relative w-full'>
        {/* 可滚动文本容器 - 使用 mask 实现边缘渐变 */}
        <div
          ref={containerRef}
          className={cn('h-48 overflow-hidden px-4', 'scrollbar-hide')}
          style={{
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
          }}
        >
          {/* 顶部空白区域，让第一句话初始在中间 */}
          <div className='h-24' aria-hidden='true' />
          <div
            ref={contentRef}
            className={cn(
              'text-center text-4xl leading-normal text-white max-w-3xl mx-auto',
              'whitespace-pre-wrap'
            )}
          >
            {text}
          </div>
          {/* 底部空白区域，让最后一句话能滚动到中间 */}
          <div className='h-24' aria-hidden='true' />
        </div>
      </div>
    )
  }
)

Teleprompter.displayName = 'Teleprompter'

export { Teleprompter }
