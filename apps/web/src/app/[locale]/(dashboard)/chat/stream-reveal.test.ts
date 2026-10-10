import { describe, expect, it } from 'vitest'
import { FADE_CHARS, nextCursor, splitForRender } from './stream-reveal'

describe('nextCursor', () => {
  it('does not advance beyond received text', () => {
    expect(nextCursor(10, 10, true)).toEqual({ cursor: 10, done: false })
    expect(nextCursor(10, 10, false)).toEqual({ cursor: 10, done: true })
  })

  it('releases one char per tick at base speed while active', () => {
    // 积压 10 字（淡入窗口量级）→ 基础速度 1 字/tick
    expect(nextCursor(10, 0, true)).toEqual({ cursor: 1, done: false })
  })

  it('accelerates with backlog and caps the step', () => {
    // 积压 100 字 → 4 字/tick
    expect(nextCursor(100, 0, true).cursor).toBe(4)
    // 积压 500 字 → 封顶 6 字/tick
    expect(nextCursor(500, 0, true).cursor).toBe(6)
  })

  it('clamps the cursor when received text shrinks', () => {
    expect(nextCursor(5, 20, false)).toEqual({ cursor: 5, done: true })
  })

  it('drains fast after the stream ends', () => {
    expect(nextCursor(500, 0, false).cursor).toBe(12)
  })
})

describe('splitForRender', () => {
  it('keeps completed lines as markdown head and fades only the tail', () => {
    const stable = '第二行已经稳定输出的内容，这一段完全不再有动画。尾部'
    const text = `第一段已完成。\n\n${stable}正在渐入的尾部字符`
    const cursor = text.length
    const split = splitForRender(text, cursor)
    expect(split.head).toBe('第一段已完成。\n\n')
    expect(split.markdownOnly).toBe(false)
    // 淡入窗口只有尾部 FADE_CHARS 个字符
    expect(split.tailFade.length).toBe(FADE_CHARS)
    expect(split.tailStatic + split.tailFade).toBe(
      stable + '正在渐入的尾部字符'
    )
  })

  it('fades the whole current line when it is shorter than the window', () => {
    const text = 'done line\nnew'
    const split = splitForRender(text, text.length)
    expect(split.head).toBe('done line\n')
    expect(split.tailStatic).toBe('')
    expect(split.tailFade).toBe('new')
  })

  it('switches to markdown-only inside an unclosed code fence', () => {
    const text = 'before\n\n```ts\nconst a = 1'
    const split = splitForRender(text, text.length)
    expect(split.markdownOnly).toBe(true)
    expect(split.head).toBe(text)
    expect(split.tailFade).toBe('')
  })

  it('resumes per-char reveal after the code fence closes', () => {
    const text = 'before\n\n```ts\nconst a = 1\n```\n\nafter fence'
    const split = splitForRender(text, text.length)
    expect(split.markdownOnly).toBe(false)
    expect(split.head).toBe('before\n\n```ts\nconst a = 1\n```\n\n')
  })
})
