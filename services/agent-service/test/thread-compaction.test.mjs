import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCompactionPrompt,
  normalizeCompactionSummary,
  shouldCompact,
  COMPACTION_THRESHOLD,
} from '../dist/services/thread-compaction.js'

describe('shouldCompact', () => {
  it('triggers only past the message threshold', () => {
    assert.equal(shouldCompact(COMPACTION_THRESHOLD), false)
    assert.equal(shouldCompact(COMPACTION_THRESHOLD + 1), true)
  })
})

describe('buildCompactionPrompt', () => {
  it('includes the previous summary and role-prefixed transcript', () => {
    const prompt = buildCompactionPrompt('旧摘要内容', [
      { role: 'user', content: '帮我整理项目' },
      { role: 'assistant', content: '已完成' },
    ])
    assert.ok(prompt.includes('【已有摘要】'))
    assert.ok(prompt.includes('旧摘要内容'))
    assert.ok(prompt.includes('user: 帮我整理项目'))
    assert.ok(prompt.includes('assistant: 已完成'))
  })

  it('truncates oversized messages and caps the transcript window', () => {
    const longMessage = 'x'.repeat(2000)
    const messages = Array.from({ length: 80 }, (_, index) => ({
      role: 'user',
      content:
        index < 70
          ? ` filler-${String(index).padStart(3, '0')}`
          : `${longMessage}-${index}`,
    }))
    const prompt = buildCompactionPrompt(null, messages)
    // 只保留最近 60 条：最早 20 条的 filler 不应出现，窗口内的应保留
    assert.ok(!prompt.includes('filler-005'))
    assert.ok(prompt.includes('filler-069'))
    // 单条消息被截断到 400 字符
    assert.ok(!prompt.includes(longMessage))
    assert.ok(prompt.length < 400 * 60)
  })

  it('handles an empty previous summary', () => {
    const prompt = buildCompactionPrompt(null, [
      { role: 'user', content: 'hi' },
    ])
    assert.ok(prompt.includes('（无）'))
  })
})

describe('normalizeCompactionSummary', () => {
  it('strips code fences and trims', () => {
    assert.equal(
      normalizeCompactionSummary('```\n## 摘要\n- 要点\n```'),
      '## 摘要\n- 要点'
    )
  })

  it('caps extremely long summaries', () => {
    const normalized = normalizeCompactionSummary('y'.repeat(5000))
    assert.ok(normalized.length <= 2401)
    assert.ok(normalized.endsWith('…'))
  })

  it('returns null for empty output', () => {
    assert.equal(normalizeCompactionSummary('``` ```'), null)
    assert.equal(normalizeCompactionSummary(''), null)
    assert.equal(normalizeCompactionSummary('   '), null)
  })
})
