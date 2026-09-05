import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getRun } = vi.hoisted(() => ({ getRun: vi.fn() }))

vi.mock('@/service/agent', () => ({ agentService: { getRun } }))

import { consumeAgentRunStream } from './chat-run-stream'

const streamResponse = (...events: string[]) => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(events.join('')))
      controller.close()
    },
  })
  return new Response(body, { status: 200 })
}

const event = (payload: Record<string, unknown>) =>
  `data: ${JSON.stringify(payload)}\n\n`

describe('consumeAgentRunStream', () => {
  beforeEach(() => {
    getRun.mockReset()
    vi.restoreAllMocks()
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
    })
  })

  it('reconnects from the latest cursor and forwards each server event once', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        streamResponse(event({ type: 'turn.delta', sequence: '1' }))
      )
      .mockResolvedValueOnce(
        streamResponse(
          event({ type: 'turn.delta', sequence: '2' }),
          event({ type: 'response.completed', sequence: '3' })
        )
      )
    getRun.mockResolvedValue({ status: 'running' })
    const chunks: string[] = []

    await expect(
      consumeAgentRunStream('run-1', new AbortController().signal, chunk => {
        chunks.push(chunk.sequence ?? '')
      })
    ).resolves.toEqual({ end: 'terminal', cursor: '3' })

    expect(chunks).toEqual(['1', '2', '3'])
    expect(fetchMock.mock.calls[1]?.[0]).toContain(
      '/api/runs/run-1/stream?after=1'
    )
  })

  it('rejects immediately when the caller has already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      consumeAgentRunStream('run-2', controller.signal, () => undefined)
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
