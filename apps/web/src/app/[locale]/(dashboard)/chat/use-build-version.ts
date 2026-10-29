'use client'

import { useCallback, useEffect, useRef } from 'react'

interface UseBuildVersionOptions {
  /**
   * 为 true 时（流式输出 / 实时语音等进行中），即使检测到新版本也先挂起，
   * 空闲后再弹；页面已损坏（chunk 加载失败）时无视该开关立即弹。
   */
  defer?: boolean
  /** 检测到新版本时回调；mandatory=true 表示页面已损坏必须刷新 */
  onNotify: (payload: { mandatory: boolean }) => void
}

const CHUNK_ERROR_PATTERN =
  /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module/i

/**
 * 新版本发布检测：
 * 构建时注入 NEXT_PUBLIC_BUILD_ID，运行期轮询 /api/build-id（no-store）+
 * 标签页回前台 + chunk 加载失败三个触发源比对，发现新版本回调一次。
 * 回调后不再重复提醒（用户刷新后自然重置）。
 */
export function useBuildVersion({ defer, onNotify }: UseBuildVersionOptions) {
  // 构建时内联进 bundle 的版本；为空（本地 dev）则整个检测不启用
  const localBuildId = process.env.NEXT_PUBLIC_BUILD_ID || null
  const pendingRef = useRef<null | 'normal' | 'mandatory'>(null)
  const notifiedRef = useRef(false)
  const deferRef = useRef(defer)
  const onNotifyRef = useRef(onNotify)
  useEffect(() => {
    deferRef.current = defer
    onNotifyRef.current = onNotify
  }, [defer, onNotify])

  const flush = useCallback(() => {
    if (notifiedRef.current || !pendingRef.current) return
    // 页面已损坏（mandatory）无视 defer 立即弹；普通提示等 defer 解除
    if (deferRef.current && pendingRef.current !== 'mandatory') return
    notifiedRef.current = true
    onNotifyRef.current({ mandatory: pendingRef.current === 'mandatory' })
  }, [])

  const check = useCallback(async () => {
    if (notifiedRef.current || !localBuildId) return
    try {
      const res = await fetch('/api/build-id', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { buildId?: string | null }
      if (!data.buildId) return
      if (data.buildId !== localBuildId) {
        pendingRef.current = pendingRef.current ?? 'normal'
        flush()
      }
    } catch {
      // 网络失败静默，下个触发源再试
    }
  }, [localBuildId, flush])

  // 轮询 + 回前台触发
  useEffect(() => {
    if (!localBuildId) return
    void check()
    const interval = window.setInterval(() => void check(), 3 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [localBuildId, check])

  // chunk 加载失败 = 旧 bundle 已损坏（新版本删掉了旧 chunk），必须立即刷新
  useEffect(() => {
    if (!localBuildId) return
    const handler = (event: Event) => {
      const reason =
        (event as PromiseRejectionEvent).reason ??
        (event as ErrorEvent).message ??
        ''
      if (!CHUNK_ERROR_PATTERN.test(String(reason))) return
      pendingRef.current = 'mandatory'
      notifiedRef.current = false
      flush()
    }
    window.addEventListener('unhandledrejection', handler)
    window.addEventListener('error', handler)
    return () => {
      window.removeEventListener('unhandledrejection', handler)
      window.removeEventListener('error', handler)
    }
  }, [localBuildId, flush])
}
