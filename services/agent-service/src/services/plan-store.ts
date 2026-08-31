import type { PlanStepStatus, StructuredPlan } from './plan-tools.js'

/**
 * 步骤状态更新事件。SSE `response.plan_step_updated` 的 payload。
 */
export interface PlanStepUpdate {
  step_index: number
  status: PlanStepStatus
  note?: string
}

/**
 * PlanStore —— 单次 run 内的计划状态管理器。
 *
 * 职责：
 * 1. 持有已批准的计划（steps 列表 + 各步骤的实时状态）
 * 2. 当模型在 execute 阶段调用 update_plan_status 时，更新内部状态
 * 3. 通过 onStepUpdate 回调将状态变更推送到 SSE 流
 *
 * 生命周期：每次 execute 阶段 run 创建一个实例，run 结束后丢弃。
 */
export class PlanStore {
  /** 各步骤的当前状态，长度与 plan.steps 一致 */
  private readonly statuses: PlanStepStatus[] = []

  constructor(
    private readonly plan: StructuredPlan,
    private readonly onStepUpdate: (update: PlanStepUpdate) => void,
    initialStatuses?: readonly PlanStepStatus[]
  ) {
    this.statuses = plan.steps.map((_, index) => {
      const status = initialStatuses?.[index]
      return status === 'pending' ||
        status === 'in_progress' ||
        status === 'completed' ||
        status === 'skipped' ||
        status === 'failed'
        ? status
        : 'pending'
    })
  }

  /**
   * 更新某一步的状态。带 Codex 式状态机约束：
   *
   * 1. 越界拒绝
   * 2. 已终态（completed/skipped/failed）不可变更
   * 3. completed/skipped/failed 只能从 in_progress 转入（不允许跳过 in_progress）
   * 4. 同时只允许 1 个 in_progress
   *
   * 返回 { ok, error? }。当 ok=false 时，error 是给模型的反馈，
   * 模型看到后会自我修正（Codex 的 plan hygiene 机制）。
   */
  updateStep(
    stepIndex: number,
    status: PlanStepStatus,
    note?: string
  ): { ok: boolean; error?: string } {
    // 1. 越界检查
    if (stepIndex < 0 || stepIndex >= this.statuses.length) {
      return {
        ok: false,
        error: `step_index ${stepIndex} 越界（共 ${this.statuses.length} 步，有效范围 0-${this.statuses.length - 1}）`,
      }
    }

    const current = this.statuses[stepIndex]

    // 2. 已终态的步骤不允许再更新
    if (
      current === 'completed' ||
      current === 'skipped' ||
      current === 'failed'
    ) {
      return {
        ok: false,
        error: `步骤 ${stepIndex} 已是终态「${current}」，不可变更`,
      }
    }

    // 3. completed/skipped/failed 只能从 in_progress 转入
    if (
      (status === 'completed' || status === 'skipped' || status === 'failed') &&
      current !== 'in_progress'
    ) {
      return {
        ok: false,
        error: `步骤 ${stepIndex} 当前是「${current}」，必须先调用 update_plan_status(step_index=${stepIndex}, status='in_progress') 才能标记为 ${status}`,
      }
    }

    // 4. 同时只允许 1 个 in_progress
    if (status === 'in_progress') {
      const otherInProgress = this.statuses.findIndex(
        (s, i) => i !== stepIndex && s === 'in_progress'
      )
      if (otherInProgress !== -1) {
        return {
          ok: false,
          error: `步骤 ${otherInProgress} 仍处于 in_progress，请先完成或跳过它（调用 update_plan_status(step_index=${otherInProgress}, status='completed')）再开始步骤 ${stepIndex}`,
        }
      }

      // 新增前序步骤终态强校验
      const uncompletedBefore = this.statuses
        .slice(0, stepIndex)
        .findIndex(s => s !== 'completed' && s !== 'skipped' && s !== 'failed')
      if (uncompletedBefore !== -1) {
        return {
          ok: false,
          error: `无法开启步骤 ${stepIndex}：前序步骤 ${uncompletedBefore}（“${this.plan.steps[uncompletedBefore].description}”）尚未完成（当前状态为 ${this.statuses[uncompletedBefore]}），请严格按照步骤顺序依次执行计划。`,
        }
      }
    }

    // 所有校验通过，执行更新
    this.statuses[stepIndex] = status
    const update: PlanStepUpdate = { step_index: stepIndex, status }
    if (note) update.note = note
    this.onStepUpdate(update)
    return { ok: true }
  }

  /**
   * 真实性收尾：run 结束时调用。
   * 未显式完成的步骤不能被伪装成 completed：残留的 in_progress
   * 标记为 failed，尚未开始的 pending 标记为 skipped，并附带原因。
   */
  finalize(): void {
    this.statuses.forEach((s, i) => {
      if (s === 'in_progress') {
        this.statuses[i] = 'failed'
        this.onStepUpdate({
          step_index: i,
          status: 'failed',
          note: 'Run ended before the step was explicitly completed',
        })
      }
    })
    this.statuses.forEach((s, i) => {
      if (s === 'pending') {
        this.statuses[i] = 'skipped'
        this.onStepUpdate({
          step_index: i,
          status: 'skipped',
          note: 'Run ended before the step started',
        })
      }
    })
  }

  /** 获取所有步骤的当前状态快照 */
  getStatuses(): readonly PlanStepStatus[] {
    return [...this.statuses]
  }

  /** 获取单步状态（工具反馈用） */
  getStatus(stepIndex: number): PlanStepStatus | undefined {
    return this.statuses[stepIndex]
  }

  /** 获取原始计划 */
  getPlan(): StructuredPlan {
    return this.plan
  }

  /** 是否所有步骤都已处理（completed / skipped / failed） */
  isAllDone(): boolean {
    return this.statuses.every(
      s => s === 'completed' || s === 'skipped' || s === 'failed'
    )
  }
}
