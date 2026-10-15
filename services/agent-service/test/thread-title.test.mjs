import test from 'node:test'
import assert from 'node:assert/strict'

const { shouldGenerateTitle, normalizeGeneratedTitle } = await import(
  '../dist/services/thread-title.js'
)

test('generates only while the title equals the initial truncation', () => {
  // 首条消息经 titleFromInput 规则截断后的初始标题
  const initial = '我想了解这个世界。挑选一个时事、地点、文化或科学' // titleFromInput 的 24 字截断
  assert.equal(shouldGenerateTitle(initial, '我想了解这个世界。挑选一个时事、地点、文化或科学发现并向我讲解。'), true)
  // 用户手动重命名后跳过
  assert.equal(shouldGenerateTitle('我的诺贝尔研究', '我想了解这个世界。挑选一个时事、地点、文化或科学发现并向我讲解。'), false)
  // 空首条消息跳过
  assert.equal(shouldGenerateTitle('新会话', '   '), false)
})

test('normalizes generated titles', () => {
  assert.equal(normalizeGeneratedTitle('  诺贝尔化学奖解读 \n第二行'), '诺贝尔化学奖解读')
  assert.equal(normalizeGeneratedTitle('"诺贝尔化学奖"'), '诺贝尔化学奖')
  assert.equal(normalizeGeneratedTitle(''), '')
  assert.equal(normalizeGeneratedTitle('x'.repeat(80)).length, 50)
})
