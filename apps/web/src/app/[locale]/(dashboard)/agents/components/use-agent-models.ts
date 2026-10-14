'use client'

import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/service/request'

export interface AgentModelOption {
  model: string
  label: string
}

/**
 * 拉取启用的模型目录(/api/agent/models)。
 * 失败时返回空列表,调用方应回退为自由文本输入,不要把用户锁死。
 */
export function useAgentModels() {
  const [models, setModels] = useState<AgentModelOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let disposed = false
    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/agent/models`, {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(`Load models failed: ${response.status}`)
        }
        const payload = (await response.json()) as {
          data?: Array<{
            model?: unknown
            label?: unknown
          }>
        }
        const list = (Array.isArray(payload.data) ? payload.data : [])
          .filter(
            (item): item is { model: string; label: string } =>
              Boolean(item?.model) && Boolean(item?.label)
          )
          .map(item => ({ model: item.model, label: item.label }))
        if (!disposed) setModels(list)
      } catch {
        if (!disposed) setModels([])
      } finally {
        if (!disposed) setLoading(false)
      }
    })()
    return () => {
      disposed = true
    }
  }, [])

  return { models, loading }
}
