import { prisma } from './db.js'
import {
  validatePlanInput,
  type PlanStepStatus,
  type StructuredPlan,
} from './plan-tools.js'

export type PersistedPlanStatus =
  'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'

export interface PersistedPlanRecord extends StructuredPlan {
  messageId: string
  threadId: string
  status: PersistedPlanStatus
  stepStatuses: PlanStepStatus[]
  executionRunId?: string
}

export class PlanStateError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 = 409
  ) {
    super(message)
    this.name = 'PlanStateError'
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeStepStatuses(
  value: unknown,
  stepCount: number
): PlanStepStatus[] {
  const allowed = new Set<PlanStepStatus>([
    'pending',
    'in_progress',
    'completed',
    'skipped',
    'failed',
  ])
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: stepCount }, (_, index) => {
    const status = source[index]
    return typeof status === 'string' && allowed.has(status as PlanStepStatus)
      ? (status as PlanStepStatus)
      : 'pending'
  })
}

function findPlanPart(parts: unknown) {
  const list = Array.isArray(parts) ? parts : []
  const index = list.findIndex(part => asRecord(part).type === 'plan')
  if (index === -1) return null
  const part = asRecord(list[index])
  const plan = asRecord(part.plan ?? part)
  const structured = validatePlanInput({
    summary: plan.summary,
    steps: plan.steps,
  })
  const rawStatus = String(plan.status ?? 'pending')
  const status: PersistedPlanStatus = [
    'pending',
    'approved',
    'rejected',
    'executing',
    'completed',
    'failed',
  ].includes(rawStatus)
    ? (rawStatus as PersistedPlanStatus)
    : 'pending'
  return {
    list,
    index,
    part,
    plan,
    structured,
    status,
    stepStatuses: normalizeStepStatuses(
      plan.stepStatuses,
      structured.steps.length
    ),
  }
}

async function loadOwnedPlanMessage(messageId: string, ownerId: string) {
  const message = await prisma.agentMessage.findFirst({
    where: { id: messageId, role: 'assistant', thread: { ownerId } },
    select: { id: true, threadId: true, parts: true },
  })
  if (!message) throw new PlanStateError('Plan message not found', 404)
  const parsed = findPlanPart(message.parts)
  if (!parsed) throw new PlanStateError('Message does not contain a plan', 404)
  return { message, parsed }
}

function replacePlanPart(
  parsed: NonNullable<ReturnType<typeof findPlanPart>>,
  updates: Record<string, unknown>
) {
  const next = [...parsed.list]
  next[parsed.index] = {
    ...parsed.part,
    plan: {
      ...parsed.plan,
      ...updates,
      updatedAt: new Date().toISOString(),
    },
  }
  return next
}

function toRecord(
  message: { id: string; threadId: string },
  parsed: NonNullable<ReturnType<typeof findPlanPart>>,
  overrides: Partial<PersistedPlanRecord> = {}
): PersistedPlanRecord {
  return {
    messageId: message.id,
    threadId: message.threadId,
    ...parsed.structured,
    status: parsed.status,
    stepStatuses: parsed.stepStatuses,
    ...(typeof parsed.plan.executionRunId === 'string'
      ? { executionRunId: parsed.plan.executionRunId }
      : {}),
    ...overrides,
  }
}

export async function decidePlan(
  messageId: string,
  ownerId: string,
  decision: 'approved' | 'rejected'
): Promise<PersistedPlanRecord> {
  const { message, parsed } = await loadOwnedPlanMessage(messageId, ownerId)
  if (parsed.status !== 'pending' && parsed.status !== decision) {
    throw new PlanStateError(
      `Plan is already ${parsed.status} and cannot be ${decision}`
    )
  }
  if (parsed.status !== decision) {
    await prisma.agentMessage.update({
      where: { id: message.id },
      data: {
        parts: replacePlanPart(parsed, { status: decision }) as any,
      },
    })
  }
  return toRecord(message, parsed, { status: decision })
}

export async function resolveApprovedPlanForExecution(
  messageId: string,
  ownerId: string,
  expectedThreadId?: string | null
): Promise<PersistedPlanRecord> {
  const { message, parsed } = await loadOwnedPlanMessage(messageId, ownerId)
  if (expectedThreadId && message.threadId !== expectedThreadId) {
    throw new PlanStateError('Plan does not belong to this thread')
  }
  if (parsed.status !== 'approved') {
    throw new PlanStateError(`Plan is ${parsed.status}, not approved`)
  }
  return toRecord(message, parsed)
}

export async function markPlanExecutionStarted(
  messageId: string,
  ownerId: string,
  runId: string
): Promise<PersistedPlanRecord> {
  const { message, parsed } = await loadOwnedPlanMessage(messageId, ownerId)
  const existingRunId =
    typeof parsed.plan.executionRunId === 'string'
      ? parsed.plan.executionRunId
      : undefined
  if (
    parsed.status !== 'approved' &&
    !(parsed.status === 'executing' && existingRunId === runId)
  ) {
    throw new PlanStateError(`Plan is already ${parsed.status}`)
  }
  const stepStatuses = normalizeStepStatuses(
    parsed.plan.stepStatuses,
    parsed.structured.steps.length
  )
  await prisma.agentMessage.update({
    where: { id: message.id },
    data: {
      parts: replacePlanPart(parsed, {
        status: 'executing',
        executionRunId: runId,
        stepStatuses,
      }) as any,
    },
  })
  return toRecord(message, parsed, {
    status: 'executing',
    executionRunId: runId,
    stepStatuses,
  })
}

export async function loadPlanExecution(
  messageId: string,
  runId: string
): Promise<{ stepStatuses: PlanStepStatus[] } | null> {
  const message = await prisma.agentMessage.findUnique({
    where: { id: messageId },
    select: { parts: true },
  })
  if (!message) return null
  const parsed = findPlanPart(message.parts)
  if (!parsed || parsed.plan.executionRunId !== runId) return null
  return { stepStatuses: parsed.stepStatuses }
}

export async function persistPlanExecution(
  messageId: string,
  runId: string,
  stepStatuses: PlanStepStatus[],
  terminalStatus?: 'completed' | 'failed'
): Promise<void> {
  const message = await prisma.agentMessage.findUnique({
    where: { id: messageId },
    select: { parts: true },
  })
  if (!message) return
  const parsed = findPlanPart(message.parts)
  if (!parsed || parsed.plan.executionRunId !== runId) return
  await prisma.agentMessage.update({
    where: { id: messageId },
    data: {
      parts: replacePlanPart(parsed, {
        status: terminalStatus ?? 'executing',
        stepStatuses: normalizeStepStatuses(
          stepStatuses,
          parsed.structured.steps.length
        ),
      }) as any,
    },
  })
}
