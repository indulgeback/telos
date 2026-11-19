import Redis from 'ioredis'
import { prisma } from './db.js'
import { config, logger } from '../config/index.js'
import { createAgentRun } from './persistence.js'
import { enqueueAgentRun } from './run-queue.js'
import { agentSessionService } from './session.js'
import { asRecord } from '../utils/json.js'

export const SETTLEMENT_OUTPUT_LIMIT_BYTES = 8 * 1024
export const SETTLEMENT_LOCK_TTL_SECONDS = 7 * 24 * 3600
export const FOLLOWUP_DEBOUNCE_TTL_SECONDS = 10

/**
 * 子任务终态通知（仿 deepseek-harness settlement notice）。
 * completed 带最终答案；failed/cancelled 用可行动的文案，父 agent 能区分
 * “做完”与“没做成”。超长输出按字节预算截断（slice 上限取保守字符数，
 * CJK 3 字节/字符，2000 字符 ≤ 6KB < 8KB，不会越过预算）。
 */
export function buildSettlementMessage(params: {
  status: 'completed' | 'failed' | 'cancelled'
  label: string
  finalOutput?: string | null
  error?: string | null
}): string {
  const label = params.label || '未命名子任务'
  if (params.status === 'completed') {
    const raw = (params.finalOutput ?? '').trim()
    if (!raw) {
      return `↳ [子任务完成] ${label}：\n子任务已完成，但没有产出文本结果。`
    }
    const truncated =
      Buffer.byteLength(raw, 'utf8') > SETTLEMENT_OUTPUT_LIMIT_BYTES
    const body = truncated ? raw.slice(0, 2000) : raw
    return (
      `↳ [子任务完成] ${label}：\n${body}` +
      (truncated ? '\n…（结果过长已截断，完整过程见子任务会话）' : '')
    )
  }
  if (params.status === 'failed') {
    const reason = (params.error ?? '').trim() || '原因未知'
    return `↳ [子任务失败] ${label} 未能完成：${reason}。你可以调整任务后重新派生。`
  }
  return `↳ [子任务中止] ${label} 在完成前被停止。`
}

export interface SettlementRunRow {
  id: string
  agentId: string
  threadId: string | null
  parentRunId: string | null
  status: string
  finalOutput: string | null
  error: string | null
  metadata: Record<string, unknown>
}

export interface SettlementDeps {
  findRunById(id: string): Promise<SettlementRunRow | null>
  appendUserMessage(threadId: string, text: string): Promise<unknown>
  createAgentRun(data: {
    agentId: string
    threadId: string
    input: unknown
    metadata: unknown
  }): Promise<{ id: string }>
  enqueueAgentRun(data: { runId: string }): Promise<unknown>
  hasActiveRunOnThread(threadId: string): Promise<boolean>
  countTerminalChildren(parentRunId: string): Promise<number>
  acquireLock(key: string): Promise<boolean>
  releaseLock(key: string): Promise<void>
  logger: Pick<typeof logger, 'warn' | 'error'>
}

let settlementRedis: Redis | null = null
function getSettlementRedis() {
  if (!settlementRedis) {
    settlementRedis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
    })
  }
  return settlementRedis
}

async function acquireSettlementLock(key: string): Promise<boolean> {
  try {
    const result = await getSettlementRedis().set(
      key,
      '1',
      'EX',
      key.startsWith('settlement:')
        ? SETTLEMENT_LOCK_TTL_SECONDS
        : FOLLOWUP_DEBOUNCE_TTL_SECONDS,
      'NX'
    )
    return result === 'OK'
  } catch (error) {
    logger.warn({
      msg: 'Settlement lock check failed; treating as acquired',
      key,
      error,
    })
    // Redis 不可用时放行：通知重复远比通知丢失可接受。
    return true
  }
}

async function releaseSettlementLock(key: string): Promise<void> {
  try {
    await getSettlementRedis().del(key)
  } catch (error) {
    logger.warn({ msg: 'Settlement lock release failed', key, error })
  }
}

export function defaultSettlementDeps(): SettlementDeps {
  return {
    async findRunById(id) {
      return (await prisma.agentRun.findUnique({
        where: { id },
        select: {
          id: true,
          agentId: true,
          threadId: true,
          parentRunId: true,
          status: true,
          finalOutput: true,
          error: true,
          metadata: true,
        },
      })) as unknown as SettlementRunRow | null
    },
    appendUserMessage(threadId, text) {
      return agentSessionService.appendUserMessage(threadId, text)
    },
    createAgentRun(data) {
      return createAgentRun(data)
    },
    enqueueAgentRun(data) {
      return enqueueAgentRun(data as any)
    },
    async hasActiveRunOnThread(threadId) {
      const active = await prisma.agentRun.findFirst({
        where: {
          threadId,
          status: { in: ['queued', 'running', 'awaiting_approval'] },
        },
        select: { id: true },
      })
      return Boolean(active)
    },
    async countTerminalChildren(parentRunId) {
      return prisma.agentRun.count({
        where: {
          parentRunId,
          status: { in: ['completed', 'failed', 'cancelled'] },
        },
      })
    },
    acquireLock: acquireSettlementLock,
    releaseLock: releaseSettlementLock,
    logger,
  }
}

/**
 * 子 run 终态 → settlement 通知写回父 thread → 尝试唤醒父 agent。
 * SETNX 幂等（outbox at-least-once 的重复投递护栏）。
 */
export async function deliverSettlement(
  childRunId: string,
  deps: SettlementDeps = defaultSettlementDeps()
): Promise<void> {
  const child = await deps.findRunById(childRunId)
  if (!child?.parentRunId) return
  const parent = await deps.findRunById(child.parentRunId)
  if (!parent?.threadId) {
    deps.logger.warn({
      msg: 'Settlement skipped: parent run/thread unavailable',
      childRunId,
    })
    return
  }
  const acquired = await deps.acquireLock(`settlement:${childRunId}`)
  if (!acquired) return

  const meta = asRecord(child.metadata)
  const label = typeof meta.label === 'string' && meta.label ? meta.label : ''
  const text = buildSettlementMessage({
    status: child.status as 'completed' | 'failed' | 'cancelled',
    label,
    finalOutput: child.finalOutput,
    error: child.error,
  })
  await deps.appendUserMessage(parent.threadId, text)
  await triggerParentFollowUp(child.parentRunId, { authoritative: false }, deps)
}

/**
 * 父 thread 上的自动整合轮。authoritative=true（父 run 终态分发路径）先清
 * 去抖键再重占——否则子 run 在父结束前 10 秒内 settle 留下的键会拦掉合法触发。
 * 重复入队的兜底是“父 thread 已有活跃 run 则跳过”。
 */
export async function triggerParentFollowUp(
  parentRunId: string,
  opts: { authoritative?: boolean } = {},
  deps: SettlementDeps = defaultSettlementDeps()
): Promise<void> {
  const parent = await deps.findRunById(parentRunId)
  if (!parent?.threadId) return
  const lockKey = `followup:${parentRunId}`
  if (opts.authoritative) await deps.releaseLock(lockKey)
  const acquired = await deps.acquireLock(lockKey)
  if (!acquired) return
  if (await deps.hasActiveRunOnThread(parent.threadId)) return

  const meta = asRecord(parent.metadata)
  const autoTurnDepth =
    typeof meta.autoTurnDepth === 'number' ? meta.autoTurnDepth : 0
  const followUp = await deps.createAgentRun({
    agentId: parent.agentId,
    threadId: parent.threadId,
    input: { effectiveInput: '（子任务结果已送达，请整合）' },
    metadata: {
      trigger: 'subagent_settlement',
      autoTurnDepth: autoTurnDepth + 1,
    },
  })
  await deps.enqueueAgentRun({ runId: followUp.id })
}

/** 父 run 终态分发路径：有终态子 run 才触发（parentRunId 索引，零子零负担）。 */
export async function maybeTriggerFollowUpForChildren(
  parentRunId: string,
  deps: SettlementDeps = defaultSettlementDeps()
): Promise<void> {
  const count = await deps.countTerminalChildren(parentRunId)
  if (count === 0) return
  await triggerParentFollowUp(parentRunId, { authoritative: true }, deps)
}
