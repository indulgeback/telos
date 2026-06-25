import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseExplicitSkillTrigger,
  buildSkillIndexBlock,
  buildSkillActivatedBlock,
} from '../dist/services/skill-loader.js'

// ===== parseExplicitSkillTrigger: $skill-name 前缀解析 =====
describe('parseExplicitSkillTrigger', () => {
  it('匹配 $skill 前缀 + 消息内容', () => {
    const r = parseExplicitSkillTrigger('$ace-music 生成一首歌')
    assert.strictEqual(r.skillName, 'ace-music')
    assert.strictEqual(r.message, '生成一首歌')
  })

  it('仅 skill 名无后续内容时 message 为空字符串', () => {
    const r = parseExplicitSkillTrigger('$ace-music')
    assert.strictEqual(r.skillName, 'ace-music')
    assert.strictEqual(r.message, '')
  })

  it('skill 名含数字时仍匹配', () => {
    const r = parseExplicitSkillTrigger('$gpt-4 分析一下')
    assert.strictEqual(r.skillName, 'gpt-4')
    assert.strictEqual(r.message, '分析一下')
  })

  it('非开头的 $ 不触发（避免误伤货币等场景）', () => {
    const r = parseExplicitSkillTrigger('帮我算 $5 + 3')
    assert.strictEqual(r.skillName, null)
    assert.strictEqual(r.message, '帮我算 $5 + 3')
  })

  it('普通消息不触发', () => {
    const r = parseExplicitSkillTrigger('你好')
    assert.strictEqual(r.skillName, null)
    assert.strictEqual(r.message, '你好')
  })

  it('skill 名含下划线时不匹配（仅允许小写字母/数字/连字符）', () => {
    const r = parseExplicitSkillTrigger('$ace_music 生成')
    assert.strictEqual(r.skillName, null)
  })

  it('消息内容含多行时保留换行', () => {
    const r = parseExplicitSkillTrigger('$ace-music 第一行\n第二行')
    assert.strictEqual(r.skillName, 'ace-music')
    assert.strictEqual(r.message, '第一行\n第二行')
  })

  it('开头带空格时仍匹配（trim 处理）', () => {
    const r = parseExplicitSkillTrigger('   $ace-music hi')
    assert.strictEqual(r.skillName, 'ace-music')
    assert.strictEqual(r.message, 'hi')
  })
})

// ===== buildSkillIndexBlock: L1 元数据索引块 =====
describe('buildSkillIndexBlock', () => {
  it('包含所有 skill 的 name + description', () => {
    const block = buildSkillIndexBlock([
      { name: 'ace-music', description: '生成音乐' },
      { name: 'code-review', description: '代码审查' },
    ])
    assert.ok(block.includes('- ace-music: 生成音乐'))
    assert.ok(block.includes('- code-review: 代码审查'))
  })

  it('包含 execute_skill 工具调用指引', () => {
    const block = buildSkillIndexBlock([{ name: 'a', description: 'd' }])
    assert.ok(block.includes('execute_skill'))
    assert.ok(block.includes('# Available Skills'))
  })

  it('空数组时仍返回表头（不含具体 skill 行）', () => {
    const block = buildSkillIndexBlock([])
    assert.ok(block.includes('# Available Skills'))
    assert.ok(block.includes('execute_skill'))
  })
})

// ===== buildSkillActivatedBlock: 显式激活块 =====
describe('buildSkillActivatedBlock', () => {
  it('包含 skill 全文和激活提示', () => {
    const block = buildSkillActivatedBlock({
      name: 'ace-music',
      description: '生成音乐',
      content: 'CONTENT BODY',
    })
    assert.ok(block.includes('# Activated Skill: ace-music'))
    assert.ok(block.includes('CONTENT BODY'))
    assert.ok(block.includes('显式激活'))
  })

  it('description 出现在正文之前', () => {
    const block = buildSkillActivatedBlock({
      name: 'a',
      description: 'DESC',
      content: 'CONTENT',
    })
    const descIdx = block.indexOf('DESC')
    const contentIdx = block.indexOf('CONTENT')
    assert.ok(descIdx > -1 && contentIdx > -1)
    assert.ok(descIdx < contentIdx)
  })
})
