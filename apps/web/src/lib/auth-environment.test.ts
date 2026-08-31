import { describe, expect, it } from 'vitest'
import { isLocalAuthOrigin, resolveAuthEnvironment } from './auth-environment'

describe('resolveAuthEnvironment', () => {
  it('uses host-only non-secure cookies on localhost', () => {
    expect(
      resolveAuthEnvironment({
        baseURL: 'http://localhost:8800',
        cookieDomain: 'indulgeback.icu',
      })
    ).toEqual({
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: { sameSite: 'lax', secure: false },
    })
  })

  it('uses host-only non-secure cookies on a LAN address', () => {
    expect(
      resolveAuthEnvironment({ baseURL: 'http://192.168.6.192:8800' })
    ).toEqual({
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: { sameSite: 'lax', secure: false },
    })
  })

  it('infers the Telos production cookie domain over HTTPS', () => {
    expect(
      resolveAuthEnvironment({
        baseURL: 'https://telos.indulgeback.icu',
      })
    ).toEqual({
      crossSubDomainCookies: {
        enabled: true,
        domain: 'indulgeback.icu',
      },
      defaultCookieAttributes: { sameSite: 'none', secure: true },
    })
  })

  it('accepts an explicit matching production cookie domain', () => {
    expect(
      resolveAuthEnvironment({
        baseURL: 'https://app.example.com',
        cookieDomain: '.example.com',
      })
    ).toEqual({
      crossSubDomainCookies: { enabled: true, domain: 'example.com' },
      defaultCookieAttributes: { sameSite: 'none', secure: true },
    })
  })

  it('does not apply an unrelated cookie domain', () => {
    expect(
      resolveAuthEnvironment({
        baseURL: 'https://preview.example.net',
        cookieDomain: 'indulgeback.icu',
      })
    ).toEqual({
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: { sameSite: 'lax', secure: true },
    })
  })
})

describe('isLocalAuthOrigin', () => {
  it.each([
    'http://localhost:8800',
    'http://127.0.0.1:8800',
    'http://192.168.6.192:8800',
    'http://10.0.0.8:8800',
    'http://172.20.0.2:8800',
    'http://telos.local:8800',
  ])('recognizes local origin %s', baseURL => {
    expect(isLocalAuthOrigin(baseURL)).toBe(true)
  })

  it('does not classify the production origin as local', () => {
    expect(isLocalAuthOrigin('https://telos.indulgeback.icu')).toBe(false)
  })
})
