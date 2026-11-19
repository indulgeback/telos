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
