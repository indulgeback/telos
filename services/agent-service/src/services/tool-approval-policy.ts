import { asRecord, asStringArray } from '../utils/json.js'

const APPROVAL_REQUIRED_TAGS = new Set([
  'approval-required',
  'requires-approval',
  'sensitive',
])
const APPROVAL_EXEMPT_TAGS = new Set(['approval-exempt', 'no-approval'])

/**
 * Server-owned default approval policy for locally defined tools.
 *
 * - `run_command` always interrupts before execution.
 * - Explicit sensitive/approval tags always interrupt.
 * - HTTP methods that commonly mutate state interrupt unless an administrator
 *   deliberately tagged the global tool as approval-exempt.
 */
export function toolRequiresApproval(raw: {
  id?: unknown
  name?: unknown
  endpoint?: unknown
  tags?: unknown
}) {
  const endpoint = asRecord(raw.endpoint)
  const tags = new Set(
    asStringArray(raw.tags).map(value => value.trim().toLowerCase())
  )
  if ([...tags].some(tag => APPROVAL_REQUIRED_TAGS.has(tag))) return true

  const kind = String(endpoint.kind ?? '')
    .trim()
    .toLowerCase()
  const builtin = String(endpoint.builtin ?? raw.name ?? raw.id ?? '')
    .trim()
    .toLowerCase()
    .replace(/^builtin_/, '')
  if (kind === 'builtin') return builtin === 'run_command'

  if ([...tags].some(tag => APPROVAL_EXEMPT_TAGS.has(tag))) return false
  const method = String(endpoint.method ?? 'GET')
    .trim()
    .toUpperCase()
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
}

export function mcpToolRequiresApproval(options: {
  policy: string
  toolName: string
  sensitiveTools: string[]
}) {
  if (options.policy === 'all') return true
  if (options.policy !== 'sensitive') return false
  // A sensitive policy with no classification must fail closed. Otherwise a
  // configuration typo silently turns approval off for every MCP capability.
  if (options.sensitiveTools.length === 0) return true
  const sensitive = new Set(
    options.sensitiveTools.map(value => value.trim().toLowerCase())
  )
  return sensitive.has(options.toolName.trim().toLowerCase())
}
