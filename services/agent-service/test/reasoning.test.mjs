import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isReasoningEffort,
  isThinkingDisabled,
  normalizeReasoningEffort,
  toGeminiReasoningEffort,
  toGeminiThinkingLevel,
  toOpenAiReasoningEffort,
} from '../dist/services/reasoning.js'

test('isReasoningEffort accepts all seven levels and rejects junk', () => {
  for (const level of [
    'off',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
  ]) {
    assert.equal(isReasoningEffort(level), true)
  }
  assert.equal(isReasoningEffort('turbo'), false)
  assert.equal(isReasoningEffort(null), false)
  assert.equal(isReasoningEffort(undefined), false)
})

test('normalizeReasoningEffort falls back to medium on junk', () => {
  assert.equal(normalizeReasoningEffort('xhigh'), 'xhigh')
  assert.equal(normalizeReasoningEffort('nope'), 'medium')
  assert.equal(normalizeReasoningEffort(undefined, 'low'), 'low')
})

test('openai passthrough maps off to none and keeps the rest verbatim', () => {
  assert.equal(toOpenAiReasoningEffort('off'), 'none')
  assert.equal(toOpenAiReasoningEffort('minimal'), 'minimal')
  assert.equal(toOpenAiReasoningEffort('medium'), 'medium')
  assert.equal(toOpenAiReasoningEffort('xhigh'), 'xhigh')
  assert.equal(toOpenAiReasoningEffort('max'), 'max')
})

test('gemini mappings collapse to levels every Gemini 3 model supports', () => {
  // minimal 会 400（3.8-flash / 3.1-pro），off/minimal/low 全部降级到 low
  assert.equal(toGeminiReasoningEffort('off'), 'low')
  assert.equal(toGeminiReasoningEffort('minimal'), 'low')
  assert.equal(toGeminiReasoningEffort('medium'), 'medium')
  assert.equal(toGeminiReasoningEffort('xhigh'), 'high')
  assert.equal(toGeminiReasoningEffort('max'), 'high')
  assert.equal(toGeminiThinkingLevel('off'), 'low')
  assert.equal(toGeminiThinkingLevel('max'), 'high')
})

test('binary-thinking providers only disable on off and minimal', () => {
  assert.equal(isThinkingDisabled('off'), true)
  assert.equal(isThinkingDisabled('minimal'), true)
  assert.equal(isThinkingDisabled('low'), false)
  assert.equal(isThinkingDisabled('max'), false)
})
