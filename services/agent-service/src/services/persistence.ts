import { prisma } from './db.js'
import { safeJsonStringify } from '../utils/json.js'

export class AgentRunPersistence {
  private eventSequence = 0
  private stepIndex = 0

  constructor(private readonly runId: string) {}

  async event(type: string, payload: unknown = {}, agentName?: string | null) {
    this.eventSequence += 1
    await prisma.agentRunEvent.create({
      data: {
        runId: this.runId,
        sequence: this.eventSequence,
        type,
        agentName: agentName ?? null,
        payload: payload as any,
      },
    })
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
    await prisma.agentRun.update({
      where: { id: this.runId },
      data: {
        status: 'completed',
        finalOutput,
        lastAgentName,
        lastResponseId,
        completedAt: new Date(),
      },
    })
    await this.event('final', { finalOutput, lastResponseId }, lastAgentName)
  }

  async fail(error: unknown) {
    const message = error instanceof Error ? error.message : safeJsonStringify(error)
    await prisma.agentRun.update({
      where: { id: this.runId },
      data: {
        status: 'failed',
        error: message,
        completedAt: new Date(),
      },
    })
    await this.event('error', { message })
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
}) {
  return prisma.agentRun.create({
    data: {
      agentId: data.agentId,
      threadId: data.threadId ?? null,
      input: data.input as any,
      metadata: (data.metadata ?? {}) as any,
      status: 'running',
    },
  })
}
