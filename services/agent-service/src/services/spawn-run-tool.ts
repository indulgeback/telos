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

export interface SpawnToolContext {
  runId: string
  persistence?: AgentRunPersistence
}

export interface SpawnRunRow {
  id: string
  agentId: string
  parentRunId: string | null
  metadata: Record<string, unknown>
  thread: { ownerId: string | null } | null
}

export interface ChildRunRow {
  id: string
  threadId: string | null
  status: string
  createdAt: Date | string
  metadata: Record<string, unknown>
}

export interface SpawnDeps {
  findRunById(id: string): Promise<SpawnRunRow | null>
  findAgentById(id: string): Promise<{ id: string } | null>
  findAccessibleAgent(
    agentId: string,
    ownerId: string
  ): Promise<{ id: string } | null>
  countActiveChildren(parentRunId: string): Promise<number>
  createThread(opts: {
    agentId: string
    ownerId: string
    title: string
    metadata: Record<string, unknown>
  }): Promise<{ id: string }>
  appendUserMessage(threadId: string, text: string): Promise<unknown>
  createAgentRun(data: {
    agentId: string
    threadId: string
    input: unknown
    metadata: unknown
    parentRunId: string
  }): Promise<{ id: string }>
  enqueueAgentRun(data: { runId: string }): Promise<unknown>
  listChildrenByParent(parentRunId: string): Promise<ChildRunRow[]>
}

function defaultSpawnDeps(): SpawnDeps {
  return {
    async findRunById(id) {
      return (await prisma.agentRun.findUnique({
        where: { id },
        select: {
          id: true,
          agentId: true,
          parentRunId: true,
          metadata: true,
          thread: { select: { ownerId: true } },
        },
      })) as unknown as SpawnRunRow | null
    },
    async findAgentById(id) {
      return prisma.agent.findFirst({ where: { id, status: 'active' } })
    },
    async findAccessibleAgent(agentId, ownerId) {
      return findAccessibleAgent(agentId, ownerId, {
        where: { status: 'active' },
      })
    },
    async countActiveChildren(parentRunId) {
      return prisma.agentRun.count({
        where: {
          parentRunId,
          status: { in: ['queued', 'running', 'awaiting_approval'] },
        },
      })
    },
    async createThread(opts) {
      return prisma.agentThread.create({
        data: {
          agentId: opts.agentId,
          ownerId: opts.ownerId,
          title: opts.title,
          metadata: opts.metadata as any,
          lastMessageAt: new Date(),
        },
      })
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
    async listChildrenByParent(parentRunId) {
      return (await prisma.agentRun.findMany({
        where: { parentRunId },
        orderBy: { createdAt: 'desc' as const },
        take: 20,
        select: {
          id: true,
          threadId: true,
          status: true,
          createdAt: true,
          metadata: true,
        },
      })) as unknown as ChildRunRow[]
    },
  }
}

function deriveLabel(task: string) {
  return titleFromInput(task)
}

function errorResult(error: string) {
  return JSON.stringify({ error })
}

/**
 * spawn_run 工具核心：校验 → 建子 thread → 写 task 消息 → 建子 run（parentRunId）
 * → 入队 → 立即返回。绝不等待子 run 终态（worker 并发有限，同步等待会自死锁）。
 */
export async function executeSpawn(
  ctx: SpawnToolContext,
  deps: SpawnDeps,
  rawInput: unknown
): Promise<string> {
  const input = asRecord(rawInput)
  const task = typeof input.task === 'string' ? input.task : ''
  const requestedAgentId =
    typeof input.agent_id === 'string' && input.agent_id.trim()
      ? input.agent_id.trim()
      : null
  const explicitLabel =
    typeof input.label === 'string' && input.label.trim()
      ? input.label.trim()
      : null
  const label = explicitLabel || deriveLabel(task)

  const run = await deps.findRunById(ctx.runId)
  if (!run || !run.thread) {
    return errorResult('当前 run 状态不可用，无法派生子任务。')
  }
  const ownerId = run.thread.ownerId ?? 'anonymous'
  const metadata = asRecord(run.metadata)
  const autoTurnDepth =
    typeof metadata.autoTurnDepth === 'number' ? metadata.autoTurnDepth : 0

  const target = requestedAgentId
    ? await deps.findAccessibleAgent(requestedAgentId, ownerId)
    : run.parentRunId
      ? null
      : ((await deps.findAgentById(run.agentId)) ?? null)
  const activeChildCount = await deps.countActiveChildren(ctx.runId)

  const verdict = evaluateSpawnRequest({
    enabled: config.agentSpawnRunEnabled,
    parentRunId: run.parentRunId,
    autoTurnDepth,
    activeChildCount,
    task,
    targetAgentAccessible: Boolean(target),
  })
  if (!verdict.ok) {
    return errorResult(verdict.error)
  }

  const childThread = await deps.createThread({
    agentId: target!.id,
    ownerId,
    title: `↳ ${label}`,
    metadata: { spawnedByRunId: ctx.runId },
  })
  await deps.appendUserMessage(childThread.id, task)
  const childRun = await deps.createAgentRun({
    agentId: target!.id,
    threadId: childThread.id,
    input: { effectiveInput: task },
    metadata: { label, spawnDepth: 1 },
    parentRunId: ctx.runId,
  })
  await deps.enqueueAgentRun({ runId: childRun.id })
  await ctx.persistence
    ?.event('spawn_run.created', {
      child_run_id: childRun.id,
      child_thread_id: childThread.id,
      label,
    })
    .catch(err => {
      logger.warn({ msg: 'spawn_run.created event failed', err })
    })

  return JSON.stringify({
    run_id: childRun.id,
    thread_id: childThread.id,
    label,
    status: 'queued',
    hint: '子任务已异步启动。不要等待或轮询：完成后结果会自动作为消息送达本对话。继续做其他工作或结束本轮即可。',
  })
}

export async function executeListSubagentRuns(
  ctx: SpawnToolContext,
  deps: SpawnDeps
): Promise<string> {
  const children = await deps.listChildrenByParent(ctx.runId)
  return JSON.stringify({
    children: children.map(c => {
      const meta = asRecord(c.metadata)
      return {
        run_id: c.id,
        label: typeof meta.label === 'string' ? meta.label : '',
        status: c.status,
        thread_id: c.threadId,
        created_at: c.createdAt,
      }
    }),
  })
}

export function buildSpawnRunTool(
  ctx: SpawnToolContext,
  deps: SpawnDeps = defaultSpawnDeps()
): Tool {
  return tool({
    name: 'spawn_run',
    description:
      '异步派生一个后台子任务：子任务在独立会话中运行，本工具立即返回 run_id，' +
      '不等待其完成。子任务结束后，结果会自动作为消息送达当前对话，无需轮询。' +
      '适合可以并行推进的独立子问题（调研、检索、批量处理）。' +
      'task 必须自包含：子任务看不到当前对话历史，请把全部必要上下文与期望产出写进 task。',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: '子任务的完整指令（自包含，子任务看不到本对话）',
        },
        label: {
          type: 'string',
          description: '可选短标签，用于完成通知与任务列表展示',
        },
        agent_id: {
          type: 'string',
          description: '可选目标 agent id；缺省表示用当前 agent 自己执行',
        },
      },
      required: ['task'],
      additionalProperties: false,
    },
    strict: false,
    async execute(rawInput: unknown) {
      return executeSpawn(ctx, deps, rawInput)
    },
  } as any)
}

export function buildListSubagentRunsTool(
  ctx: SpawnToolContext,
  deps: SpawnDeps = defaultSpawnDeps()
): Tool {
  return tool({
    name: 'list_subagent_runs',
    description: '查看当前任务派生的全部后台子任务的状态（id、标签、状态、会话）。',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    strict: false,
    async execute() {
      return executeListSubagentRuns(ctx, deps)
    },
  } as any)
}
