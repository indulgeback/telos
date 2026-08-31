import { tool } from '@openai/agents'
import { z } from 'zod'

/**
 * 计划步骤定义。create_plan 工具产出的结构化计划单元。
 */
export interface PlanStep {
  description: string
  tool_hint?: string
}

/**
 * 结构化计划。由 create_plan 工具产出，持久化为 AgentMessage 的 plan part。
 */
export interface StructuredPlan {
  summary: string
  steps: PlanStep[]
}

const MAX_PLAN_STEPS = 20
const MAX_PLAN_SUMMARY_LENGTH = 4_000
const MAX_PLAN_STEP_LENGTH = 4_000
const MAX_PLAN_TOOL_HINT_LENGTH = 128

/**
 * 计划步骤的执行状态。
 * - pending: 尚未开始
 * - in_progress: 正在执行
 * - completed: 已完成
 * - skipped: 已跳过
 * - failed: 执行失败
 */
export type PlanStepStatus =
  'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'

/**
 * 判断一个工具是否为只读工具（plan 模式下允许使用）。
 * 规则：
 * - builtin 工具仅允许明确无写入能力的查询工具
 * - HTTP 工具仅允许 GET 方法
 */
export function isReadOnlyTool(tool: {
  name?: string
  endpoint: unknown
}): boolean {
  const endpoint = tool.endpoint
  if (!endpoint || typeof endpoint !== 'object') return false
  const raw = endpoint as Record<string, unknown>
  const kind = String(raw.kind ?? '').toLowerCase()

  // builtin 工具：只读的内置工具才允许
  if (kind === 'builtin') {
    const readOnlyBuiltins = [
      'get_current_time',
      'calculator',
      'search_memory',
      'list_directory',
      'view_file',
      'grep_search',
      'file_search',
      'web_search',
    ]
    const name = String(raw.builtin || tool.name || '')
    if (!name) return false
    return readOnlyBuiltins.includes(name)
  }

  // HTTP 工具：仅允许 GET
  const method = String(raw.method ?? 'GET').toUpperCase()
  return method === 'GET'
}

/**
 * 校验 create_plan 工具的输入。空 steps 或空 summary 会被拒绝。
 * 在 strict: false 模式下作为手动校验补充。
 */
export function validatePlanInput(input: unknown): StructuredPlan {
  if (!input || typeof input !== 'object') {
    throw new Error('create_plan 输入必须是一个对象')
  }
  const raw = input as Record<string, unknown>
  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : ''
  if (!summary) {
    throw new Error('create_plan 的 summary 不能为空')
  }
  if (summary.length > MAX_PLAN_SUMMARY_LENGTH) {
    throw new Error(
      `create_plan 的 summary 不能超过 ${MAX_PLAN_SUMMARY_LENGTH} 个字符`
    )
  }
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : []
  if (stepsRaw.length === 0) {
    throw new Error('create_plan 的 steps 不能为空')
  }
  if (stepsRaw.length > MAX_PLAN_STEPS) {
    throw new Error(`create_plan 的 steps 不能超过 ${MAX_PLAN_STEPS} 步`)
  }
  const steps: PlanStep[] = stepsRaw.map(s => {
    if (!s || typeof s !== 'object') {
      throw new Error('每个 step 必须是一个对象')
    }
    const rawStep = s as Record<string, unknown>
    const description =
      typeof rawStep.description === 'string' ? rawStep.description.trim() : ''
    if (!description) {
      throw new Error('每个 step 必须有非空的 description')
    }
    if (description.length > MAX_PLAN_STEP_LENGTH) {
      throw new Error(
        `step description 不能超过 ${MAX_PLAN_STEP_LENGTH} 个字符`
      )
    }
    const step: PlanStep = { description }
    if (typeof rawStep.tool_hint === 'string' && rawStep.tool_hint.trim()) {
      const toolHint = rawStep.tool_hint.trim()
      if (toolHint.length > MAX_PLAN_TOOL_HINT_LENGTH) {
        throw new Error(
          `step tool_hint 不能超过 ${MAX_PLAN_TOOL_HINT_LENGTH} 个字符`
        )
      }
      step.tool_hint = toolHint
    }
    return step
  })
  if (steps.length === 0) {
    throw new Error('create_plan 解析后没有任何有效 step')
  }
  return { summary, steps }
}

/** Parse and validate a client-submitted approved plan. */
export function parseApprovedPlan(raw: unknown): StructuredPlan | null {
  if (raw === undefined || raw === null || raw === '') return null
  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('approvedPlan 不是有效的 JSON')
    }
  }
  return validatePlanInput(parsed)
}

/**
 * 构造 create_plan 工具。
 *
 * 该工具配合 Agent 的 toolUseBehavior: { stopAtToolNames: ['create_plan'] } 使用——
 * 模型可以在调用此工具前自由调用只读工具收集上下文，一旦调用 create_plan，
 * run 立即停止，计划被提取并展示给用户审批。
 *
 * @param onPlanCreated 当模型产出计划时的回调（用于持久化 + SSE 推送）
 */
/**
 * create_plan 工具的核心执行逻辑（可独立测试）。
 */
export function executeCreatePlan(
  input: unknown,
  onPlanCreated?: (plan: StructuredPlan) => void
): string {
  const plan = validatePlanInput(input)
  onPlanCreated?.(plan)
  return JSON.stringify({
    plan_created: true,
    summary: plan.summary,
    steps: plan.steps,
    message: '计划已创建并提交给用户审批。',
  })
}

/**
 * update_plan_status 工具的核心执行逻辑（可独立测试）。
 * onStepUpdate 回调返回 { ok, error? }——状态机约束的反馈通道。
 */
export function executeUpdatePlanStatus(
  input: unknown,
  onStepUpdate: (
    stepIndex: number,
    status: PlanStepStatus,
    note?: string
  ) => { ok: boolean; error?: string }
): string {
  if (!input || typeof input !== 'object') {
    return JSON.stringify({ updated: false, error: '无效输入' })
  }
  const raw = input as Record<string, unknown>
  const stepIndex = Number(raw.step_index)
  const status = String(raw.status) as PlanStepStatus
  if (!Number.isInteger(stepIndex) || stepIndex < 0) {
    return JSON.stringify({ updated: false, error: 'step_index 无效' })
  }
  const validStatuses: PlanStepStatus[] = [
    'in_progress',
    'completed',
    'skipped',
    'failed',
  ]
  if (!validStatuses.includes(status)) {
    return JSON.stringify({ updated: false, error: 'status 无效' })
  }
  const note =
    typeof raw.note === 'string' && raw.note.trim()
      ? raw.note.trim()
      : undefined
  // 委托给状态机校验（PlanStore.updateStep），失败时返回错误给模型
  const result = onStepUpdate(stepIndex, status, note)
  if (!result.ok) {
    return JSON.stringify({ updated: false, error: result.error })
  }
  return JSON.stringify({ updated: true, step_index: stepIndex, status })
}

export function buildCreatePlanTool(
  onPlanCreated?: (plan: StructuredPlan) => void
) {
  return tool({
    name: 'create_plan',
    description:
      '创建结构化执行计划。当你已充分理解任务并（在需要时）调用只读工具收集了足够上下文后，调用此工具产出计划。' +
      '调用后计划将展示给用户审批，run 会立即停止。' +
      '注意：调用此工具前应先充分探索（如 search_memory、读取资料），不要在信息不足时草率出计划。',
    parameters: z.object({
      summary: z.string().describe('计划的整体说明（一句话概括要达成什么）'),
      steps: z
        .array(
          z.object({
            description: z.string().describe('这一步具体要做什么'),
            tool_hint: z
              .string()
              .nullable()
              .describe(
                '预计会用到哪些工具（必须为 string 或 null，如 search_memory, calculator）'
              ),
          })
        )
        .describe('按顺序排列的执行步骤'),
    }),
    strict: true,
    async execute(input: unknown) {
      return executeCreatePlan(input, onPlanCreated)
    },
  } as any)
}

/**
 * 构造 update_plan_status 工具。
 *
 * 在 execute 阶段注入，让模型逐步汇报进度。
 * 每次调用会通过 planStore 触发 SSE 事件推送给前端，实现实时进度更新。
 *
 * @param onStepUpdate 步骤状态变更回调（用于 SSE 推送）
 */
export function buildUpdatePlanStatusTool(
  onStepUpdate: (
    stepIndex: number,
    status: PlanStepStatus,
    note?: string
  ) => { ok: boolean; error?: string }
) {
  return tool({
    name: 'update_plan_status',
    description:
      '更新执行计划的步骤状态。在执行已批准计划的过程中，每开始一步、完成一步、跳过一步或遇到失败时调用。' +
      '这会让用户实时看到执行进度。step_index 从 0 开始。',
    parameters: z.object({
      step_index: z.number().describe('要更新的步骤序号（从 0 开始）'),
      status: z
        .enum(['in_progress', 'completed', 'skipped', 'failed'])
        .describe(
          'in_progress=开始执行这一步, completed=这一步已完成, skipped=跳过这一步, failed=这一步失败'
        ),
      note: z
        .string()
        .nullable()
        .describe(
          '可选说明（必须为 string 或 null，如失败原因、完成结果摘要）'
        ),
    }),
    strict: true,
    async execute(input: unknown) {
      return executeUpdatePlanStatus(input, onStepUpdate)
    },
  } as any)
}
