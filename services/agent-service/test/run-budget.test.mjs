import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertEstimatedCostBudget,
  calculateUsageCost,
  loadRunBudgetLimits,
  parseModelPricing,
  RunBudgetExceededError,
  RunBudgetTracker,
} from '../dist/services/run-budget.js'

test('run budgets use bounded server defaults and overrides', () => {
  const limits = loadRunBudgetLimits({
    AGENT_RUN_MAX_INPUT_BYTES: '1',
    AGENT_RUN_MAX_TOOL_CALLS: '99999',
    AGENT_RUN_TIMEOUT_MS: '6000',
    AGENT_RUN_MAX_ESTIMATED_COST_USD: '0.25',
  })
  assert.equal(limits.maxInputBytes, 16 * 1024)
  assert.equal(limits.maxToolCalls, 512)
  assert.equal(limits.timeoutMs, 6000)
  assert.equal(limits.maxEstimatedCostUsd, 0.25)
})

test('run budget tracker caps input, tools, and output', () => {
  const limits = {
    maxInputBytes: 4,
    maxOutputCharacters: 3,
    maxToolCalls: 1,
    maxOutputTokens: 256,
    timeoutMs: 60_000,
    maxEstimatedCostUsd: null,
  }
  const tracker = new RunBudgetTracker(limits)
  assert.equal(tracker.assertInput('test'), 4)
  tracker.recordToolCall()
  assert.throws(() => tracker.recordToolCall(), RunBudgetExceededError)
  tracker.dispose()

  const outputTracker = new RunBudgetTracker(limits)
  outputTracker.recordOutput('abc')
  assert.throws(() => outputTracker.recordOutput('d'), /output exceeds/i)
  outputTracker.dispose()
})

test('cost budget fails closed without pricing and caps worst case', () => {
  const limits = {
    ...loadRunBudgetLimits({ AGENT_RUN_MAX_ESTIMATED_COST_USD: '0.01' }),
    maxOutputTokens: 1000,
  }
  assert.throws(
    () =>
      assertEstimatedCostBudget({
        modelKey: 'gpt-test',
        input: 'hello',
        limits,
        pricing: {},
      }),
    /No server-side pricing/
  )

  const pricing = parseModelPricing(
    JSON.stringify({
      'gpt-test': {
        inputUsdPerMillionTokens: 1,
        outputUsdPerMillionTokens: 20,
      },
    })
  )
  assert.throws(
    () =>
      assertEstimatedCostBudget({
        modelKey: 'gpt-test',
        input: 'hello',
        limits,
        pricing,
      }),
    /Estimated worst-case run cost/
  )
  assert.equal(
    calculateUsageCost({
      modelKey: 'gpt-test',
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      pricing,
    }),
    11
  )
})
