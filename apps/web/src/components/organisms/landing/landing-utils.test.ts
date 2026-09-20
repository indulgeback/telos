import { describe, expect, it } from 'vitest'
import { getLandingStartHref } from './landing-utils'
import en from '@/lang/en.json'
import zh from '@/lang/zh.json'

describe('landing to chat handoff', () => {
  const prompt = '研究 T 的想法：a+b & 预算? #第一步 / café'

  it('preserves the complete idea through the signed-out callback URL', () => {
    const signIn = new URL(
      getLandingStartHref(false, `  ${prompt}  `),
      'https://telos.test'
    )
    expect(signIn.pathname).toBe('/auth/signin')
    const destination = new URL(
      signIn.searchParams.get('callbackUrl')!,
      signIn.origin
    )
    expect(destination.pathname).toBe('/chat')
    expect(destination.searchParams.get('prompt')).toBe(prompt)
    expect(destination.hash).toBe('')
    expect([...destination.searchParams.keys()]).toEqual(['prompt'])
  })

  it('takes signed-in users directly to chat and omits blank prompts', () => {
    const destination = new URL(
      getLandingStartHref(true, prompt),
      'https://telos.test'
    )
    expect(destination.pathname).toBe('/chat')
    expect(destination.searchParams.get('prompt')).toBe(prompt)
    expect(getLandingStartHref(true, '   ')).toBe('/chat')
  })

  it('provides usable localized prompts for every scene', () => {
    for (const messages of [en.LandingStudio, zh.LandingStudio]) {
      expect(Object.keys(messages.v3.ideas)).toHaveLength(6)
      expect(Object.keys(messages.v3.chapters)).toHaveLength(3)
      for (const scene of [
        ...Object.values(messages.v3.ideas),
        ...Object.values(messages.v3.chapters),
      ]) {
        expect(scene.prompt.trim().length).toBeGreaterThan(10)
        expect(scene.title).toBeTruthy()
        const signIn = new URL(
          getLandingStartHref(false, scene.prompt),
          'https://telos.test'
        )
        const chat = new URL(
          signIn.searchParams.get('callbackUrl')!,
          signIn.origin
        )
        expect(chat.searchParams.get('prompt')).toBe(scene.prompt)
      }
    }
  })
})
