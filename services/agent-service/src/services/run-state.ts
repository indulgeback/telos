import { parseApprovedPlan, type StructuredPlan } from './plan-tools.js'

const TERMINAL_RUN_STATUSES = new Set(['completed', 'failed', 'cancelled'])

export interface PersistedRunSnapshot {
  id: string
  agentId: string
  threadId: string | null
  status: string
  input: unknown
  metadata: unknown
  sdkState?: string | null
  sdkStateHash?: string | null
  stateVersion?: number | null
  partialOutput?: string | null
  partialParts?: unknown
  thread: { ownerId: string | null } | null
}

export interface CanonicalRunExecutionData {
  runId: string
  agentId: string
  threadId: string
  ownerId: string
  input: string
  modelOverride: string | null
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high' | null
  planMode?: 'plan' | 'execute'
  approvedPlan: StructuredPlan | null
  approvedPlanMessageId?: string
  forceSkillName?: string
  replaceAssistantMessageId: string | null
  userId: string
  /** Serialized Agents SDK RunState for an approval resume; never client input. */
  resumeState?: string
  resumeStateHash?: string
  stateVersion?: number
  partialOutput?: string | null
  partialParts?: unknown
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function asStructuredPlan(value: unknown): StructuredPlan | null {
  try {
    return parseApprovedPlan(value)
  } catch {
    return null
  }
}

/**
 * Rebuild worker input from the persisted run. BullMQ payloads carry only the
 * opaque run id across the trust boundary; executable parameters come from DB.
 */
export function canonicalizeRunExecution(
  run: PersistedRunSnapshot
): CanonicalRunExecutionData | null {
  if (!run.threadId || !run.thread?.ownerId) return null

  const input = asRecord(run.input)
  const metadata = asRecord(run.metadata)
  const effectiveInput =
    typeof input.effectiveInput === 'string'
      ? input.effectiveInput
      : typeof input.input === 'string'
        ? input.input
        : ''
  if (!effectiveInput.trim()) return null

  const reasoningEffort =
    input.reasoningEffort === 'minimal' ||
    input.reasoningEffort === 'low' ||
    input.reasoningEffort === 'medium' ||
    input.reasoningEffort === 'high'
      ? input.reasoningEffort
      : null
  const planMode =
    input.planMode === 'plan' || input.planMode === 'execute'
      ? input.planMode
      : undefined
  const approvedPlan = asStructuredPlan(metadata.approvedPlan)
  if (planMode === 'execute' && !approvedPlan) return null
  const approvedPlanMessageId =
    typeof metadata.approvedPlanMessageId === 'string' &&
    metadata.approvedPlanMessageId.trim()
      ? metadata.approvedPlanMessageId
      : undefined
  if (planMode === 'execute' && !approvedPlanMessageId) return null

  return {
    runId: run.id,
    agentId: run.agentId,
    threadId: run.threadId,
    ownerId: run.thread.ownerId,
    input: effectiveInput,
    modelOverride:
      typeof input.model === 'string' && input.model.trim()
        ? input.model
        : null,
    reasoningEffort,
    planMode,
    approvedPlan,
    approvedPlanMessageId,
    forceSkillName:
      typeof metadata.forceSkillName === 'string'
        ? metadata.forceSkillName
        : undefined,
    replaceAssistantMessageId:
      typeof metadata.replaceAssistantMessageId === 'string'
        ? metadata.replaceAssistantMessageId
        : null,
    userId: run.thread.ownerId,
    ...(typeof run.sdkState === 'string' && run.sdkState
      ? {
          resumeState: run.sdkState,
          resumeStateHash: run.sdkStateHash ?? '',
          stateVersion: run.stateVersion ?? 0,
          partialOutput: run.partialOutput ?? null,
          partialParts: run.partialParts ?? [],
        }
      : {}),
  }
}

export function isTerminalRunStatus(status: string) {
  return TERMINAL_RUN_STATUSES.has(status)
}

/** A terminal run is never eligible for execution again. */
export function canStartRun(status: string) {
  return status === 'queued'
}

/** A second delivery of a `running` row cannot safely replay external tools. */
export function isUnsafeRunRedelivery(status: string) {
  return status === 'running'
}

/** Only an actually active BullMQ job proves a DB `running` run is live. */
export function canRecoverRunningRun(queueState: string | null) {
  return queueState === 'active'
}
