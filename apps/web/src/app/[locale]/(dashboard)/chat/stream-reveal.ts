/**
 * 流式逐字淡入的纯逻辑：接收缓冲（text 全量已到达）→ 按节奏释放光标 →
 * 只有当前行尾部的字符用 <span class="stream-char"> 淡入；
 * 已完成的行交给正常 Markdown 渲染；代码围栏内直接 Markdown 渐进，不做逐字动画。
 */

/** 淡入窗口内的字符数（250ms 淡入 / 25ms 释放 ≈ 10 个字符并发渐入） */
export const FADE_CHARS = 10

/** 流结束后的排空速度（字/tick） */
const DRAIN_STEP = 12

/**
 * 计算下一次释放后的光标位置。
 * 积压越多释放越快（每 25 字积压 +1 字/tick，上限 6），避免长回复显示跟不上；
 * 流结束后快速排空；排空完毕 done=true，调用方合并回普通 Markdown 渲染。
 */
export function nextCursor(
  textLength: number,
  cursor: number,
  active: boolean
): { cursor: number; done: boolean } {
  const queue = textLength - cursor
  if (queue <= 0) {
    // 文本可能因消息改写而缩短，光标不允许越界
    const clamped = Math.min(cursor, textLength)
    return { cursor: clamped, done: !active }
  }
  const step = active
    ? Math.min(6, Math.max(1, Math.ceil(queue / 25)))
    : DRAIN_STEP
  return { cursor: Math.min(textLength, cursor + step), done: false }
}

export interface StreamRevealSplit {
  /** 已完成部分：正常 Markdown 渲染 */
  head: string
  /** 当前行内已定型的纯文本（不再有动画） */
  tailStatic: string
  /** 淡入窗口内的字符（逐字 span，key 用绝对序号防重挂载） */
  tailFade: string
  /** tail 相对当前行起点的淡入起始下标 */
  fadeStartInTail: number
  /** true 时代码围栏未闭合：全部按 Markdown 渐进渲染，不做逐字动画 */
  markdownOnly: boolean
}

/**
 * 把 displayed（text 的前 cursor 个字符）切成 Markdown 头 + 当前行 + 淡入窗口。
 * 行边界取最后一个 \n（列表/标题行完成即定型，比 \n\n 更平滑）；
 * displayed 中 ``` 出现奇数次说明代码围栏未闭合，放弃逐字动画。
 */
export function splitForRender(
  text: string,
  cursor: number
): StreamRevealSplit {
  const displayed = text.slice(0, cursor)
  const fenceCount = (displayed.match(/```/g) ?? []).length
  if (fenceCount % 2 === 1) {
    return {
      head: displayed,
      tailStatic: '',
      tailFade: '',
      fadeStartInTail: 0,
      markdownOnly: true,
    }
  }
  const lineStart = displayed.lastIndexOf('\n') + 1
  const fadeStart = Math.max(lineStart, cursor - FADE_CHARS)
  return {
    head: text.slice(0, lineStart),
    tailStatic: displayed.slice(lineStart, fadeStart),
    tailFade: displayed.slice(fadeStart, cursor),
    fadeStartInTail: fadeStart - lineStart,
    markdownOnly: false,
  }
}
