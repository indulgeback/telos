import { describe, expect, it } from 'vitest'
import { isImeComposingKeyEvent } from './ime'

describe('isImeComposingKeyEvent', () => {
  it('blocks keydowns inside an active composition', () => {
    expect(isImeComposingKeyEvent({ isComposing: true, keyCode: 229 })).toBe(
      true
    )
  })

  it('blocks the Safari confirming keydown whose isComposing already flipped to false', () => {
    expect(isImeComposingKeyEvent({ isComposing: false, keyCode: 229 })).toBe(
      true
    )
  })

  it('lets a regular Enter through after the composition ended', () => {
    expect(isImeComposingKeyEvent({ isComposing: false, keyCode: 13 })).toBe(
      false
    )
  })

  it('lets plain keys through outside a composition', () => {
    expect(isImeComposingKeyEvent({ keyCode: 49 })).toBe(false)
    expect(isImeComposingKeyEvent({ keyCode: 65 })).toBe(false)
  })
})
