'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownContent } from './markdown-content'
import {
  nextCursor,
  splitForRender,
} from '@/app/[locale]/(dashboard)/chat/stream-reveal'

interface StreamRevealTextProps {
  /** 已接收的完整文本（含未显示的缓冲） */
  text: string
  /** 是否仍在流式输出 */
  active: boolean
  className?: string
}

/**
 * 流式缓冲队列 + 逐字淡入：
 * - 25ms/tick 释放字符，新字符 250ms 淡入，形成柔和尾部
 * - 已完成的行交给 MarkdownContent 正常渲染（每 tick 重渲染的只有纯文本尾部）
 * - 代码围栏未闭合时整块按 Markdown 渐进，不做逐字动画
 * - 排空完毕后合并回普通 Markdown（获得完整的表格/高亮等最终渲染）
 * - prefers-reduced-motion: 跳过动画直接显示
 */
export function StreamRevealText({
  text,
  active,
  className,
}: StreamRevealTextProps) {
  const [cursor, setCursor] = useState(0)
  const cursorRef = useRef(0)
  const textRef = useRef(text)
  const activeRef = useRef(active)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    textRef.current = text
    activeRef.current = active
  }, [text, active])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = media.matches
    const listener = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (reducedMotionRef.current) {
        cursorRef.current = textRef.current.length
        setCursor(cursorRef.current)
        return
      }
      const { cursor: next, done } = nextCursor(
        textRef.current.length,
        cursorRef.current,
        activeRef.current
      )
      cursorRef.current = next
      setCursor(next)
      if (done) {
        window.clearInterval(timer)
      }
    }, 25)
    return () => window.clearInterval(timer)
  }, [])

  const done = cursor >= text.length && !active
  const split = useMemo(() => splitForRender(text, cursor), [text, cursor])

  if (done || split.markdownOnly) {
    return (
      <div className={className}>
        <MarkdownContent
          content={text.slice(0, Math.min(cursor, text.length))}
        />
        {active && <StreamCaret />}
      </div>
    )
  }

  return (
    <div className={className}>
      {split.head && <MarkdownContent content={split.head} />}
      <span className='whitespace-pre-wrap break-words text-[14px] leading-7'>
        {split.tailStatic}
        {Array.from(split.tailFade).map((char, offset) => (
          <span key={split.fadeStartInTail + offset} className='stream-char'>
            {char}
          </span>
        ))}
        {active && <StreamCaret />}
      </span>
    </div>
  )
}

function StreamCaret() {
  return (
    <span
      data-stream-caret='beautiful-ui'
      className='chat-stream-caret ml-0.5'
      aria-hidden='true'
    />
  )
}
