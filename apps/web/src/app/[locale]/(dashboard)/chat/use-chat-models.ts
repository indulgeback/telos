import { useEffect, useState } from 'react'
import type { ChatModelOption } from '@/components/organisms'
import { API_BASE_URL } from '@/service/request'
import { normalizeModelProvider } from './chat-types'

export function useChatModels() {
  const [modelOptions, setModelOptions] = useState<ChatModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState('')

  useEffect(() => {
    let disposed = false

    const loadModels = async () => {
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
            provider?: unknown
            isReasoning?: unknown
            supportVision?: unknown
            supportReasoningControl?: unknown
          }>
        }

        const models: ChatModelOption[] = Array.isArray(payload.data)
          ? payload.data
              .filter(
                item =>
                  item &&
                  typeof item.model === 'string' &&
                  item.model.trim() &&
                  typeof item.label === 'string' &&
                  item.label.trim()
              )
              .map(item => ({
                model: item.model as string,
                label: item.label as string,
                provider: normalizeModelProvider(item.provider),
                isReasoning: Boolean(item.isReasoning),
                supportVision: Boolean(item.supportVision),
                supportReasoningControl: Boolean(item.supportReasoningControl),
              }))
          : []

        if (disposed) return
        setModelOptions(models)
        setSelectedModel(prev => {
          if (prev && models.some(item => item.model === prev)) return prev
          return models[0]?.model ?? ''
        })
      } catch (error) {
        console.error('Failed to load chat models', error)
        if (!disposed) {
          setModelOptions([])
          setSelectedModel('')
        }
      }
    }

    void loadModels()
    return () => {
      disposed = true
    }
  }, [])

  return { modelOptions, selectedModel, setSelectedModel }
}
