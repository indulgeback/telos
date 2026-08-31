import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isReadOnlyTool,
  validatePlanInput,
  parseApprovedPlan,
  executeCreatePlan,
  executeUpdatePlanStatus,
  buildCreatePlanTool,
  buildUpdatePlanStatusTool,
} from '../dist/services/plan-tools.js'
import { PlanStore } from '../dist/services/plan-store.js'

// ===== isReadOnlyTool 工具分类测试 =====
describe('isReadOnlyTool', () => {
  it('builtin 工具判定为只读', () => {
    assert.strictEqual(
      isReadOnlyTool({
        name: 'calculator',
        endpoint: { kind: 'builtin' },
      }),
      true
    )
  })

  it('builtin 工具（大写 KIND）判定为只读', () => {
    assert.strictEqual(
      isReadOnlyTool({
        name: 'calculator',
        endpoint: { kind: 'Builtin' },
      }),
      true
    )
  })

  it('未知 builtin 默认拒绝', () => {
    assert.strictEqual(
      isReadOnlyTool({
        name: 'unknown_builtin',
        endpoint: { kind: 'builtin' },
      }),
      false
    )
  })

  it('code_interpreter 可能写入文件，plan 阶段拒绝', () => {
    assert.strictEqual(
      isReadOnlyTool({
        name: 'code_interpreter',
        endpoint: { kind: 'builtin' },
      }),
      false
    )
  })

  it('HTTP GET 工具判定为只读', () => {
    assert.strictEqual(
      isReadOnlyTool({ endpoint: { kind: 'http', method: 'GET' } }),
      true
    )
  })

  it('HTTP POST 工具判定为非只读', () => {
    assert.strictEqual(
      isReadOnlyTool({ endpoint: { kind: 'http', method: 'POST' } }),
      false
    )
  })

  it('HTTP PUT 工具判定为非只读', () => {
    assert.strictEqual(
      isReadOnlyTool({ endpoint: { kind: 'http', method: 'PUT' } }),
      false
    )
  })

  it('HTTP DELETE 工具判定为非只读', () => {
    assert.strictEqual(
      isReadOnlyTool({ endpoint: { kind: 'http', method: 'DELETE' } }),
      false
    )
  })

  it('HTTP 工具默认 method（无 method 字段）判定为只读', () => {
    assert.strictEqual(isReadOnlyTool({ endpoint: { kind: 'http' } }), true)
  })

  it('endpoint 为 null 时判定为非只读', () => {
    assert.strictEqual(isReadOnlyTool({ endpoint: null }), false)
  })

  it('endpoint 为非对象时判定为非只读', () => {
    assert.strictEqual(isReadOnlyTool({ endpoint: 'invalid' }), false)
  })
})

// ===== parseApprovedPlan 客户端已批准计划边界测试 =====
describe('parseApprovedPlan', () => {
  const validPlan = {
    summary: '执行已批准计划',
    steps: [{ description: '完成第一步' }],
  }

  it('接受对象或 JSON 字符串，空值返回 null', () => {
    assert.deepStrictEqual(parseApprovedPlan(validPlan), validPlan)
    assert.deepStrictEqual(
      parseApprovedPlan(JSON.stringify(validPlan)),
      validPlan
    )
    assert.strictEqual(parseApprovedPlan(null), null)
  })

  it('拒绝非法 JSON 和非对象 step', () => {
    assert.throws(() => parseApprovedPlan('{bad json'), /JSON/)
    assert.throws(
      () => parseApprovedPlan({ summary: 'x', steps: [null] }),
      /step/
    )
  })

  it('拒绝超过上限的步骤数', () => {
    assert.throws(
      () =>
        parseApprovedPlan({
          summary: 'x',
          steps: Array.from({ length: 21 }, (_, index) => ({
            description: `step ${index}`,
          })),
        }),
      /20/
    )
  })
})

// ===== validatePlanInput 计划校验测试 =====
describe('validatePlanInput', () => {
  it('接受合法的计划输入', () => {
    const input = {
      summary: '重构认证模块',
      steps: [
        { description: '分析现有代码' },
        { description: '抽取接口', tool_hint: 'code_interpreter' },
      ],
    }
    const plan = validatePlanInput(input)
    assert.strictEqual(plan.summary, '重构认证模块')
    assert.strictEqual(plan.steps.length, 2)
    assert.strictEqual(plan.steps[0].description, '分析现有代码')
    assert.strictEqual(plan.steps[1].tool_hint, 'code_interpreter')
  })

  it('空 summary 被拒绝', () => {
    assert.throws(
      () => validatePlanInput({ summary: '', steps: [{ description: 'x' }] }),
      /summary/
    )
  })

  it('空 steps 数组被拒绝', () => {
    assert.throws(
      () => validatePlanInput({ summary: 'test', steps: [] }),
      /steps/
    )
  })

  it('step 缺少 description 被拒绝', () => {
    assert.throws(
      () => validatePlanInput({ summary: 'test', steps: [{ tool_hint: 'x' }] }),
      /description/
    )
  })

  it('非对象输入被拒绝', () => {
    assert.throws(() => validatePlanInput(null), /对象/)
    assert.throws(() => validatePlanInput('string'), /对象/)
  })

  it('自动去除 description 前后空格', () => {
    const plan = validatePlanInput({
      summary: '  测试  ',
      steps: [{ description: '  步骤一  ' }],
    })
    assert.strictEqual(plan.summary, '测试')
    assert.strictEqual(plan.steps[0].description, '步骤一')
  })
})

// ===== create_plan 执行逻辑测试（纯函数）=====
describe('executeCreatePlan', () => {
  it('合法输入返回 plan_created 并触发回调', () => {
    let captured = null
    const result = executeCreatePlan(
      { summary: '测试计划', steps: [{ description: '第一步' }] },
      plan => {
        captured = plan
      }
    )
    const parsed = JSON.parse(result)
    assert.strictEqual(parsed.plan_created, true)
    assert.strictEqual(parsed.summary, '测试计划')
    assert.ok(captured, '回调应被调用')
    assert.strictEqual(captured.summary, '测试计划')
  })

  it('非法输入抛出错误', () => {
    assert.throws(() => executeCreatePlan({ summary: '', steps: [] }))
  })
})

// ===== update_plan_status 执行逻辑测试（纯函数）=====
describe('executeUpdatePlanStatus', () => {
  it('合法输入 + 状态机通过时触发回调', () => {
    const updates = []
    executeUpdatePlanStatus(
      { step_index: 0, status: 'in_progress' },
      (idx, status, note) => {
        updates.push({ idx, status, note })
        return { ok: true }
      }
    )
    executeUpdatePlanStatus(
      { step_index: 0, status: 'completed' },
      (idx, status, note) => {
        updates.push({ idx, status, note })
        return { ok: true }
      }
    )
    assert.strictEqual(updates.length, 2)
    assert.strictEqual(updates[0].status, 'in_progress')
    assert.strictEqual(updates[1].status, 'completed')
  })

  it('note 被正确传递', () => {
    const updates = []
    executeUpdatePlanStatus(
      { step_index: 0, status: 'in_progress', note: '开始执行' },
      (idx, status, note) => {
        updates.push({ idx, status, note })
        return { ok: true }
      }
    )
    assert.strictEqual(updates[0].note, '开始执行')
  })

  it('状态机拒绝时返回错误 JSON（模型可读到反馈）', () => {
    const result = executeUpdatePlanStatus(
      { step_index: 0, status: 'completed' },
      () => ({ ok: false, error: '必须先 in_progress' })
    )
    const parsed = JSON.parse(result)
    assert.strictEqual(parsed.updated, false)
    assert.match(parsed.error, /in_progress/)
  })

  it('非法 status 返回错误 JSON', () => {
    const result = executeUpdatePlanStatus(
      { step_index: 0, status: 'invalid' },
      () => ({ ok: true })
    )
    assert.strictEqual(JSON.parse(result).updated, false)
  })

  it('负数 step_index 返回错误', () => {
    const result = executeUpdatePlanStatus(
      { step_index: -1, status: 'completed' },
      () => ({ ok: true })
    )
    assert.strictEqual(JSON.parse(result).updated, false)
  })

  it('非对象输入返回错误', () => {
    const result = executeUpdatePlanStatus(null, () => ({ ok: true }))
    assert.strictEqual(JSON.parse(result).updated, false)
  })
})

// ===== buildCreatePlanTool / buildUpdatePlanStatusTool 工厂测试 =====
describe('buildCreatePlanTool', () => {
  it('返回有效的 tool 对象', () => {
    const t = buildCreatePlanTool(() => {})
    assert.strictEqual(t.name, 'create_plan')
    assert.strictEqual(typeof t.invoke, 'function')
  })
})

describe('buildUpdatePlanStatusTool', () => {
  it('返回有效的 tool 对象', () => {
    const t = buildUpdatePlanStatusTool(() => {})
    assert.strictEqual(t.name, 'update_plan_status')
    assert.strictEqual(typeof t.invoke, 'function')
  })
})

// ===== PlanStore 状态管理测试 =====
describe('PlanStore', () => {
  const samplePlan = {
    summary: '测试计划',
    steps: [
      { description: '步骤1' },
      { description: '步骤2' },
      { description: '步骤3' },
    ],
  }

  it('初始状态全部为 pending', () => {
    const updates = []
    const store = new PlanStore(samplePlan, u => updates.push(u))
    assert.deepStrictEqual(
      [...store.getStatuses()],
      ['pending', 'pending', 'pending']
    )
    assert.strictEqual(store.isAllDone(), false)
  })

  it('从持久化步骤状态恢复，工具审批后不会重置进度', () => {
    const store = new PlanStore(samplePlan, () => {}, [
      'completed',
      'in_progress',
      'pending',
    ])
    assert.deepStrictEqual(
      [...store.getStatuses()],
      ['completed', 'in_progress', 'pending']
    )
    assert.strictEqual(store.updateStep(1, 'completed').ok, true)
    assert.strictEqual(store.updateStep(2, 'in_progress').ok, true)
  })

  it('updateStep 合法转换触发回调并更新状态', () => {
    const updates = []
    const store = new PlanStore(samplePlan, u => updates.push(u))
    assert.strictEqual(store.updateStep(0, 'in_progress').ok, true)
    assert.strictEqual(store.updateStep(0, 'completed').ok, true)
    assert.strictEqual(store.getStatuses()[0], 'completed')
    assert.strictEqual(updates.length, 2)
    assert.deepStrictEqual(updates[0], { step_index: 0, status: 'in_progress' })
    assert.deepStrictEqual(updates[1], { step_index: 0, status: 'completed' })
  })

  it('note 被正确传递到回调（合法路径：先 in_progress 再 failed）', () => {
    const updates = []
    const store = new PlanStore(samplePlan, u => updates.push(u))
    store.updateStep(0, 'in_progress')
    store.updateStep(0, 'completed')
    store.updateStep(1, 'in_progress')
    store.updateStep(1, 'failed', '连接超时')
    // 过滤掉 step 0 的更新记录，以匹配对 step 1 的断言
    const step1Updates = updates.filter(u => u.step_index === 1)
    assert.strictEqual(step1Updates[1].note, '连接超时')
  })

  // ===== 状态机约束测试（Codex 式 plan hygiene）=====

  it('拒绝跳过 in_progress 直接 completed', () => {
    const store = new PlanStore(samplePlan, () => {})
    const result = store.updateStep(0, 'completed')
    assert.strictEqual(result.ok, false)
    assert.match(result.error, /in_progress/)
  })

  it('拒绝跳过 in_progress 直接 failed', () => {
    const store = new PlanStore(samplePlan, () => {})
    const result = store.updateStep(0, 'failed')
    assert.strictEqual(result.ok, false)
    assert.match(result.error, /in_progress/)
  })

  it('拒绝同时多个 in_progress', () => {
    const store = new PlanStore(samplePlan, () => {})
    store.updateStep(0, 'in_progress')
    const result = store.updateStep(1, 'in_progress')
    assert.strictEqual(result.ok, false)
    assert.match(result.error, /步骤 0/)
  })

  it('允许先完成 step 0 再开始 step 1', () => {
    const store = new PlanStore(samplePlan, () => {})
    assert.strictEqual(store.updateStep(0, 'in_progress').ok, true)
    assert.strictEqual(store.updateStep(0, 'completed').ok, true)
    assert.strictEqual(store.updateStep(1, 'in_progress').ok, true)
  })

  it('拒绝已终态步骤的再次更新', () => {
    const store = new PlanStore(samplePlan, () => {})
    store.updateStep(0, 'in_progress')
    store.updateStep(0, 'completed')
    const result = store.updateStep(0, 'in_progress')
    assert.strictEqual(result.ok, false)
    assert.match(result.error, /终态/)
  })

  it('越界 step_index 返回错误', () => {
    const store = new PlanStore(samplePlan, () => {})
    assert.strictEqual(store.updateStep(99, 'in_progress').ok, false)
    assert.strictEqual(store.updateStep(-1, 'in_progress').ok, false)
  })

  it('getStatus 查询单步状态', () => {
    const store = new PlanStore(samplePlan, () => {})
    assert.strictEqual(store.getStatus(0), 'pending')
    store.updateStep(0, 'in_progress')
    assert.strictEqual(store.getStatus(0), 'in_progress')
    assert.strictEqual(store.getStatus(99), undefined)
  })

  it('isAllDone 在所有步骤合法完成后返回 true', () => {
    const store = new PlanStore(samplePlan, () => {})
    store.updateStep(0, 'in_progress')
    store.updateStep(0, 'completed')
    store.updateStep(1, 'in_progress')
    store.updateStep(1, 'skipped')
    store.updateStep(2, 'in_progress')
    store.updateStep(2, 'failed')
    assert.strictEqual(store.isAllDone(), true)
  })

  it('isAllDone 在有 pending 时返回 false', () => {
    const store = new PlanStore(samplePlan, () => {})
    store.updateStep(0, 'in_progress')
    store.updateStep(0, 'completed')
    assert.strictEqual(store.isAllDone(), false)
  })

  // ===== finalize 兜底收尾测试 =====

  it('finalize 把残留 in_progress 标记为 failed，不伪造完成', () => {
    const updates = []
    const store = new PlanStore(samplePlan, u => updates.push(u))
    store.updateStep(0, 'in_progress')
    store.finalize()
    assert.deepStrictEqual(
      [...store.getStatuses()],
      ['failed', 'skipped', 'skipped']
    )
    assert.deepStrictEqual(updates.at(-3), {
      step_index: 0,
      status: 'failed',
      note: 'Run ended before the step was explicitly completed',
    })
  })

  it('finalize 把残留 pending 标记为 skipped', () => {
    const updates = []
    const store = new PlanStore(samplePlan, u => updates.push(u))
    store.updateStep(0, 'in_progress')
    store.updateStep(0, 'completed')
    store.updateStep(1, 'in_progress')
    store.updateStep(1, 'completed')
    // step 2 仍是 pending
    store.finalize()
    assert.deepStrictEqual(
      [...store.getStatuses()],
      ['completed', 'completed', 'skipped']
    )
    assert.deepStrictEqual(updates.at(-1), {
      step_index: 2,
      status: 'skipped',
      note: 'Run ended before the step started',
    })
  })

  it('finalize 对已完成的计划不产生副作用', () => {
    const updates = []
    const store = new PlanStore(samplePlan, u => updates.push(u))
    // 全部完成
    for (let i = 0; i < 3; i++) {
      store.updateStep(i, 'in_progress')
      store.updateStep(i, 'completed')
    }
    const updatesBefore = updates.length
    store.finalize()
    assert.strictEqual(updates.length, updatesBefore) // 无额外更新
  })

  it('getPlan 返回原始计划', () => {
    const store = new PlanStore(samplePlan, () => {})
    assert.strictEqual(store.getPlan(), samplePlan)
  })
})
