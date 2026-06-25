// 前端 plan 模式纯逻辑测试（parsePlanPart / parseClientPlanSteps）
// 这些函数在 ChatView.tsx 中定义，此处用副本测试核心逻辑正确性
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * 从计划模式产出的 markdown 文本中解析出步骤列表。
 * 副本 of ChatView.tsx 的 parseClientPlanSteps
 */
function parseClientPlanSteps(planText) {
  if (!planText || !planText.trim()) return []
  const lines = planText.split('\n')
  const steps = []
  const stepPattern = /^\s*(?:\d+[.)、]|[-*•])\s*(.+)$/

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (
      steps.length > 0 &&
      /^#{1,6}\s*(预期结果|需要澄清|说明|备注)/i.test(line)
    ) {
      break
    }
    const match = line.match(stepPattern)
    if (match) {
      const step = match[1].trim()
      if (step) steps.push(step)
    }
  }

  if (steps.length === 0) {
    const fallback = planText.replace(/^#{1,6}\s.*$/gm, '').trim()
    return fallback ? [fallback] : []
  }
  return steps
}

/**
 * parsePlanPart 副本
 */
function parsePlanPart(part) {
  if (!part || typeof part !== 'object') return null
  const raw = part
  if (raw.type !== 'plan') return null

  const planObj =
    raw.plan && typeof raw.plan === 'object' ? raw.plan : raw

  const status =
    planObj.status === 'approved' ||
    planObj.status === 'rejected' ||
    planObj.status === 'pending'
      ? planObj.status
      : 'pending'

  const summary =
    typeof planObj.summary === 'string' ? planObj.summary : undefined

  const rawSteps = Array.isArray(planObj.steps) ? planObj.steps : []
  const steps = rawSteps
    .map(s => {
      if (typeof s === 'string') return { description: s }
      if (s && typeof s === 'object') {
        const desc =
          typeof s.description === 'string' ? s.description : ''
        if (!desc) return null
        const obj = { description: desc }
        if (typeof s.tool_hint === 'string') obj.tool_hint = s.tool_hint
        return obj
      }
      return null
    })
    .filter(s => s !== null)

  const stepStatuses = Array.isArray(planObj.stepStatuses)
    ? planObj.stepStatuses.filter(s => typeof s === 'string')
    : undefined

  const text = typeof planObj.text === 'string' ? planObj.text : undefined

  if (steps.length === 0 && !text) return null
  const finalSteps =
    steps.length > 0
      ? steps
      : text
        ? parseClientPlanSteps(text).map(d => ({ description: d }))
        : []
  if (finalSteps.length === 0) return null

  return { summary, steps: finalSteps, status, stepStatuses, text }
}

// ===== parseClientPlanSteps 测试 =====
describe('parseClientPlanSteps', () => {
  it('从 markdown 数字列表解析步骤', () => {
    const text = `## 执行计划\n1. 第一步\n2. 第二步\n3. 第三步`
    assert.deepStrictEqual(parseClientPlanSteps(text), ['第一步', '第二步', '第三步'])
  })

  it('支持中文序号（顿号）', () => {
    assert.deepStrictEqual(parseClientPlanSteps('1、读取文件\n2、修改内容'), [
      '读取文件',
      '修改内容',
    ])
  })

  it('支持破折号列表', () => {
    assert.deepStrictEqual(parseClientPlanSteps('- 步骤A\n- 步骤B'), [
      '步骤A',
      '步骤B',
    ])
  })

  it('遇到预期结果标题时停止提取', () => {
    assert.deepStrictEqual(
      parseClientPlanSteps('1. 实际步骤\n## 预期结果\n不应该被提取'),
      ['实际步骤']
    )
  })

  it('空文本返回空数组', () => {
    assert.deepStrictEqual(parseClientPlanSteps(''), [])
    assert.deepStrictEqual(parseClientPlanSteps('   '), [])
  })

  it('无步骤格式时返回去标题文本作为单步', () => {
    assert.deepStrictEqual(
      parseClientPlanSteps('## 执行计划\n这是纯文本描述'),
      ['这是纯文本描述']
    )
  })
})

// ===== parsePlanPart 测试 =====
describe('parsePlanPart', () => {
  it('解析新格式结构化 plan part', () => {
    const part = {
      type: 'plan',
      plan: {
        summary: '重构计划',
        steps: [
          { description: '分析代码', tool_hint: 'search_memory' },
          { description: '编写测试' },
        ],
        status: 'pending',
      },
    }
    const result = parsePlanPart(part)
    assert.ok(result, '应返回非 null')
    assert.strictEqual(result.summary, '重构计划')
    assert.strictEqual(result.status, 'pending')
    assert.strictEqual(result.steps.length, 2)
    assert.strictEqual(result.steps[0].description, '分析代码')
    assert.strictEqual(result.steps[0].tool_hint, 'search_memory')
    assert.strictEqual(result.steps[1].tool_hint, undefined)
  })

  it('解析带 stepStatuses 的计划（execute 阶段）', () => {
    const part = {
      type: 'plan',
      plan: {
        summary: '测试',
        steps: [{ description: 'a' }, { description: 'b' }],
        status: 'approved',
        stepStatuses: ['completed', 'in_progress'],
      },
    }
    const result = parsePlanPart(part)
    assert.deepStrictEqual(result.stepStatuses, ['completed', 'in_progress'])
  })

  it('兼容旧扁平格式 { type: plan, steps: [string], status, text }', () => {
    const part = {
      type: 'plan',
      steps: ['步骤一', '步骤二'],
      status: 'approved',
      text: '旧格式文本',
    }
    const result = parsePlanPart(part)
    assert.ok(result)
    assert.strictEqual(result.status, 'approved')
    assert.strictEqual(result.steps.length, 2)
    assert.strictEqual(result.steps[0].description, '步骤一')
  })

  it('兼容旧扁平 text 格式（无 steps 数组）', () => {
    const part = {
      type: 'plan',
      text: '## 执行计划\n1. 第一步\n2. 第二步',
      status: 'pending',
    }
    const result = parsePlanPart(part)
    assert.ok(result)
    assert.strictEqual(result.steps.length, 2)
    assert.strictEqual(result.steps[0].description, '第一步')
  })

  it('非 plan type 返回 null', () => {
    assert.strictEqual(parsePlanPart({ type: 'text', text: 'hello' }), null)
  })

  it('空 steps 且无 text 返回 null', () => {
    assert.strictEqual(parsePlanPart({ type: 'plan', steps: [], status: 'pending' }), null)
  })

  it('非对象输入返回 null', () => {
    assert.strictEqual(parsePlanPart(null), null)
    assert.strictEqual(parsePlanPart('string'), null)
    assert.strictEqual(parsePlanPart(undefined), null)
  })

  it('过滤掉无效 step（缺 description）', () => {
    const part = {
      type: 'plan',
      plan: {
        steps: [
          { description: '有效步骤' },
          { tool_hint: '无效' },
          { description: '另一个有效步骤' },
        ],
        status: 'pending',
      },
    }
    const result = parsePlanPart(part)
    assert.strictEqual(result.steps.length, 2)
    assert.strictEqual(result.steps[0].description, '有效步骤')
    assert.strictEqual(result.steps[1].description, '另一个有效步骤')
  })
})
