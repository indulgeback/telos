# 异步子 Agent Run（spawn_run + Settlement）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让主 agent 在 run 执行中通过 `spawn_run` 工具异步派生独立子 run（fire-and-forget），子 run 终态后由 settlement 交付器把结果通知写回父 thread 并自动唤醒父 agent 整合（对齐 deepseek-harness 核心语义）。

**Architecture:** 两个新工具在 `buildAgent` 运行时直接注入（同 skill-loader 模式，不走 builtin 绑定表）；子 run 挂独立子 thread（workspace/消息流天然隔离）；settlement 交付器挂在 outbox 终态分发（commit 原子 + at-least-once + SETNX 幂等）；follow-up run 自动整合子任务结果，`metadata.autoTurnDepth` 防唤醒链失控。

**Tech Stack:** TypeScript (Hono + OpenAI Agents SDK 0.17)、Prisma/PostgreSQL、BullMQ/Redis (ioredis)、node:test（测试 import 自 `../dist/`，先 build）。

**Spec:** `docs/superpowers/specs/2026-11-19-async-subagent-runs-design.md`

## Global Constraints

- 测试一律 import 编译产物：`import { x } from '../dist/services/xxx.js'`；先 `pnpm --filter ./services/agent-service build` 再 `node --test test/<file>.mjs`（在 `services/agent-service/` 目录下执行）
- 单测不允许连真实 Postgres/Redis —— DB/Redis 依赖通过构造器注入（deps 参数）隔离开，测纯函数与 fake deps 路径
- 无分号、单引号、2 空格缩进（Prettier）；提交前对改过的 ts 文件跑 `pnpm --filter ./services/agent-service lint`
- 提交信息用 conventional commits（`feat:`/`fix:`/`test:`/`docs:`），直接提交到 main（本仓库现行实践）
- 深度=1（子 run 的 `parentRunId` 非空即拒绝 spawn）、自动唤醒链 `autoTurnDepth ≤ 3`、活跃子 ≤ 5、task ≤ 512KB
- Plan 模式与 in-run `as_tool` 子 agent（`depth > 0`）不注入 spawn 工具
- **绝不同步等待子 run 完成**（worker 并发默认 2，同步等待自死锁）
- settlement 交付幂等键：Redis `settlement:{childRunId}`（TTL 7 天）；follow-up 去抖键 `followup:{parentRunId}`（TTL 10 秒）；父终态路径必须 `authoritative: true`（先 DEL 再 SETNX）

---

### Task 1: Prisma 迁移 — `AgentRun.parentRunId` + `createAgentRun` 支持父子关联

**Files:**
- Modify: `prisma/schema.prisma:309-348`（AgentRun model）
- Modify: `services/agent-service/src/services/persistence.ts:477-493`（createAgentRun）
- Create: `prisma/migrations/<timestamp>_agent_run_parent_run_id/migration.sql`（由 prisma 生成）

**Interfaces:**
- Produces: `AgentRun.parentRunId: string | null`（Prisma 字段，后续所有任务依赖）
- Produces: `createAgentRun({ agentId, threadId?, input, metadata?, status?, parentRunId? })`

- [ ] **Step 1: 启动数据库并修改 schema**

```bash
docker-compose up -d
```

在 `prisma/schema.prisma` 的 `AgentRun` model 中（`threadId` 行之后）加：

```prisma
  parentRunId    String?        @map("parent_run_id")
```

在 model 底部关联区（`approvals AgentToolApproval[]` 之后）加：

```prisma
  parentRun AgentRun?  @relation("AgentRunParentChild", fields: [parentRunId], references: [id], onDelete: SetNull)
  childRuns AgentRun[] @relation("AgentRunParentChild")
```

在 `@@index([status, createdAt])` 之后加：

```prisma
  @@index([parentRunId])
```

（自关联用命名 relation 避免歧义；`onDelete: SetNull` —— 父 run 被清理时子的父子关系解除但 run 记录保留。）

- [ ] **Step 2: 生成并应用迁移**

```bash
npx prisma migrate dev --name agent_run_parent_run_id
npx prisma generate
```

Expected: 迁移文件生成于 `prisma/migrations/`，`agent_runs` 表新增 `parent_run_id` 列与索引；Prisma Client 再生。若 Docker/DB 不可用：参考既有迁移目录的格式（`migration.toml` + `migration.sql`）手工创建 `<UTC时间戳>_agent_run_parent_run_id/migration.sql`，内容为：

```sql
-- AlterTable
ALTER TABLE "agent_runs" ADD COLUMN "parent_run_id" TEXT;

-- CreateIndex
CREATE INDEX "agent_runs_parent_run_id_idx" ON "agent_runs"("parent_run_id");

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_parent_run_id_fkey" FOREIGN KEY ("parent_run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

再跑 `npx prisma generate`，把「应用迁移」留给部署流程，并在提交信息中注明"迁移未在本地应用"。

- [ ] **Step 3: 扩展 createAgentRun**

`services/agent-service/src/services/persistence.ts` 的 `createAgentRun` 改为：

```ts
export async function createAgentRun(data: {
  agentId: string
  threadId?: string | null
  input: unknown
  metadata?: unknown
  status?: 'queued' | 'running'
  parentRunId?: string | null
}) {
  return prisma.agentRun.create({
    data: {
      agentId: data.agentId,
      threadId: data.threadId ?? null,
      input: data.input as any,
      metadata: (data.metadata ?? {}) as any,
      status: data.status ?? 'queued',
      parentRunId: data.parentRunId ?? null,
    },
  })
}
```

- [ ] **Step 4: 构建验证**

```bash
pnpm --filter ./services/agent-service build
```

Expected: tsc 零错误。

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations services/agent-service/src/services/persistence.ts
git commit -m "feat(agent-service): add AgentRun.parentRunId for async subagent runs"
```

---

### Task 2: `evaluateSpawnRequest` 纯校验器（TDD）

**Files:**
- Create: `services/agent-service/src/services/spawn-run-tool.ts`（本任务只写校验器部分）
- Test: `services/agent-service/test/spawn-run-tool.test.mjs`

**Interfaces:**
- Produces: `evaluateSpawnRequest(ctx: SpawnRequestContext): SpawnRequestVerdict`
- Produces: 常量 `MAX_ACTIVE_CHILD_RUNS = 5`、`MAX_AUTO_TURN_DEPTH = 3`、`MAX_TASK_BYTES = 512 * 1024`

- [ ] **Step 1: 写失败测试**

创建 `services/agent-service/test/spawn-run-tool.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateSpawnRequest,
  MAX_ACTIVE_CHILD_RUNS,
  MAX_AUTO_TURN_DEPTH,
} from '../dist/services/spawn-run-tool.js'

const base = {
  enabled: true,
  parentRunId: null,
  autoTurnDepth: 0,
  activeChildCount: 0,
  task: '研究一下 xxx 的现状',
  targetAgentAccessible: true,
}

test('passes on a normal request', () => {
  assert.deepEqual(evaluateSpawnRequest(base), { ok: true })
})

test('rejects when the feature switch is off', () => {
  const v = evaluateSpawnRequest({ ...base, enabled: false })
  assert.equal(v.ok, false)
})

test('rejects depth > 1 (child run cannot spawn)', () => {
  const v = evaluateSpawnRequest({ ...base, parentRunId: 'parent-1' })
  assert.equal(v.ok, false)
  if (!v.ok) assert.match(v.error, /深度/)
})

test('rejects auto turn chain over the cap', () => {
  const v = evaluateSpawnRequest({ ...base, autoTurnDepth: MAX_AUTO_TURN_DEPTH })
  assert.equal(v.ok, false)
})

test('rejects when active children reach the cap', () => {
  const v = evaluateSpawnRequest({
    ...base,
    activeChildCount: MAX_ACTIVE_CHILD_RUNS,
  })
  assert.equal(v.ok, false)
})

test('rejects inaccessible target agent', () => {
  const v = evaluateSpawnRequest({ ...base, targetAgentAccessible: false })
  assert.equal(v.ok, false)
  if (!v.ok) assert.match(v.error, /agent/i)
})

test('rejects empty and oversized task', () => {
  assert.equal(evaluateSpawnRequest({ ...base, task: '   ' }).ok, false)
  assert.equal(
    evaluateSpawnRequest({ ...base, task: 'x'.repeat(512 * 1024 + 1) }).ok,
    false
  )
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter ./services/agent-service build || true
cd services/agent-service && node --test test/spawn-run-tool.test.mjs
```

Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现校验器**

创建 `services/agent-service/src/services/spawn-run-tool.ts`：

```ts
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
```

（同文件顶部一次性把 Task 3 要用的 import 都写好，避免二次改动；TS 对未使用导出不报错，lint 若报 unused 再按 Task 3 落地时间收敛。）

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter ./services/agent-service build && cd services/agent-service && node --test test/spawn-run-tool.test.mjs
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add services/agent-service/src/services/spawn-run-tool.ts services/agent-service/test/spawn-run-tool.test.mjs
git commit -m "feat(agent-service): spawn request pure validator with depth/cap guards"
```

---

### Task 3: `executeSpawn` / `executeListSubagentRuns`（deps 注入）+ SDK 工具构造器

**Files:**
- Modify: `services/agent-service/src/services/spawn-run-tool.ts`（追加）
- Test: `services/agent-service/test/spawn-run-tool.test.mjs`（追加）

**Interfaces:**
- Consumes: Task 1 的 `createAgentRun({..., parentRunId})`、Task 2 的 `evaluateSpawnRequest`
- Produces: `executeSpawn(ctx: SpawnToolContext, deps: SpawnDeps, rawInput: unknown): Promise<string>`
- Produces: `executeListSubagentRuns(ctx: SpawnToolContext, deps: SpawnListDeps): Promise<string>`
- Produces: `buildSpawnRunTool(ctx: SpawnToolContext, deps?: SpawnDeps): Tool`、`buildListSubagentRunsTool(ctx: SpawnToolContext, deps?: SpawnListDeps): Tool`（Task 4 的 runtime 注入消费这两个签名）
- Produces: `SpawnToolContext = { runId: string; persistence?: AgentRunPersistence }`

- [ ] **Step 1: 追加失败测试**

在 `test/spawn-run-tool.test.mjs` 末尾追加（import 行加 `executeSpawn, executeListSubagentRuns, buildSpawnRunTool, buildListSubagentRunsTool`）：

```js
function createFakeDeps(overrides = {}) {
  const calls = {
    createdThreads: [],
    appendedMessages: [],
    createdRuns: [],
    enqueued: [],
    events: [],
  }
  const fakePersistence = {
    async event(type, payload) {
      calls.events.push({ type, payload })
    },
  }
  const baseDeps = {
    async findRunById(id) {
      return (
        overrides.runsById?.[id] ?? {
          id,
          agentId: 'agent-self',
          parentRunId: null,
          metadata: {},
          thread: { ownerId: 'user-1' },
        }
      )
    },
    async findAgentById(id) {
      return overrides.agentById?.[id] ?? { id, name: 'self-agent' }
    },
    async findAccessibleAgent(id) {
      if (overrides.inaccessibleAgentIds?.includes(id)) return null
      return { id, name: 'target-agent' }
    },
    async countActiveChildren() {
      return overrides.activeChildCount ?? 0
    },
    async createThread(opts) {
      calls.createdThreads.push(opts)
      return { id: `child-thread-${calls.createdThreads.length}` }
    },
    async appendUserMessage(threadId, text) {
      calls.appendedMessages.push({ threadId, text })
      return { id: `msg-${calls.appendedMessages.length}` }
    },
    async createAgentRun(data) {
      calls.createdRuns.push(data)
      return { id: `child-run-${calls.createdRuns.length}` }
    },
    async enqueueAgentRun(data) {
      calls.enqueued.push(data)
    },
    async listChildrenByParent() {
      return overrides.children ?? []
    },
    ...overrides.deps,
  }
  return { deps: baseDeps, calls, fakePersistence }
}

test('executeSpawn happy path: thread + message + run + enqueue', async () => {
  const { deps, calls, fakePersistence } = createFakeDeps()
  const result = await executeSpawn(
    { runId: 'root-run-1', persistence: fakePersistence },
    deps,
    {
      task: '调研 deepseek harness 的 subagent 实现',
    }
  )
  const parsed = JSON.parse(result)
  assert.equal(parsed.status, 'queued')
  assert.equal(parsed.run_id, 'child-run-1')
  assert.equal(calls.createdThreads[0].title.startsWith('↳ '), true)
  assert.equal(
    calls.createdThreads[0].metadata.spawnedByRunId,
    'root-run-1'
  )
  assert.equal(calls.appendedMessages[0].threadId, 'child-thread-1')
  assert.deepEqual(calls.createdRuns[0].parentRunId, 'root-run-1')
  assert.deepEqual(calls.createdRuns[0].input, {
    effectiveInput: '调研 deepseek harness 的 subagent 实现',
  })
  assert.equal(calls.createdRuns[0].metadata.spawnDepth, 1)
  assert.deepEqual(calls.enqueued, [{ runId: 'child-run-1' }])
  assert.equal(calls.events[0].type, 'spawn_run.created')
})

test('executeSpawn derives label from task when label missing', async () => {
  const { deps, calls } = createFakeDeps()
  await executeSpawn({ runId: 'root-run-1' }, deps, {
    task: '这是一段很长的中文任务描述用来验证标签截断逻辑是否生效',
  })
  assert.equal(
    calls.createdRuns[0].metadata.label,
    '这是一段很长的中文任务描述用来验证标签截断逻辑是' // titleFromInput 的 24 字符截断
  )
})

test('executeSpawn surfaces verdict errors as text', async () => {
  const { deps } = createFakeDeps({
    runsById: {
      'child-run-x': {
        id: 'child-run-x',
        agentId: 'agent-self',
        parentRunId: 'root-run-1',
        metadata: {},
        thread: { ownerId: 'user-1' },
      },
    },
  })
  const result = await executeSpawn(
    { runId: 'child-run-x' },
    deps,
    { task: '再来一层' }
  )
  assert.match(result, /深度/)
  const parsed = JSON.parse(result)
  assert.equal(parsed.error.includes('深度'), true)
})

test('executeSpawn rejects inaccessible target agent', async () => {
  const { deps } = createFakeDeps({
    inaccessibleAgentIds: ['agent-other'],
  })
  const result = await executeSpawn({ runId: 'root-run-1' }, deps, {
    task: '干活',
    agent_id: 'agent-other',
  })
  const parsed = JSON.parse(result)
  assert.equal(parsed.run_id, undefined)
  assert.match(parsed.error, /agent/)
})

test('executeListSubagentRuns returns labeled summaries', async () => {
  const { deps } = createFakeDeps({
    children: [
      {
        id: 'child-run-1',
        threadId: 'child-thread-1',
        status: 'completed',
        createdAt: '2026-11-19T00:00:00.000Z',
        metadata: { label: '调研任务' },
      },
      {
        id: 'child-run-2',
        threadId: 'child-thread-2',
        status: 'running',
        createdAt: '2026-11-19T00:01:00.000Z',
        metadata: {},
      },
    ],
  })
  const result = await executeListSubagentRuns({ runId: 'root-run-1' }, deps)
  const parsed = JSON.parse(result)
  assert.equal(parsed.children.length, 2)
  assert.equal(parsed.children[0].label, '调研任务')
  assert.equal(parsed.children[0].status, 'completed')
  assert.equal(parsed.children[1].label, '')
})

test('tool builders expose stable names and schemas', () => {
  const { deps } = createFakeDeps()
  const spawn = buildSpawnRunTool({ runId: 'r1' }, deps)
  const list = buildListSubagentRunsTool({ runId: 'r1' }, deps)
  assert.equal(spawn.name, 'spawn_run')
  assert.equal(list.name, 'list_subagent_runs')
  assert.deepEqual(spawn.parameters.required, ['task'])
})
```

注意：`executeSpawn` 失败时返回 `JSON.stringify({ error })`、成功返回 `JSON.stringify({ run_id, thread_id, label, status: 'queued' })`，两条断言路径都要成立（上面 happy path 断言 `parsed.run_id` 存在，error path 断言 `parsed.error`）。

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter ./services/agent-service build 2>&1 | tail -3; cd services/agent-service && node --test test/spawn-run-tool.test.mjs 2>&1 | tail -5
```

Expected: FAIL（executeSpawn 未导出）。

- [ ] **Step 3: 实现执行层与工具构造器**

在 `spawn-run-tool.ts` 末尾追加：

```ts
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
      return findAccessibleAgent(agentId, ownerId, { status: 'active' })
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
 * → 入队 → 立即返回。绝不等待子 run 终态。
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
    async execute(rawInput) {
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
```

实现说明：spawn 事件通过 `ctx.persistence?.event(...)` 写出（真实执行时由 runtime 注入 lease-gated persistence），测试用 fake persistence 断言；`logger` 用于事件失败兜底。

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter ./services/agent-service build && cd services/agent-service && node --test test/spawn-run-tool.test.mjs
```

Expected: 全部 PASS（Task 2 + Task 3 用例）。

- [ ] **Step 5: Commit**

```bash
git add services/agent-service/src/services/spawn-run-tool.ts services/agent-service/test/spawn-run-tool.test.mjs
git commit -m "feat(agent-service): spawn_run/list_subagent_runs tools with DI for tests"
```

---

### Task 4: runtime 注入 + 开关 + Plan 模式文案

**Files:**
- Modify: `services/agent-service/src/services/runtime.ts:985-1016`（skill-loader 注入块之后）
- Modify: `services/agent-service/src/services/runtime.ts:207-220`（PLAN_MODE_INSTRUCTIONS）
- Modify: `services/agent-service/src/config/index.ts:37-42` 附近（config 开关）

**Interfaces:**
- Consumes: Task 3 的 `buildSpawnRunTool(ctx)` / `buildListSubagentRunsTool(ctx)`（`SpawnToolContext = { runId, persistence? }`）
- Produces: `config.agentSpawnRunEnabled: boolean`（默认 true，`AGENT_SPAWN_RUN_ENABLED=false` 关闭）

- [ ] **Step 1: config 开关**

`services/agent-service/src/config/index.ts` 在 `agentRunWorkerConcurrency` 定义之后加：

```ts
  // 异步子任务派生（spawn_run）总开关
  agentSpawnRunEnabled: process.env.AGENT_SPAWN_RUN_ENABLED !== 'false',
```

- [ ] **Step 2: runtime 注入**

`runtime.ts` import 区加：

```ts
import {
  buildListSubagentRunsTool,
  buildSpawnRunTool,
} from './spawn-run-tool.js'
```

在 skill-loader 注入块（`if (!isPlanMode && enabledSkills.length > 0) { ... }`，约 985-1000 行）之后、澄清工具注入之前加：

```ts
    // 异步子任务派生工具注入：仅顶层 run（depth===0）、非计划模式、开关开启。
    // in-run as_tool 子 agent（depth>=1）不注入，保证委派深度=1。
    if (!isPlanMode && depth === 0 && options?.runId && config.agentSpawnRunEnabled) {
      tools.push(buildSpawnRunTool({ runId: options.runId, persistence: options.persistence }))
      tools.push(buildListSubagentRunsTool({ runId: options.runId, persistence: options.persistence }))
    }
```

- [ ] **Step 3: Plan 模式文案**

`PLAN_MODE_INSTRUCTIONS` 的「注意」列表（`- 不要尝试调用任何写入/修改类的工具...` 行后）加一行：

```
- 计划模式下无法派生子任务（spawn_run 已禁用），请把派生步骤写进计划交给执行阶段。
```

- [ ] **Step 4: 构建与既有测试**

```bash
pnpm --filter ./services/agent-service build && cd services/agent-service && node --test test/plan-mode.test.mjs test/spawn-run-tool.test.mjs
```

Expected: PASS。runtime.ts 的注入逻辑本身不做单测（buildAgent 依赖过重），由 Task 8 集成冒烟覆盖。

- [ ] **Step 5: Commit**

```bash
git add services/agent-service/src/services/runtime.ts services/agent-service/src/config/index.ts
git commit -m "feat(agent-service): inject spawn tools into top-level runs with env switch"
```

---

### Task 5: `buildSettlementMessage` 纯文案（TDD）

**Files:**
- Create: `services/agent-service/src/services/settlement.ts`（本任务只写纯文案部分）
- Test: `services/agent-service/test/settlement.test.mjs`

**Interfaces:**
- Produces: `buildSettlementMessage(params: { status: 'completed' | 'failed' | 'cancelled'; label: string; finalOutput?: string | null; error?: string | null }): string`
- Produces: `SETTLEMENT_OUTPUT_LIMIT_BYTES = 8 * 1024`

- [ ] **Step 1: 写失败测试**

创建 `services/agent-service/test/settlement.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSettlementMessage,
  SETTLEMENT_OUTPUT_LIMIT_BYTES,
} from '../dist/services/settlement.js'

test('completed with output prefixes and includes the result', () => {
  const text = buildSettlementMessage({
    status: 'completed',
    label: '调研任务',
    finalOutput: '结论：xxx',
  })
  assert.match(text, /^↳ \[子任务完成\] 调研任务：/)
  assert.ok(text.includes('结论：xxx'))
})

test('completed without output explains the empty result', () => {
  const text = buildSettlementMessage({
    status: 'completed',
    label: 't',
    finalOutput: null,
  })
  assert.match(text, /没有产出文本结果/)
})

test('failed includes the reason and stays actionable', () => {
  const text = buildSettlementMessage({
    status: 'failed',
    label: 't',
    error: 'boom',
  })
  assert.match(text, /^↳ \[子任务失败\] t 未能完成：boom/)
})

test('failed without error falls back to unknown reason', () => {
  const text = buildSettlementMessage({
    status: 'failed',
    label: 't',
    error: null,
  })
  assert.match(text, /原因未知/)
})

test('cancelled explains the stop', () => {
  const text = buildSettlementMessage({
    status: 'cancelled',
    label: 't',
  })
  assert.match(text, /^↳ \[子任务中止\]/)
})

test('oversized output is truncated under the byte limit', () => {
  const text = buildSettlementMessage({
    status: 'completed',
    label: 't',
    finalOutput: '很长的结果'.repeat(5000),
  })
  assert.ok(Buffer.byteLength(text, 'utf8') < SETTLEMENT_OUTPUT_LIMIT_BYTES * 2)
  assert.match(text, /截断/)
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter ./services/agent-service build || true; cd services/agent-service && node --test test/settlement.test.mjs 2>&1 | tail -3
```

Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现文案**

创建 `services/agent-service/src/services/settlement.ts`：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter ./services/agent-service build && cd services/agent-service && node --test test/settlement.test.mjs
```

Expected: 全部 PASS（Task 5 里那条笔误断言已在 Step 2 删除）。

- [ ] **Step 5: Commit**

```bash
git add services/agent-service/src/services/settlement.ts services/agent-service/test/settlement.test.mjs
git commit -m "feat(agent-service): settlement notice text builder"
```

---

### Task 6: Settlement 交付器 + follow-up 触发（deps 注入，TDD）

**Files:**
- Modify: `services/agent-service/src/services/settlement.ts`（追加）
- Test: `services/agent-service/test/settlement.test.mjs`（追加）

**Interfaces:**
- Consumes: Task 1 `createAgentRun`、Task 5 `buildSettlementMessage`、现有 `enqueueAgentRun`/`agentSessionService.appendUserMessage`
- Produces: `deliverSettlement(childRunId: string, deps?: SettlementDeps): Promise<void>`
- Produces: `triggerParentFollowUp(parentRunId: string, opts?: { authoritative?: boolean }, deps?: SettlementDeps): Promise<void>`
- Produces: `maybeTriggerFollowUpForChildren(parentRunId: string, deps?: SettlementDeps): Promise<void>`
- Produces: `SettlementDeps`（全部 IO 可注入，Task 7 的 outbox 接线消费默认实现）

- [ ] **Step 1: 追加失败测试**

`test/settlement.test.mjs` import 行加 `deliverSettlement, triggerParentFollowUp, maybeTriggerFollowUpForChildren`，末尾追加：

```js
function createFakeSettlementDeps(seed = {}) {
  const state = {
    messages: [], // { threadId, text }
    createdRuns: [],
    enqueued: [],
    locks: new Map(seed.locks ?? []), // key -> true
    released: [],
  }
  const runsById = new Map(Object.entries(seed.runsById ?? {}))
  const deps = {
    async findRunById(id) {
      return runsById.get(id) ?? null
    },
    async appendUserMessage(threadId, text) {
      state.messages.push({ threadId, text })
    },
    async createAgentRun(data) {
      state.createdRuns.push(data)
      return { id: `followup-${state.createdRuns.length}` }
    },
    async enqueueAgentRun(data) {
      state.enqueued.push(data)
    },
    async hasActiveRunOnThread(threadId) {
      return Boolean(seed.activeThreadIds?.[threadId])
    },
    async countTerminalChildren(parentRunId) {
      return seed.terminalChildCounts?.[parentRunId] ?? 0
    },
    async acquireLock(key) {
      if (state.locks.has(key)) return false
      state.locks.set(key, true)
      return true
    },
    async releaseLock(key) {
      state.locks.delete(key)
      state.released.push(key)
    },
    logger: { warn() {}, error() {} },
  }
  return { deps, state }
}

const parentRun = {
  id: 'parent-1',
  agentId: 'agent-self',
  threadId: 'parent-thread',
  parentRunId: null,
  status: 'completed',
  finalOutput: '父结论',
  error: null,
  metadata: {},
}
const childRun = {
  id: 'child-1',
  agentId: 'agent-self',
  threadId: 'child-thread',
  parentRunId: 'parent-1',
  status: 'completed',
  finalOutput: '子结论',
  error: null,
  metadata: { label: '调研任务' },
}

test('deliverSettlement ignores non-child runs', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'root-1': { ...parentRun, id: 'root-1' } },
  })
  await deliverSettlement('root-1', deps)
  assert.equal(state.messages.length, 0)
})

test('deliverSettlement writes notice then triggers follow-up', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'child-1': childRun, 'parent-1': parentRun },
  })
  await deliverSettlement('child-1', deps)
  assert.equal(state.messages.length, 1)
  assert.equal(state.messages[0].threadId, 'parent-thread')
  assert.match(state.messages[0].text, /^↳ \[子任务完成\] 调研任务：/)
  assert.equal(state.createdRuns.length, 1)
  assert.equal(state.createdRuns[0].threadId, 'parent-thread')
  assert.equal(state.createdRuns[0].metadata.autoTurnDepth, 1)
  assert.deepEqual(state.enqueued, [{ runId: 'followup-1' }])
})

test('deliverSettlement is idempotent under the lock', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'child-1': childRun, 'parent-1': parentRun },
    locks: new Map([['settlement:child-1', true]]),
  })
  await deliverSettlement('child-1', deps)
  assert.equal(state.messages.length, 0)
  assert.equal(state.createdRuns.length, 0)
})

test('failed child produces a failure notice', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: {
      'child-1': { ...childRun, status: 'failed', finalOutput: null, error: 'boom' },
      'parent-1': parentRun,
    },
  })
  await deliverSettlement('child-1', deps)
  assert.match(state.messages[0].text, /^↳ \[子任务失败\] 调研任务 未能完成：boom/)
})

test('follow-up skips while parent thread has an active run', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    activeThreadIds: { 'parent-thread': true },
  })
  await triggerParentFollowUp('parent-1', {}, deps)
  assert.equal(state.createdRuns.length, 0)
})

test('authoritative trigger clears a stale debounce lock', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    locks: new Map([['followup:parent-1', true]]),
  })
  await triggerParentFollowUp('parent-1', { authoritative: true }, deps)
  assert.equal(state.released.includes('followup:parent-1'), true)
  assert.equal(state.createdRuns.length, 1)
})

test('non-authoritative trigger respects the debounce lock (regression)', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    locks: new Map([['followup:parent-1', true]]),
  })
  await triggerParentFollowUp('parent-1', {}, deps)
  assert.equal(state.createdRuns.length, 0)
})

test('maybeTriggerFollowUpForChildren is a no-op without children', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
  })
  await maybeTriggerFollowUpForChildren('parent-1', deps)
  assert.equal(state.createdRuns.length, 0)
})

test('maybeTriggerFollowUpForChildren triggers authoritatively with children', async () => {
  const { deps, state } = createFakeSettlementDeps({
    runsById: { 'parent-1': parentRun },
    terminalChildCounts: { 'parent-1': 2 },
    locks: new Map([['followup:parent-1', true]]),
  })
  await maybeTriggerFollowUpForChildren('parent-1', deps)
  assert.equal(state.createdRuns.length, 1)
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter ./services/agent-service build 2>&1 | tail -3; cd services/agent-service && node --test test/settlement.test.mjs 2>&1 | tail -5
```

Expected: FAIL（函数未导出）。

- [ ] **Step 3: 实现交付器**

在 `settlement.ts` 末尾追加：

```ts
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
    logger.warn({ msg: 'Settlement lock check failed; treating as acquired', key, error })
    // Redis 不可用时放行：通知重复远比通知丢失可接受（appendUserMessage 侧
    // 还有 thread sequence 约束兜底）。锁 TTL 由此处失败无法续期，同 key 下次
    // 恢复后可重新抢占。
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
      return prisma.agentRun.findUnique({
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
      }) as unknown as SettlementRunRow | null
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

const ACTIVE_RUN_STATUSES = ['queued', 'running', 'awaiting_approval']

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
```

（`ACTIVE_RUN_STATUSES` 常量若未使用就删掉——活跃状态清单已内联在 deps 实现里。）

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter ./services/agent-service build && cd services/agent-service && node --test test/settlement.test.mjs
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add services/agent-service/src/services/settlement.ts services/agent-service/test/settlement.test.mjs
git commit -m "feat(agent-service): settlement deliverer with idempotent follow-up trigger"
```

---

### Task 7: outbox 终态分发接线

**Files:**
- Modify: `services/agent-service/src/services/outbox.ts`（`dispatchOutboxEvent` 的终态分支，约 219-231 行）

**Interfaces:**
- Consumes: Task 6 的 `deliverSettlement` / `maybeTriggerFollowUpForChildren`（**动态 import**，同文件对 approval-persistence 已有此模式，避免 outbox→settlement→persistence→outbox 静态环）

- [ ] **Step 1: 在终态分支 settlement-first 接线**

`outbox.ts` 中：

```ts
  if (
    event.eventType === 'agent_run.completed' ||
    event.eventType === 'agent_run.failed' ||
    event.eventType === 'agent_run.cancelled'
  ) {
    const payload =
```

改为：

```ts
  if (
    event.eventType === 'agent_run.completed' ||
    event.eventType === 'agent_run.failed' ||
    event.eventType === 'agent_run.cancelled'
  ) {
    // Settlement first: 交付失败会让事件整体重试，此时终态 UI 投影尚未追加，
    // 不会产生重复终态事件；deliverSettlement 有 SETNX 幂等，重放安全。
    // 动态 import 与下方 approval-persistence 同理，避免静态循环依赖。
    const { deliverSettlement, maybeTriggerFollowUpForChildren } =
      await import('./settlement.js')
    await deliverSettlement(event.aggregateId)
    await maybeTriggerFollowUpForChildren(event.aggregateId)
    const payload =
```

（分支内其余代码不动。）

- [ ] **Step 2: 构建验证**

```bash
pnpm --filter ./services/agent-service build
```

Expected: tsc 零错误。

- [ ] **Step 3: Commit**

```bash
git add services/agent-service/src/services/outbox.ts
git commit -m "feat(agent-service): hook settlement delivery into outbox terminal dispatch"
```

---

### Task 8: 路由 select 补 `parentRunId` + 全量验证

**Files:**
- Modify: `services/agent-service/src/routes/runs.ts`（`GET /:id` 的 select，约 38-77 行）
- Modify: `services/agent-service/src/routes/chat.ts`（thread runs 列表 select，约 389-398 行）

**Interfaces:**
- Produces: 两个端点响应新增 `parent_run_id`（经 `toSnakeCase` 输出），前端可选消费

- [ ] **Step 1: 补 select 字段**

`routes/runs.ts` 的 `GET /:id` 查询 select 里 `threadId: true` 附近加一行 `parentRunId: true`；`routes/chat.ts` 的 `GET /threads/:id/runs` 列表 select 同样加 `parentRunId: true`。两处都在既有 select 对象内加字段，不改其他逻辑。

- [ ] **Step 2: 全量构建 + 测试 + lint**

```bash
pnpm --filter ./services/agent-service build
pnpm --filter ./services/agent-service test
pnpm --filter ./services/agent-service lint
```

Expected: build 零错误；全部测试 PASS（既有套件 + 新增 spawn-run-tool/settlement 两个文件）；lint 零告警（有告警按提示修到零）。

- [ ] **Step 3: Commit**

```bash
git add services/agent-service/src/routes/runs.ts services/agent-service/src/routes/chat.ts
git commit -m "feat(agent-service): expose parentRunId on run endpoints"
```

- [ ] **Step 4: 补充 env 文档（若存在 .env.example）**

```bash
ls services/agent-service/.env.example .env.example 2>/dev/null
```

哪个存在就往哪个文件末尾加一行（都不存在则跳过本步）：

```
# AGENT_SPAWN_RUN_ENABLED=false  # 关闭异步子任务派生（默认开启）
```

只 `git add` 该文件后提交，不要 `git add -A`：

```bash
git add <存在的那个 .env.example 路径>
git commit -m "docs(agent-service): document AGENT_SPAWN_RUN_ENABLED switch"
```

---

### Task 9: 集成冒烟（需要本地环境；不可用时以 CI 为门）

**Files:** 无新改动（验证任务）

- [ ] **Step 1: 起环境**

```bash
docker-compose up -d
pnpm agent-service:dev &   # 8895
```

前提：`.env` 里已有可用的 LLM key 与 `DATABASE_URL`/`REDIS_URL`。

- [ ] **Step 2: 触发一次 spawn**

用现有会话向默认 agent 发一条会触发 spawn_run 的消息（HTTP 直调 `POST /api/agent/chat`，带 Better Auth 会话或走 web 前端 8800）：

```
帮我用 spawn_run 派生一个子任务：调研当前仓库 services/agent-service 的测试文件数量并汇总，label 叫"测试盘点"
```

Expected 顺序：
1. chat 返回 202，父 run SSE 流里出现 `spawn_run.created` 事件
2. 会话列表出现 `↳ 测试盘点` 子 thread，其中有一执行中的 run（`GET /api/runs/{childRunId}` 可见）
3. 子 run 完成后，父 thread 收到 `↳ [子任务完成] 测试盘点：...` 消息
4. 父 thread 自动出现一个 `trigger=subagent_settlement` 的 follow-up run，完成后整合结果

- [ ] **Step 3: 异常路径抽查**

- 取消子 run（`POST /api/runs/{childRunId}/cancel`）→ 父 thread 收到 `↳ [子任务中止]` 文案并触发 follow-up
- 让 agent 尝试第二次 spawn（子 run 内无法直接验证——改由单测覆盖深度拒绝；此处验证活跃子上限与 `AGENT_SPAWN_RUN_ENABLED=false` 时工具不注入（重启服务后 agent 工具列表无 spawn_run）

- [ ] **Step 4: 环境不可用时的降级门**

若本地无 Docker/LLM key：明确记录「冒烟未执行」，依赖 Task 8 全量单测 + CI（推送后盯 Basic Checks 到绿，红了立即修）。不要假称冒烟已通过。

- [ ] **Step 5: 最终提交与推送**

```bash
git status   # 确认无遗漏
git push origin main
```

推送后监控 CI：`gh run watch` 或 Actions 页面，红了按「CI 红状态立即处理」惯例马上修。
