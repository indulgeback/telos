import { prisma } from './db.js'
import { safeJsonStringify } from '../utils/json.js'
import { appendRunEvent } from './run-events.js'

export class AgentRunPersistence {
  private stepIndex = 0

  constructor(private readonly runId: string) {}

  async event(type: string, payload: unknown = {}, agentName?: string | null) {
    await appendRunEvent(this.runId, type, payload, agentName)
  }

  async step(
    type: string,
    agentName: string,
    input?: unknown,
    output?: unknown,
    metadata?: unknown
  ) {
    this.stepIndex += 1
    await prisma.agentRunStep.create({
      data: {
        runId: this.runId,
        index: this.stepIndex,
        agentName,
        type,
        input: input === undefined ? undefined : (input as any),
        output: output === undefined ? undefined : (output as any),
        metadata: (metadata ?? {}) as any,
      },
    })
  }

  async complete(finalOutput: string, lastAgentName?: string, lastResponseId?: string) {
    const updated = await prisma.agentRun.updateMany({
      where: {
        id: this.runId,
        status: { not: 'cancelled' },
      },
      data: {
        status: 'completed',
        finalOutput,
        lastAgentName,
        lastResponseId,
        completedAt: new Date(),
      },
    })
    if (updated.count === 0) return false
    await this.event('final', { finalOutput, lastResponseId }, lastAgentName)
    return true
  }

  async fail(error: unknown) {
    const message = error instanceof Error ? error.message : safeJsonStringify(error)
    const updated = await prisma.agentRun.updateMany({
      where: {
        id: this.runId,
        status: { not: 'cancelled' },
      },
      data: {
        status: 'failed',
        error: message,
        completedAt: new Date(),
      },
    })
    if (updated.count === 0) return false
    await this.event('error', { message })
    return true
  }

  async cancel(reason: string) {
    await prisma.agentRun.update({
      where: { id: this.runId },
      data: {
        status: 'cancelled',
        error: reason,
        completedAt: new Date(),
      },
    })
    await this.event('cancelled', { reason })
  }
}

export async function createAgentRun(data: {
  agentId: string
  threadId?: string | null
  input: unknown
  metadata?: unknown
  status?: 'queued' | 'running'
}) {
  return prisma.agentRun.create({
    data: {
      agentId: data.agentId,
      threadId: data.threadId ?? null,
      input: data.input as any,
      metadata: (data.metadata ?? {}) as any,
      status: data.status ?? 'queued',
    },
  })
}
