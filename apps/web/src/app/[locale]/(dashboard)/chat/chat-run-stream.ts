import { API_BASE_URL } from '@/service/request'
import { agentService } from '@/service/agent'
import { parseUiMessageStreamChunk } from './chat-plan-utils'
import type {
  AgentStreamChunk,
  RunStreamEnd,
  RunStreamResult,
} from './chat-types'

export const waitForRunStreamRetry = (delayMs: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    signal.addEventListener('abort', onAbort, { once: true })
  })

/**
 * Consume a durable run stream with cursor-based reconnects. The server may
 * deliberately close a slow SSE consumer once its bounded buffer fills; the
 * Redis sequence lets the browser resume without losing or duplicating UI
 * events.
 */
export async function consumeAgentRunStream(
  runId: string,
  signal: AbortSignal,
  onChunk: (chunk: AgentStreamChunk) => void,
  initialCursor = ''
): Promise<RunStreamResult> {
  let cursor = initialCursor
  let consecutiveFailures = 0

  while (!signal.aborted) {
    const query = cursor ? `?after=${encodeURIComponent(cursor)}` : ''
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/runs/${runId}/stream${query}`,
        { credentials: 'include', signal }
      )
      if (!response.ok) {
        throw new Error(`Run stream failed: ${response.status}`)
      }
      if (!response.body) throw new Error('Run stream response is empty')

      consecutiveFailures = 0
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let end: RunStreamEnd | null = null

      const consumeLine = (line: string) => {
        if (!line.startsWith('data:')) return
        const chunk = parseUiMessageStreamChunk(line.slice(5))
        if (!chunk) return
        if (typeof chunk.sequence === 'string' && chunk.sequence) {
          cursor = chunk.sequence
        }
        onChunk(chunk)
        if (
          chunk.type === 'response.completed' ||
          chunk.type === 'response.failed'
        ) {
          end = 'terminal'
        } else if (chunk.type === 'response.tool_approval.required') {
          end = 'awaiting_approval'
        }
      }

      while (!end) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const frames = buffer.split(/\n\n/)
        buffer = frames.pop() ?? ''
        frames.forEach(frame => frame.split(/\n/).forEach(consumeLine))
      }
      if (!end && buffer.trim()) buffer.split(/\n/).forEach(consumeLine)
      if (end) return { end, cursor }

      const run = await agentService.getRun(runId)
      if (
        run.status === 'completed' ||
        run.status === 'failed' ||
        run.status === 'cancelled'
      ) {
        return { end: 'terminal', cursor }
      }
      if (run.status === 'awaiting_approval') {
        return { end: 'awaiting_approval', cursor }
      }
      await waitForRunStreamRetry(250, signal)
    } catch (error) {
      if (signal.aborted) throw error
      consecutiveFailures += 1
      if (consecutiveFailures > 5) throw error
      await waitForRunStreamRetry(
        Math.min(2_000, 200 * 2 ** (consecutiveFailures - 1)),
        signal
      )
    }
  }
  throw new DOMException('Aborted', 'AbortError')
}
