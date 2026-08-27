import { prisma } from './db.js'
import { safeJsonStringify } from '../utils/json.js'
import { appendRunEvent, appendRunEventForLease } from './run-events.js'
import { logger } from '../config/index.js'
import { enqueueOutboxEvent } from './outbox.js'
import { hasActiveRunLease, runLeaseWhere, type RunLease } from './run-lease.js'
import {
  claimToolCall,
  completeToolCall,
  failToolCall,
  getToolCall,
  prepareToolCall,
} from './tool-checkpoint.js'

interface CompleteWithAssistantOptions {
  threadId: string
  finalOutput: string
  persistedOutput: string
  parts: unknown
  metadata?: Record<string, unknown>
  replaceAssistantMessageId?: string | null
  lastAgentName?: string
  lastResponseId?: string
}

export class AgentRunPersistence {
  private stepIndex = 0
  private stepIndexInitialization: Promise<void> | null = null

  constructor(
    private readonly runId: string,
    private readonly lease?: RunLease
  ) {}

  get id() {
    return this.runId
  }

  get activeLease() {
    return this.lease
  }

  idempotencyKeyFor(callId: string) {
    return `${this.runId}:${callId}`
  }

  /**
   * Execute one logical SDK tool call behind the durable tool ledger. A
   * completed call replays its stored result; an in-flight/failed call never
   * runs a second external side effect automatically.
   */
  async checkpointToolCall<T>(
    input: {
      callId: string
      toolName: string
      arguments: unknown
      sideEffect: boolean
    },
    execute: (idempotencyKey: string) => Promise<T>
  ): Promise<T> {
    if (!this.lease) return execute(this.idempotencyKeyFor(input.callId))

    const checkpoint = await prepareToolCall(this.lease, {
      ...input,
      idempotencyKey: this.idempotencyKeyFor(input.callId),
    })
    const claim = await claimToolCall(this.lease, checkpoint.id)
    if (claim === 'completed') {
      const completed = await getToolCall(this.lease, checkpoint.id)
      if (!completed || completed.status !== 'completed') {
        throw new Error('Completed tool checkpoint could not be replayed')
      }
      return completed.result as T
    }

    try {
      const result = await execute(checkpoint.idempotencyKey)
      const committed = await completeToolCall(
        this.lease,
        checkpoint.id,
        result === undefined ? null : result
      )
      if (!committed) {
        throw new Error('Run lease was lost while committing tool output')
      }
      return result
    } catch (error) {
      await failToolCall(this.lease, checkpoint.id, error).catch(() => false)
      throw error
    }
  }

  async event(type: string, payload: unknown = {}, agentName?: string | null) {
    if (this.lease) {
      return appendRunEventForLease(this.lease, type, payload, agentName)
    }
    return appendRunEvent(this.runId, type, payload, agentName)
  }

  async step(
    type: string,
    agentName: string,
    input?: unknown,
    output?: unknown,
    metadata?: unknown
  ) {
    if (this.lease && !(await hasActiveRunLease(this.lease))) return false
    this.stepIndexInitialization ??= prisma.agentRunStep
      .aggregate({
        where: { runId: this.runId },
        _max: { index: true },
      })
      .then(result => {
        this.stepIndex = result._max.index ?? 0
      })
    await this.stepIndexInitialization
    const index = ++this.stepIndex
    await prisma.agentRunStep.create({
      data: {
        runId: this.runId,
        attemptId: this.lease?.attemptId,
        index,
        agentName,
        type,
        input: input === undefined ? undefined : (input as any),
        output: output === undefined ? undefined : (output as any),
        metadata: (metadata ?? {}) as any,
      },
    })
  }

  async complete(
    finalOutput: string,
    lastAgentName?: string,
    lastResponseId?: string
  ) {
    const committed = this.lease
      ? await prisma.$transaction(async tx => {
          const fenced = await this.fenceAttempt(tx, 'completed')
          if (!fenced) return false
          const updated = await tx.agentRun.updateMany({
            where: runLeaseWhere(this.lease!, 'completed'),
            data: {
              status: 'completed',
              finalOutput,
              lastAgentName,
              lastResponseId,
              sdkState: null,
              sdkStateHash: null,
              partialOutput: null,
              partialParts: [],
              completedAt: new Date(),
            },
          })
          if (updated.count === 1) {
            await this.enqueueTerminalOutbox(tx, 'completed', {
              finalOutput,
              lastResponseId,
            })
          }
          return updated.count === 1
        })
      : (
          await prisma.$transaction(async tx => {
            const updated = await tx.agentRun.updateMany({
              where: { id: this.runId, status: 'running' },
              data: {
                status: 'completed',
                finalOutput,
                lastAgentName,
                lastResponseId,
                sdkState: null,
                sdkStateHash: null,
                partialOutput: null,
                partialParts: [],
                completedAt: new Date(),
              },
            })
            if (updated.count === 1) {
              await this.enqueueTerminalOutbox(tx, 'completed', {
                finalOutput,
                lastResponseId,
              })
            }
            return updated
          })
        ).count === 1
    if (!committed) return false
    await this.recordTerminalEventBestEffort(
      'final',
      { finalOutput, lastResponseId },
      lastAgentName
    )
    return true
  }

  /**
   * Atomically commits the run terminal state and its assistant message.
   * Redis events are a rebuildable projection and are written after commit.
   */
  async completeWithAssistant(options: CompleteWithAssistantOptions) {
    const result = await prisma.$transaction(async tx => {
      if (this.lease && !(await this.fenceAttempt(tx, 'completed'))) {
        return { completed: false as const, messageId: undefined }
      }
      const updated = await tx.agentRun.updateMany({
        where: this.lease
          ? runLeaseWhere(this.lease, 'completed')
          : { id: this.runId, status: 'running' },
        data: {
          status: 'completed',
          finalOutput: options.finalOutput,
          lastAgentName: options.lastAgentName,
          lastResponseId: options.lastResponseId,
          sdkState: null,
          sdkStateHash: null,
          partialOutput: null,
          partialParts: [],
          completedAt: new Date(),
        },
      })
      if (updated.count === 0) {
        return { completed: false as const, messageId: undefined }
      }

      let message: { id: string } | null = null
      if (options.replaceAssistantMessageId) {
        const existing = await tx.agentMessage.findFirst({
          where: {
            id: options.replaceAssistantMessageId,
            threadId: options.threadId,
            role: 'assistant',
          },
          select: { id: true, metadata: true },
        })
        if (existing) {
          message = await tx.agentMessage.update({
            where: { id: existing.id },
            data: {
              runId: this.runId,
              content: options.persistedOutput,
              parts: (options.parts ?? []) as any,
              metadata: {
                ...(existing.metadata && typeof existing.metadata === 'object'
                  ? (existing.metadata as Record<string, unknown>)
                  : {}),
                ...(options.metadata ?? {}),
              } as any,
            },
            select: { id: true },
          })
        }
      }

      if (!message) {
        const last = await tx.agentMessage.findFirst({
          where: { threadId: options.threadId },
          orderBy: { sequence: 'desc' },
          select: { sequence: true },
        })
        message = await tx.agentMessage.create({
          data: {
            threadId: options.threadId,
            runId: this.runId,
            role: 'assistant',
            content: options.persistedOutput,
            parts: (options.parts ?? []) as any,
            metadata: (options.metadata ?? {}) as any,
            sequence: (last?.sequence ?? 0) + 1,
          },
          select: { id: true },
        })
      }

      await tx.agentThread.update({
        where: { id: options.threadId },
        data: { lastMessageAt: new Date() },
      })
      await this.enqueueTerminalOutbox(tx, 'completed', {
        finalOutput: options.finalOutput,
        lastResponseId: options.lastResponseId,
      })

      return { completed: true as const, messageId: message.id }
    })

    if (result.completed) {
      await this.recordTerminalEventBestEffort(
        'final',
        {
          finalOutput: options.finalOutput,
          lastResponseId: options.lastResponseId,
        },
        options.lastAgentName
      )
    }
    return result
  }

  async fail(error: unknown) {
    const message =
      error instanceof Error ? error.message : safeJsonStringify(error)
    const committed = this.lease
      ? await prisma.$transaction(async tx => {
          const fenced = await this.fenceAttempt(tx, 'failed')
          if (!fenced) return false
          const updated = await tx.agentRun.updateMany({
            where: runLeaseWhere(this.lease!, 'failed'),
            data: {
              status: 'failed',
              error: message,
              sdkState: null,
              sdkStateHash: null,
              partialOutput: null,
              partialParts: [],
              completedAt: new Date(),
            },
          })
          if (updated.count === 1) {
            await this.enqueueTerminalOutbox(tx, 'failed', { error: message })
          }
          return updated.count === 1
        })
      : (
          await prisma.$transaction(async tx => {
            const updated = await tx.agentRun.updateMany({
              where: { id: this.runId, status: 'running' },
              data: {
                status: 'failed',
                error: message,
                sdkState: null,
                sdkStateHash: null,
                partialOutput: null,
                partialParts: [],
                completedAt: new Date(),
              },
            })
            if (updated.count === 1) {
              await this.enqueueTerminalOutbox(tx, 'failed', { error: message })
            }
            return updated
          })
        ).count === 1
    if (!committed) return false
    await this.recordTerminalEventBestEffort('error', { message })
    return true
  }

  async cancel(reason: string) {
    const committed = this.lease
      ? await prisma.$transaction(async tx => {
          const fenced = await this.fenceAttempt(tx, 'failed')
          if (!fenced) return false
          const updated = await tx.agentRun.updateMany({
            where: runLeaseWhere(this.lease!, 'failed'),
            data: {
              status: 'cancelled',
              error: reason,
              sdkState: null,
              sdkStateHash: null,
              partialOutput: null,
              partialParts: [],
              completedAt: new Date(),
            },
          })
          if (updated.count === 1) {
            await this.enqueueTerminalOutbox(tx, 'cancelled', { reason })
          }
          return updated.count === 1
        })
      : (
          await prisma.$transaction(async tx => {
            const now = new Date()
            const updated = await tx.agentRun.updateMany({
              where: {
                id: this.runId,
                status: { in: ['queued', 'running', 'awaiting_approval'] },
              },
              data: {
                status: 'cancelled',
                error: reason,
                sdkState: null,
                sdkStateHash: null,
                partialOutput: null,
                partialParts: [],
                completedAt: now,
              },
            })
            if (updated.count === 1) {
              await tx.agentRunAttempt.updateMany({
                where: { runId: this.runId, status: 'running' },
                data: { status: 'cancelled', completedAt: now },
              })
              await tx.agentToolApproval.updateMany({
                where: { runId: this.runId, status: 'pending' },
                data: { status: 'denied', decidedAt: now },
              })
              await tx.agentToolCall.updateMany({
                where: { runId: this.runId, status: 'pending_approval' },
                data: { status: 'denied', error: reason },
              })
              await this.enqueueTerminalOutbox(tx, 'cancelled', { reason })
            }
            return updated
          })
        ).count === 1
    if (!committed) return false
    await this.recordTerminalEventBestEffort('cancelled', { reason })
    return true
  }

  private async recordTerminalEventBestEffort(
    type: string,
    payload: unknown,
    agentName?: string | null
  ) {
    try {
      await this.event(type, payload, agentName)
    } catch (error) {
      logger.warn({
        msg: 'Unable to append terminal run trace event',
        runId: this.runId,
        type,
        error,
      })
    }
  }

  private enqueueTerminalOutbox(tx: any, status: string, payload: unknown) {
    return enqueueOutboxEvent(tx, {
      aggregateType: 'agent_run',
      aggregateId: this.runId,
      eventType: `agent_run.${status}`,
      dedupeKey: `agent-run:${this.runId}:terminal:${status}`,
      payload: { runId: this.runId, ...((payload ?? {}) as object) },
    })
  }

  private async fenceAttempt(
    tx: any,
    status: Exclude<'completed' | 'failed' | 'expired', 'expired'>
  ) {
    if (!this.lease) return true
    const updated = await tx.agentRunAttempt.updateMany({
      where: {
        id: this.lease.attemptId,
        runId: this.runId,
        leaseToken: this.lease.leaseToken,
        fenceToken: this.lease.fenceToken,
        status: 'running',
        leaseExpiresAt: { gt: new Date() },
        run: { status: 'running' },
      },
      data: { status, completedAt: new Date() },
    })
    return updated.count === 1
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
