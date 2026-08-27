import dns from 'node:dns'
import dnsPromises from 'node:dns/promises'
import net from 'node:net'
import { Agent, interceptors } from 'undici'

const { dns: dnsInterceptor } = interceptors

export const DEFAULT_MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const DEFAULT_MAX_REDIRECTS = 3
export const DEFAULT_TOTAL_TIMEOUT_MS = 30_000
export const DEFAULT_CONNECT_TIMEOUT_MS = 5_000

export type IpAddressClass =
  | 'public'
  | 'private'
  | 'loopback'
  | 'link-local'
  | 'multicast'
  | 'metadata'
  | 'reserved'
  | 'invalid'

export class SafeFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SafeFetchError'
  }
}

function ipv4Parts(value: string): number[] | null {
  const parts = value.split('.')
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return null
  const numbers = parts.map(Number)
  if (numbers.some(part => part < 0 || part > 255)) return null
  return numbers
}

function ipv4Number(parts: number[]) {
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0
}

function ipv6Bytes(value: string): Uint8Array | null {
  let input = value.toLowerCase()
  if (input.includes('.')) {
    const marker = input.lastIndexOf(':')
    const ipv4 = ipv4Parts(input.slice(marker + 1))
    if (!ipv4) return null
    input = `${input.slice(0, marker)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`
  }
  const halves = input.split('::')
  if (halves.length > 2) return null
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  if ([...left, ...right].some(part => !/^[0-9a-f]{1,4}$/.test(part)))
    return null
  const missing = 8 - left.length - right.length
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null
  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => '0'),
    ...right,
  ]
  const bytes = new Uint8Array(16)
  groups.forEach((group, index) => {
    const number = Number.parseInt(group, 16)
    bytes[index * 2] = number >> 8
    bytes[index * 2 + 1] = number & 0xff
  })
  return bytes
}

export function classifyIpAddress(value: string): IpAddressClass {
  const family = net.isIP(value)
  if (family === 4) {
    const parts = ipv4Parts(value)
    if (!parts) return 'invalid'
    const number = ipv4Number(parts)
    if (number === 0x7f000000 || (number >= 0x7f000000 && number <= 0x7fffffff))
      return 'loopback'
    if (number >= 0x0a000000 && number <= 0x0affffff) return 'private'
    if (number >= 0xac100000 && number <= 0xac1fffff) return 'private'
    if (number >= 0xc0a80000 && number <= 0xc0a8ffff) return 'private'
    if (
      number === 0xa9fea9fe ||
      number === 0xa9feaa02 ||
      number === 0x5464c8c8 ||
      number === 0xa83f8110
    )
      return 'metadata'
    if (number >= 0xa9fe0000 && number <= 0xa9feffff) return 'link-local'
    if (number >= 0xe0000000 && number <= 0xefffffff) return 'multicast'
    if (number >= 0xf0000000 && number <= 0xffffffff) return 'reserved'
    if (number >= 0x64400000 && number <= 0x647fffff) return 'reserved' // carrier-grade NAT
    if (number >= 0 && number <= 0x00ffffff) return 'reserved'
    if (number >= 0xc0000000 && number <= 0xc00000ff) return 'reserved'
    if (number >= 0xc0000200 && number <= 0xc00002ff) return 'reserved'
    if (number >= 0xc0586300 && number <= 0xc05863ff) return 'reserved'
    if (number >= 0xc6120000 && number <= 0xc613ffff) return 'reserved'
    if (number >= 0xc6336400 && number <= 0xc63364ff) return 'reserved'
    if (number >= 0xcb007100 && number <= 0xcb0071ff) return 'reserved'
    return 'public'
  }

  if (family === 6) {
    const bytes = ipv6Bytes(value)
    if (!bytes) return 'invalid'
    const mapped = bytes
      .slice(0, 12)
      .every((byte, index) => (index < 10 ? byte === 0 : byte === 0xff))
    if (mapped)
      return classifyIpAddress(
        `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`
      )
    if (bytes.every(byte => byte === 0)) return 'reserved'
    if (bytes.slice(0, 15).every(byte => byte === 0) && bytes[15] === 1)
      return 'loopback'
    const compatible = bytes.slice(0, 12).every(byte => byte === 0)
    if (compatible) {
      return classifyIpAddress(
        `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`
      )
    }
    if ((bytes[0] & 0xfe) === 0xfc) return 'private'
    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0xc0) return 'reserved'
    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return 'link-local'
    if (bytes[0] >= 0xff) return 'multicast'
    if (
      bytes[0] === 0x20 &&
      bytes[1] === 0x01 &&
      bytes[2] === 0x0d &&
      bytes[3] === 0xb8
    )
      return 'reserved'
    if (
      bytes[0] === 0x00 &&
      bytes[1] === 0x64 &&
      bytes[2] === 0xff &&
      bytes[3] === 0x9b
    )
      return 'reserved'
    if (
      bytes[0] === 0x20 &&
      bytes[1] === 0x01 &&
      bytes[2] === 0x00 &&
      bytes[3] === 0x00
    )
      return 'reserved'
    if (bytes[0] === 0x20 && bytes[1] === 0x02) return 'reserved'
    return 'public'
  }

  return 'invalid'
}

export function isPublicIpAddress(value: string) {
  return classifyIpAddress(value) === 'public'
}

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
])

export function validateUrlSyntax(value: string): URL {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 16_384
  ) {
    throw new SafeFetchError('URL is missing or exceeds the maximum length')
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new SafeFetchError('URL is invalid')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeFetchError('Only http and https URLs are allowed')
  }
  if (url.username || url.password)
    throw new SafeFetchError('URL userinfo is not allowed')
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    !hostname ||
    LOCAL_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost')
  ) {
    throw new SafeFetchError('Localhost URLs are not allowed')
  }
  const ipClass = net.isIP(hostname) ? classifyIpAddress(hostname) : null
  if (ipClass && ipClass !== 'public')
    throw new SafeFetchError(`IP address is not public (${ipClass})`)
  if (
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new SafeFetchError('Local or metadata hostnames are not allowed')
  }
  return url
}

export type HostAddress = { address: string; family: 4 | 6 }
export type HostResolver = (hostname: string) => Promise<HostAddress[]>

export async function resolvePublicHost(
  hostname: string
): Promise<HostAddress[]> {
  const records = await dnsPromises.lookup(hostname, {
    all: true,
    verbatim: true,
  })
  return records.map(record => ({
    address: record.address,
    family: record.family as 4 | 6,
  }))
}

export async function validateSafeUrl(
  value: string,
  resolver: HostResolver = resolvePublicHost
) {
  const url = validateUrlSyntax(value)
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(hostname)) return url
  let records: HostAddress[]
  try {
    records = await resolver(hostname)
  } catch {
    throw new SafeFetchError('DNS lookup failed')
  }
  if (
    records.length === 0 ||
    records.some(record => classifyIpAddress(record.address) !== 'public')
  ) {
    throw new SafeFetchError('DNS resolved to a non-public address')
  }
  return url
}

function allowedImageMime(value: string) {
  const mime = value.split(';', 1)[0].trim().toLowerCase()
  return [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
  ].includes(mime)
}

export function imageMimeFromMagic(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value
    )
  )
    return 'image/png'
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return 'image/jpeg'
  if (
    bytes.length >= 6 &&
    (new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF87a' ||
      new TextDecoder().decode(bytes.slice(0, 6)) === 'GIF89a')
  )
    return 'image/gif'
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp'
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(4, 8)) === 'ftyp' &&
    ['avif', 'avis'].includes(new TextDecoder().decode(bytes.slice(8, 12)))
  )
    return 'image/avif'
  return null
}

export function decodeImageDataUrl(
  value: string,
  maxBytes = DEFAULT_MAX_IMAGE_BYTES
) {
  if (typeof value !== 'string' || !value.toLowerCase().startsWith('data:'))
    throw new SafeFetchError('Not a data URL')
  const match =
    /^data:(image\/(?:jpeg|png|gif|webp|avif));base64,([a-z0-9+/]*={0,2})$/i.exec(
      value
    )
  if (!match)
    throw new SafeFetchError('Only base64 image data URLs are allowed')
  const encoded = match[2]
  if (
    encoded.length > Math.ceil(maxBytes / 3) * 4 + 4 ||
    encoded.length % 4 === 1
  )
    throw new SafeFetchError('Image data exceeds the maximum size')
  const bytes = Uint8Array.from(Buffer.from(encoded, 'base64'))
  if (bytes.length > maxBytes)
    throw new SafeFetchError('Image data exceeds the maximum size')
  const magic = imageMimeFromMagic(bytes)
  if (!magic || magic !== match[1].toLowerCase())
    throw new SafeFetchError(
      'Image data magic bytes do not match its MIME type'
    )
  return { bytes, mimeType: magic }
}

export function createSafeDispatcher(connectTimeoutMs: number) {
  const lookup = (
    hostname: string,
    _options: dns.LookupOptions,
    callback: (
      error: NodeJS.ErrnoException | null,
      addresses: Array<{ address: string; family: 4 | 6; ttl: number }>
    ) => void
  ) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (error, records) => {
      if (error) return callback(error, [])
      if (
        records.length === 0 ||
        records.some(record => classifyIpAddress(record.address) !== 'public')
      ) {
        const unsafe = new SafeFetchError(
          'DNS resolved to a non-public address'
        )
        return callback(Object.assign(unsafe, { code: 'EHOSTUNREACH' }), [])
      }
      callback(
        null,
        records.map(record => ({
          address: record.address,
          family: record.family as 4 | 6,
          ttl: 0,
        }))
      )
    })
  }
  return new Agent({
    connect: { timeout: connectTimeoutMs },
    interceptors: {
      Agent: [dnsInterceptor({ maxTTL: 0, lookup })],
      Client: [],
    },
  })
}

async function readLimitedBody(
  response: Response,
  maxBytes: number,
  signal: AbortSignal
) {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes)
    throw new SafeFetchError('Response exceeds the maximum size')
  if (!response.body) throw new SafeFetchError('Response has no body')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      if (signal.aborted)
        throw new SafeFetchError('Request timed out or was aborted')
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes)
        throw new SafeFetchError('Response exceeds the maximum size')
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export async function safeFetchImage(
  value: string,
  options: {
    maxBytes?: number
    maxRedirects?: number
    timeoutMs?: number
    connectTimeoutMs?: number
    signal?: AbortSignal
  } = {}
) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TOTAL_TIMEOUT_MS
  const connectTimeoutMs =
    options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
  let current = await validateSafeUrl(value)
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(options.signal?.reason)
  if (options.signal?.aborted) abortFromCaller()
  else
    options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const dispatcher = createSafeDispatcher(connectTimeoutMs)
  try {
    for (let redirect = 0; ; redirect++) {
      await validateSafeUrl(current.href)
      const response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        dispatcher: dispatcher as any,
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location || redirect >= maxRedirects)
          throw new SafeFetchError('Too many or invalid redirects')
        current = await validateSafeUrl(new URL(location, current).href)
        continue
      }
      if (!response.ok)
        throw new SafeFetchError(
          `Image fetch failed with status ${response.status}`
        )
      const contentType = response.headers.get('content-type') || ''
      if (!allowedImageMime(contentType))
        throw new SafeFetchError(
          'Response is not an allowed image content type'
        )
      const bytes = await readLimitedBody(response, maxBytes, controller.signal)
      const magic = imageMimeFromMagic(bytes)
      if (!magic || magic !== contentType.split(';', 1)[0].trim().toLowerCase())
        throw new SafeFetchError('Image magic bytes do not match content type')
      return { bytes, mimeType: magic, url: current.href }
    }
  } catch (error) {
    if (controller.signal.aborted)
      throw new SafeFetchError('Image fetch timed out or was aborted')
    throw error
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abortFromCaller)
    await dispatcher.close().catch(() => undefined)
  }
}
