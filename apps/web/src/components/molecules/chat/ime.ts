// 输入法组合中的按键（选词、候选翻页、确认候选词）不应触发发送/选中。
// Safari 确认候选词的 keydown 上 isComposing 已经变回 false，
// keyCode 229 是组合态保留码，用它兜底。
export function isImeComposingKeyEvent(event: {
  isComposing?: boolean
  keyCode: number
}): boolean {
  return Boolean(event.isComposing) || event.keyCode === 229
}
