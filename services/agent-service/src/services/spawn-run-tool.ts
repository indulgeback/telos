import { tool, type Tool } from '@openai/agents'
import { prisma } from './db.js'
import { config, logger } from '../config/index.js'
import type { AgentRunPersistence } from './persistence.js'
import { createAgentRun } from './persistence.js'
import { enqueueAgentRun } from './run-queue.js'
import { agentSessionService, titleFromInput } from './session.js'
import { findAccessibleAgent } from './agent-access.js'
import { asRecord } from '../utils/json.js'

export const MAX_ACTIVE_CHILD_RUNS = 5
export const MAX_AUTO_TURN_DEPTH = 3
export const MAX_TASK_BYTES = 512 * 1024

export interface SpawnRequestContext {
  enabled: boolean
  parentRunId: string | null
  autoTurnDepth: number
  activeChildCount: number
  task: string
  targetAgentAccessible: boolean
}

export type SpawnRequestVerdict = { ok: true } | { ok: false; error: string }

/** 纯校验：开关/深度/唤醒链/活跃子上限/鉴权结果/task 体积。 */
export function evaluateSpawnRequest(
  ctx: SpawnRequestContext
): SpawnRequestVerdict {
  if (!ctx.enabled) {
    return { ok: false, error: '子任务派生功能已禁用。' }
  }
  if (ctx.parentRunId) {
    return { ok: false, error: '子 run 不能再派生子 run（委派深度上限为 1）。' }
  }
  if (ctx.autoTurnDepth >= MAX_AUTO_TURN_DEPTH) {
    return {
      ok: false,
      error: `自动整合轮已达上限（${MAX_AUTO_TURN_DEPTH}），无法继续派生子任务。`,
    }
  }
  if (ctx.activeChildCount >= MAX_ACTIVE_CHILD_RUNS) {
    return {
      ok: false,
      error: `活跃子任务已达上限（${MAX_ACTIVE_CHILD_RUNS}），请等待部分子任务完成后再派生。`,
    }
  }
  if (!ctx.targetAgentAccessible) {
    return { ok: false, error: '目标 agent 不存在或不可访问。' }
  }
  if (!ctx.task.trim()) {
    return { ok: false, error: 'task 不能为空。' }
  }
  if (Buffer.byteLength(ctx.task, 'utf8') > MAX_TASK_BYTES) {
    return { ok: false, error: `task 超过长度上限（${MAX_TASK_BYTES} 字节）。` }
  }
  return { ok: true }
}
