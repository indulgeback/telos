import { API_BASE_URL } from './request'

// 消息类型
export type MessageRole = 'user' | 'assistant' | 'system'

// 聊天消息接口
export interface ChatMessage {
  role: MessageRole
  content: string
}

// SSE 流式数据格式
export interface StreamChunk {
  content: string
  done?: boolean
}

// 流式响应回调
export type StreamCallback = (chunk: StreamChunk) => void
export type StreamErrorCallback = (error: Error) => void

// Agent 服务类
export class AgentService {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  /**
   * 发送聊天消息（流式响应）
   * @param message 用户消息
   * @param onChunk 接收流式数据的回调
   * @param onError 错误回调
   * @returns 清理函数
   */
  async chatStream(
    message: string,
    onChunk: StreamCallback,
    onError?: StreamErrorCallback
  ): Promise<() => void> {
    const url = `${this.baseURL}/api/agent`
    const controller = new AbortController()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法获取响应流')
      }

      // 读取流式数据
      const readStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              onChunk({ content: '', done: true })
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()

                if (data === '[DONE]') {
                  onChunk({ content: '', done: true })
                  continue
                }

                if (!data) continue

                try {
                  const parsed = JSON.parse(data) as StreamChunk
                  onChunk(parsed)
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            onError?.(error)
          }
        }
      }

      readStream()

      // 返回清理函数
      return () => controller.abort()
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        onError?.(error)
      }
      return () => {}
    }
  }

  /**
   * 发送聊天消息（非流式，简单版本）
   * @param message 用户消息
   * @returns 完整响应
   */
  async chat(message: string): Promise<{ content: string }> {
    const url = `${this.baseURL}/api/agent`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 对于流式响应，收集所有内容
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]' || !data) continue

            try {
              const parsed = JSON.parse(data) as StreamChunk
              fullContent += parsed.content || ''
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    }

    return { content: fullContent }
  }
}

// 导出默认实例
export const agentService = new AgentService()
