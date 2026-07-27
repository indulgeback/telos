import { EventEmitter } from 'node:events'
import { prisma } from './db.js'

type RunEventListener = (event: Awaited<ReturnType<typeof appendRunEvent>>) => void

const bus = new EventEmitter()
const sequenceLocks = new Map<string, Promise<unknown>>()

async function withRunEventLock<T>(runId: string, task: () => Promise<T>) {
  const previous = sequenceLocks.get(runId) ?? Promise.resolve()
  let release: () => void = () => undefined
  const current = new Promise<void>(resolve => {
    release = resolve
  })
  const chained = previous.then(() => current, () => current)
  sequenceLocks.set(runId, chained)

  try {
    await previous.catch(() => undefined)
    return await task()
  } finally {
    release()
    if (sequenceLocks.get(runId) === chained) {
      sequenceLocks.delete(runId)
    }
  }
}

export async function appendRunEvent(
  runId: string,
  type: string,
  payload: unknown = {},
  agentName?: string | null
) {
  const event = await withRunEventLock(runId, async () => {
    const last = await prisma.agentRunEvent.findFirst({
      where: { runId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    })

    return prisma.agentRunEvent.create({
      data: {
        runId,
        sequence: (last?.sequence ?? 0) + 1,
        type,
        agentName: agentName ?? null,
        payload: payload as any,
      },
    })
  })

  bus.emit(runId, event)
  return event
}

export async function appendRunUiEvent(
  runId: string,
  type: string,
  payload: Record<string, unknown>
) {
  return appendRunEvent(runId, type, { ...payload, type })
}

export function subscribeRunEvents(runId: string, listener: RunEventListener) {
  bus.on(runId, listener)
  return () => bus.off(runId, listener)
}
