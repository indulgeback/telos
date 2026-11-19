# 异步子 Agent Run 设计（spawn_run + Settlement 通知）

- **日期**: 2026-11-19
- **状态**: 已与用户对齐设计方向，待实施
- **参照**: [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) `packages/subagent/` 能力族（v0.1 Developer Preview）
- **范围**: services/agent-service + prisma 迁移 + 前端最小改动

## 1. 背景与调研结论

### Telos 现状

Telos 已有 agent 层级的子 agent 关系（`AgentRelation` 表，mode=`handoff | as_tool`），但两者都是**同一次 run 内的同步执行**（`services/agent-service/src/services/runtime.ts:892-922`）：`as_tool` 阻塞父 agent 直到子循环出最终结果；`handoff` 只是同 run 内控制权转移。没有任何机制让主 agent 自己向 BullMQ 队列派生独立的后台 run。`enqueueAgentRun` 的调用方全部是外部入口（chat 路由、A2A、试运行、重试/审批恢复），没有工具入口。

### DeepSeek harness 的核心机制（本设计的蓝本）

- **委派即 fire-and-forget**：`subagent` 工具调用启动托管 activation 后立即返回 `started subagent <name>`，工具结果 `{kind:'activation', name}` 不含执行结果，activation 生命周期归 runtime。
- **子 agent 拥有独立持久 Session**："A local child has a durable Session"；初始任务作为一条消息写进子 Session（fresh child 不看父对话；`fork` 变体才用父历史种子化）。
- **Settlement notice（完成通知）**：子 agent 终态时 runtime 自动构造一条持久 user-message 注入父会话（`subagent/src/continuation-messages.ts` 的 `createSettlementMessage`），文案区分 completed / aborted / max-tokens / refusal / error；父只收最终答案文本，拿不到子的完整 transcript / tool output / reasoning。
- **防护**：委派深度上限 `maxDepth` 默认 1（默认禁止孙子）；子 agent 唯一命名；catalog 持久化可发现历史子 agent。
- **控制面（本期不做）**：`send_message` / `interrupt_agent` / `wait_agent` / `list_agents` / continuable children（续聊）。

对比：Claude Code 的 Task 工具是同步阻塞等报告；OpenAI Agents SDK 的 `asTool` 是进程内同步。DeepSeek 是唯一把"异步派生 + 完成通知回注"作为一等公民的，本设计对齐其核心语义。

## 2. 目标 / 非目标

**目标（核心闭环）**

1. 新内置工具 `spawn_run`：主 agent 在 run 执行中异步派生子 run，立即返回，不阻塞。
2. 新内置工具 `list_subagent_runs`：父 agent 查询自己派生的子 run 状态。
3. Settlement 交付器：子 run 终态后自动把结果/失败通知写回父 thread，并在需要时自动唤醒父 agent（follow-up run）整合结果。
4. 防护完备：鉴权、深度=1、自动唤醒链上限、活跃子上限、plan 模式排除、env 开关。

**非目标（二期）**

- `send_message` / `interrupt_agent` / `wait_agent` 控制面；continuable 子 agent（续聊、冷恢复）
- `outputSchema` 结构化输出、子 agent 命名树（`reviewer/checker`）
- 跨进程/外部后端（ACP、Codex、Claude Code）
- 前端嵌套 run 卡片、子 run 进度实时聚合展示

## 3. 架构决策：子 run 挂独立子 thread（方案 B）

| | A：子 run 共享父 thread | **B：子 run 独立子 thread（选定）** |
|---|---|---|
| 消息流 | 子的 assistant 输出交错混入父对话 | 父对话干净，settlement 消息是唯一回写 |
| 工作区 | 共享 `workspace:{threadId}`，先结束的 run 会在 finally 里 `rmSync` 掉另一方正在用的目录（`run-executor.ts:1004-1006`），需加引用计数 | 按 threadId 天然隔离，冲突消失 |
| 上下文 | 子看到父全部历史，且输出写回污染 | 子 thread 只有 task 消息 = dsh 的 fresh child |
| 可审计性 | 子过程混在父流里 | 子 thread 完整独立，用户可点入审计 |
| 前端 | 触发 ChatView 多活跃 run 只恢复一个的问题 | 不触碰 ChatView 核心逻辑 |

dsh 映射：dsh 的 `Session` ≈ Telos 的 `thread`（持久会话容器），dsh 的一次 turn ≈ Telos 的 `run`。「子 = 独立子 thread」即 dsh Session 模型在 Telos 数据模型上的平移。settlement 两分支唤醒（§7）是同一意图在 Telos 无常驻 agent 模型下的适配改造。

## 4. 数据模型（一次 Prisma 迁移）

```prisma
model AgentRun {
  // 新增：
  parentRunId String? @map("parent_run_id")
  // 新增索引：
  @@index([parentRunId])
}
```

- `parentRunId` 非空 = 子 run。深度=1 规则直接由"自己的 `parentRunId` 非空则拒绝 spawn"实现，**不需要 depth 列**。
- 子 thread：spawn 时新建（同 agent、同 owner），`title = "↳ {label}"`，`metadata.spawnedByRunId = 父runId`。
- 子 run `metadata`：`{ label, spawnDepth: 1 }`；settlement 交付后追加 `settlementConsumedAt`。
- follow-up run（自动唤醒的父整合轮）`metadata`：`{ trigger: 'subagent_settlement', autoTurnDepth: N }`。
- 用户发起的 run `metadata.autoTurnDepth` 缺省视为 0。

## 5. 工具面（模型可见 API）

### `spawn_run`

```
参数: {
  task:   string   // 必填，子任务指令（自包含，子 agent 看不到父对话）
  label?: string   // 可选短标签，缺省取 task 前 24 字符
  agent_id?: string // 可选目标 agent，缺省 = 当前 agent 自己
}
返回: JSON { run_id, thread_id, label, status: "queued" }
     + 固定提示语："已异步启动，不要等待或轮询；完成后结果会自动送达本对话。"
行为: fire-and-forget，绝不阻塞等待子 run（worker 并发默认 2，同步等待单并发部署下自死锁）
```

执行步骤（顺序即实现顺序）：

1. 校验 env 开关 `AGENT_SPAWN_RUN_ENABLED`（默认开，关则返回错误文案）
2. 解析目标 agent：`agent_id` 缺省用当前 agent；否则 `findAccessibleAgent(agent_id, ownerId)`（复用 `services/agent-access.ts:45-61`），不可访问按不存在处理（404 语义与 chat 路由一致）
3. 深度检查：当前 run 的 `parentRunId` 非空 → 拒绝（"子 run 不能再派生子 run"）
4. 链上限检查：当前 run `metadata.autoTurnDepth >= 3` → 拒绝（防 settlement 自动唤醒链无限递归）
5. 活跃子上限：`agentRun.count({ parentRunId: 当前runId, status ∈ {queued, running, awaiting_approval} }) >= 5` → 拒绝
6. `task` 非空校验 + 长度上限（复用 run-budget 的输入字节上限语义，512KB）
7. 建子 thread（title=`↳ {label}`，metadata.spawnedByRunId）→ `appendUserMessage(子threadId, task)`
8. `createAgentRun({ agentId, threadId: 子threadId, input: { effectiveInput: task }, metadata: { label, spawnDepth: 1 } })`，置 `parentRunId = 当前runId`
9. `enqueueAgentRun({ runId })`
10. `persistence.event('spawn_run.created', { childRunId, label })` → 父 run SSE 流可见
11. 返回 JSON

### `list_subagent_runs`

```
参数: {}（无参数）
返回: JSON 数组 [{ run_id, label, status, thread_id, created_at }]
行为: 查 agentRun.findMany({ parentRunId: 当前runId, orderBy createdAt desc, take 20 })
```

### 注入条件与注册

- 工具注入点：`buildAgent` 工具装配区（`runtime.ts:957-1016` 附近），条件 `depth === 0 && !isPlanMode`（`buildAgent` options 已有 `runId`/`userId`/`persistence`，closure 捕获）。`depth===0` 保证 in-run `as_tool` 子 agent（depth≥1）不会拿到 spawn 能力。
- 定义注册：`BuiltinToolKey` 加 `'spawn_run' | 'list_subagent_runs'`；`BUILTIN_TOOL_DEFINITIONS` 加两条定义；`builtinKeyFromRaw` 加映射；`buildBuiltinTool` 分发到新构造器。实现放**新文件 `services/spawn-run-tool.ts`**（`buildSpawnRunTool` / `buildListSubagentRunsTool`），不在 builtin-tools.ts 巨型 if-else 里膨胀。
- 自动附加：沿用 `ensureBuiltinTools({attachToExistingAgents:true})` 现有机制，部署后所有 agent 自动获得；用户可在工具绑定 UI 按 agent 关闭（`isToolUserAssignable` 对二者放行，不像 run_command 排除）。
- 审批：默认免审批（创建动作本身成本低、有上限防护）。

## 6. 执行流

```
父 run（root，user 发起）执行中
  └─ 调 spawn_run({task, label})
       ├─ 校验（开关/鉴权/深度/链上限/活跃子上限/task）
       ├─ 建子 thread（↳ label）→ 写 task user message
       ├─ createAgentRun(parentRunId=父) → enqueueAgentRun
       ├─ 父 SSE 发 spawn_run.created 事件
       └─ 立即返回 run_id
子 run 在 worker 池中被调度（自己的 thread/workspace/lease/预算/SSE 流）
  └─ 终态（completed/failed/cancelled）→ outbox 终态事件 → settlement 交付器（§7）
父 thread 收到 settlement 消息（↳ 前缀）
  └─ 父 run 已终态 → 自动入队 follow-up run 整合结果
  └─ 父 run 仍活跃  → 消息先落库，父收尾时统一触发一次 follow-up
```

## 7. Settlement 交付器（新文件 `services/settlement.ts`）

### 触发点：outbox 终态分发

`dispatchOutboxEvent`（`services/outbox.ts`）对 `agent_run.completed / failed / cancelled` 三分支，在现有 UI 事件投影之后追加两个调用：

1. `deliverSettlement(event.aggregateId)` — 该 run 是子 run 时交付通知
2. `maybeTriggerFollowUpForChildren(event.aggregateId)` — 该 run 是父且存在已交付未消费的子时触发整合轮

选 outbox 的理由：终态事件本就存在且事务内写入（commit 原子）、自带 claim/ack/retry/dead-letter（at-least-once）、**单一收口覆盖所有终态路径**（executor 正常完成、审批后取消、lease 过期 fail 等全部经此三分支）。dispatcher 跑在 worker 进程（`worker.ts:70`）。

### `deliverSettlement(childRunId)`

1. 载入子 run：无 `parentRunId` → 直接返回（非子 run，绝大多数 run 走这条快路径）
2. 载入父 run → 父 `threadId`
3. Redis `SETNX settlement:{childRunId}`（TTL 7 天）抢占失败 → 返回（outbox at-least-once 的幂等护栏）
4. 构造通知文本（role=user，`appendUserMessage(父threadId, text)`，文案对齐 dsh）：
   - completed：`↳ [子任务完成] {label}：{finalOutput}`（finalOutput 空则写"已完成，无文本输出"）
   - failed：`↳ [子任务失败] {label} 未能完成：{error}`（父能区分"做完"和"没做成"）
   - cancelled：`↳ [子任务中止] {label} 在完成前被停止。`
   - 截断保护：finalOutput 超过 8KB 截断加省略标记
5. 调 `triggerParentFollowUp(parentRunId)`

### `triggerParentFollowUp(parentRunId, opts?: { authoritative?: boolean })`

1. Redis 去抖：`authoritative` 为真时先 `DEL followup:{parentRunId}` 再 `SETNX`；否则直接 `SETNX`（TTL 10 秒，仅作子并发 settle 的去抖）。**父收尾路径必须带 `authoritative: true`**——否则子 run 在父结束前 10 秒内 settle 留下的去抖键会拦掉父收尾的合法触发，follow-up 永远不执行。父终态事件是权威触发源，清键重占不会造成重复（§7.3 step 2 兜底）。
2. 父 thread 活跃 run 检查：`findFirst({ threadId: 父threadId, status ∈ {queued, running, awaiting_approval} })` 存在 → 返回（有活跃 run 在跑，消息等它之后的机会；这也是权威路径防 outbox 重投重复入队的兜底）
3. `createAgentRun({ agentId: 父agentId, threadId: 父threadId, input: { effectiveInput: '（子任务结果已送达，请整合）' }, metadata: { trigger: 'subagent_settlement', autoTurnDepth: (父.metadata.autoTurnDepth ?? 0) + 1 } })` → `enqueueAgentRun`
   - follow-up 实际输入由 worker 侧 `buildRuntimeInput` 从 thread 历史重建，天然包含父 run 的结论消息 + 全部 settlement 消息
4. 标记消费：对 `parentRunId` 下的终态子 run 逐条写 `metadata.settlementConsumedAt`（尽力而为，仅供观测；幂等正确性不依赖它，依赖 step 1/2）

### `maybeTriggerFollowUpForChildren(parentRunId)`

父 run 终态分发时：`agentRun.count({ parentRunId, status: 终态 }) > 0` 才继续（`parentRunId` 索引，无子 run 的 run 零负担）→ 调 `triggerParentFollowUp(parentRunId, { authoritative: true })`。

### 并发与已知边界

- 多子并发 settle：step 1 SETNX 去抖 + step 2 活跃检查。竞态窗口内可能入队两个 follow-up（第二个顺序执行、重新读 thread 历史，浪费一次但不产生错误状态）——接受并记录。
- **孤儿通知**：settlement 消息在 follow-up run 已启动后才落库时，该消息要等用户下一次交互才被消费（Telos 无常驻 agent，与 dsh 父离线的语义等价）。v1 接受，记录为已知边界。
- settlement 交付器自身失败：走 outbox 现有 retry → dead-letter，不阻塞 run 主流程。

## 8. 防护与策略汇总

| 防护 | 值 | 实现 |
|---|---|---|
| 鉴权 | 只能派生 owner 可访问的 agent | `findAccessibleAgent` |
| 委派深度 | 1（禁止孙子） | 自己 `parentRunId` 非空即拒绝 |
| 自动唤醒链 | ≤3 | `metadata.autoTurnDepth` |
| 活跃子数 | ≤5 / 父 run | count 查询 |
| 单次输入 | 512KB | 对齐 run-budget `MAX_INPUT_BYTES` |
| plan 模式 | 排除 | 注入条件 `!isPlanMode`（且 spawn_run 本就不在 `isReadOnlyTool` 白名单） |
| 总开关 | `AGENT_SPAWN_RUN_ENABLED`（默认 true） | config + execute 首步检查 |
| 子 run 预算 | 15min wall-clock / 64 tool calls / cost cap | 现有 run-budget 天然生效，无需改动 |
| 审批 | 免审批 | 默认策略 |

`PLAN_MODE_INSTRUCTIONS`（`runtime.ts:207-220`）补一句："计划模式下无法派生子任务 run"。

## 9. 后端路由与前端改动（最小）

- `routes/runs.ts` `GET /:id` 的 select 与 `routes/chat.ts` thread runs 列表 select 补 `parentRunId` 字段（前端可展示来源，可选消费）
- 前端**必改**：无。子 thread 自然出现在会话列表（`↳` 前缀自解释），子 run 流/详情/取消端点全部现成
- 前端**可选**（不在本期验收内）：父对话中 settlement 消息的特殊样式、run 详情页"子任务"区块

## 10. 测试计划

单元测试（`test/` 目录，node:test，模式沿用现有套件）：

- `spawn-run-tool.test.mjs`：参数校验 / env 开关 / 深度拒绝 / autoTurnDepth 拒绝 / 活跃子上限 / 鉴权 404 语义 / 成功路径落库与入队断言
- `settlement.test.mjs`：非子 run 快速返回 / SETNX 幂等 / 三种终态文案与截断 / 父活跃不触发 / 父终态触发 follow-up 且 metadata 正确 / maybeTriggerFollowUpForChildren 零子负担
- `builtin-tools.test.mjs` 补：新工具定义注册、`isToolUserAssignable` 放行、plan 模式注入排除

集成验证（手工，dev 环境）：

1. `docker-compose up -d` + `pnpm agent-service:dev` + `pnpm web:dev`
2. 让默认 agent spawn 一个研究型子任务，观察：父立即收到 run_id → 子 thread 出现并独立执行 → 子终态后父 thread 收到 `↳` 消息 → follow-up run 自动执行并整合
3. 取消子 run 验证 cancelled 文案；连 spawn 多个验证上限与并发 settle
4. 推送后盯 Basic Checks 到绿（CI 红立即处理）

## 11. 改动文件清单

| 文件 | 改动 |
|---|---|
| `prisma/schema.prisma` | `AgentRun.parentRunId` + 索引；`prisma migrate dev` |
| `services/agent-service/src/services/spawn-run-tool.ts` | **新增**：两个工具构造器 |
| `services/agent-service/src/services/settlement.ts` | **新增**：交付器 + follow-up 触发 |
| `services/agent-service/src/services/builtin-tools.ts` | Key/定义/映射/分发四处小改 |
| `services/agent-service/src/services/runtime.ts` | buildAgent 注入（depth===0 && !isPlanMode）；PLAN_MODE_INSTRUCTIONS 补句 |
| `services/agent-service/src/services/outbox.ts` | 终态三分支追加两个 settlement 调用 |
| `services/agent-service/src/config/index.ts` | `AGENT_SPAWN_RUN_ENABLED` |
| `services/agent-service/src/routes/runs.ts`、`routes/chat.ts` | select 补 `parentRunId` |
| `services/agent-service/test/*` | 新增两个测试文件 + 补既有套件 |

## 12. 二期展望（不承诺）

`send_message`（对活跃子 run 的 Steer 注入 / 对已结束子 run 的续聊）、`interrupt_agent`、`wait_agent`、`outputSchema`、子 agent 命名树、前端嵌套 run 卡片。这些在 dsh 中依赖 continuable child（持久 inbox + 冷恢复），Telos 侧需要先解决"run 完成后继续对话"的会话模型，单独立项。
