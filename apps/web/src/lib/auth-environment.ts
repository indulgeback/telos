export interface AuthEnvironmentOptions {
  baseURL: string
  cookieDomain?: string
}

export interface AuthEnvironmentConfig {
  crossSubDomainCookies: { enabled: true; domain: string } | { enabled: false }
  defaultCookieAttributes: {
    sameSite: 'lax' | 'none'
    secure: boolean
  }
}

export function isLocalAuthOrigin(baseURL: string) {
  const hostname = new URL(baseURL).hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  ) {
    return true
  }

  const octets = hostname.split('.').map(Number)
  if (octets.length !== 4 || octets.some(Number.isNaN)) return false

  const [first, second] = octets
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

function normalizeCookieDomain(domain?: string) {
  const normalized = domain?.trim().replace(/^\./, '').toLowerCase()
  return normalized || undefined
}

function inferTelosCookieDomain(hostname: string) {
  if (hostname === 'indulgeback.icu' || hostname.endsWith('.indulgeback.icu')) {
    return 'indulgeback.icu'
  }
  return undefined
}

function hostnameMatchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

export function resolveAuthEnvironment({
  baseURL,
  cookieDomain,
}: AuthEnvironmentOptions): AuthEnvironmentConfig {
  const url = new URL(baseURL)
  const hostname = url.hostname.toLowerCase()
  const secure = url.protocol === 'https:'
  const domain =
    normalizeCookieDomain(cookieDomain) ?? inferTelosCookieDomain(hostname)
  const crossSubDomainEnabled = Boolean(
    secure && domain && hostnameMatchesDomain(hostname, domain)
  )

  return {
    crossSubDomainCookies:
      crossSubDomainEnabled && domain
        ? { enabled: true, domain }
        : { enabled: false },
    defaultCookieAttributes: {
      sameSite: crossSubDomainEnabled ? 'none' : 'lax',
      secure,
    },
  }
}
