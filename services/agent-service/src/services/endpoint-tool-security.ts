const MAX_ENDPOINT_URL_LENGTH = 16_384
export const MAX_ENDPOINT_BODY_BYTES = 1024 * 1024
export const MAX_ENDPOINT_RESPONSE_BYTES = 1024 * 1024

const ALLOWED_METHODS = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
])
const FORBIDDEN_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

export function normalizeEndpointMethod(value: unknown) {
  const method = typeof value === 'string' ? value.toUpperCase() : 'GET'
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Unsupported endpoint tool method: ${method}`)
  }
  return method
}

/**
 * Templates may parameterize only path/query/fragment values. The authority
 * is an administrator-owned capability and cannot be supplied by model input.
 */
export function resolveEndpointToolUrl(template: string, filledValue: string) {
  const authority = /^https?:\/\/([^/?#]+)/i.exec(template)?.[1]
  if (!authority || authority.includes('{') || authority.includes('}')) {
    throw new Error('Endpoint tool templates must use a fixed http(s) origin')
  }
  if (filledValue.length > MAX_ENDPOINT_URL_LENGTH) {
    throw new Error('Endpoint tool URL exceeds the maximum length')
  }

  let templateUrl: URL
  let actualUrl: URL
  try {
    templateUrl = new URL(template.replace(/\{[^}]+\}/g, 'template-value'))
    actualUrl = new URL(filledValue)
  } catch {
    throw new Error('Endpoint tool URL is invalid')
  }
  if (
    !['http:', 'https:'].includes(actualUrl.protocol) ||
    templateUrl.username ||
    templateUrl.password ||
    actualUrl.username ||
    actualUrl.password
  ) {
    throw new Error('Endpoint tool URL must use http(s) without userinfo')
  }
  if (actualUrl.origin !== templateUrl.origin) {
    throw new Error('Endpoint tool input cannot change the configured origin')
  }
  return actualUrl
}

export function normalizeEndpointHeaders(value: Record<string, unknown>) {
  const headers: Record<string, string> = {}
  for (const [name, rawValue] of Object.entries(value)) {
    const normalizedName = name.trim().toLowerCase()
    if (!normalizedName || FORBIDDEN_HEADERS.has(normalizedName)) continue
    if (typeof rawValue === 'string') headers[name] = rawValue
  }
  return headers
}

export function assertEndpointBodySize(body: string | undefined) {
  if (body && Buffer.byteLength(body, 'utf8') > MAX_ENDPOINT_BODY_BYTES) {
    throw new Error('Endpoint tool request body exceeds the maximum size')
  }
}

export async function readBoundedEndpointResponse(
  response: Response,
  signal: AbortSignal
) {
  const declaredLength = Number(response.headers.get('content-length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_ENDPOINT_RESPONSE_BYTES
  ) {
    throw new Error('Endpoint tool response exceeds the maximum size')
  }
  if (!response.body) return ''

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      if (signal.aborted) throw new Error('Endpoint tool request was aborted')
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_ENDPOINT_RESPONSE_BYTES) {
        throw new Error('Endpoint tool response exceeds the maximum size')
      }
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
  return new TextDecoder().decode(bytes)
}
