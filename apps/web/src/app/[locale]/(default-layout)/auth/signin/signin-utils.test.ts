import { describe, expect, it } from 'vitest'
import { getSignInCallback } from './signin-utils'

describe('getSignInCallback', () => {
  it('uses chat when no callback is supplied', () => {
    expect(getSignInCallback(null)).toBe('/chat')
    expect(getSignInCallback('')).toBe('/chat')
  })

  it('preserves a localized landing prompt and hash', () => {
    const callback = '/zh/chat?prompt=%E4%BD%A0%E5%A5%BD%20T&mode=plan#new'
    expect(getSignInCallback(callback)).toBe(callback)
  })

  it.each([
    'https://external.example/chat',
    '//external.example/chat',
    'javascript:alert(1)',
    '/\\external.example',
    '/chat\n//external.example',
  ])('rejects unsafe navigation: %s', callback => {
    expect(getSignInCallback(callback)).toBe('/chat')
  })
})
