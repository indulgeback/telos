import type { McpServer } from '@prisma/client'
import { asRecord } from '../utils/json.js'

/**
 * MCP configuration is admin-owned.  A server can opt in to user assignment
 * through a deliberately small, non-sensitive metadata flag.  stdio is never
 * assignable by ordinary users because it starts a local process.
 */
export function isMcpUserAssignable(
  server: Pick<McpServer, 'transport' | 'metadata' | 'enabled'>
) {
  return (
    server.enabled &&
    server.transport !== 'stdio' &&
    asRecord(server.metadata).userAssignable === true
  )
}

export function canBindMcpServer(
  server: Pick<McpServer, 'transport' | 'metadata' | 'enabled'>,
  isAdmin: boolean
) {
  return isAdmin || isMcpUserAssignable(server)
}

/** Fields safe to expose to a non-admin.  Never include endpoint credentials. */
export function safeMcpServer(server: McpServer) {
  return {
    id: server.id,
    name: server.name,
    description: server.description,
    transport: server.transport,
    enabled: server.enabled,
  }
}

export function safeMcpBinding(binding: any) {
  return {
    id: binding.id,
    agentId: binding.agentId,
    mcpServerId: binding.mcpServerId,
    enabled: binding.enabled,
    allowedTools: binding.allowedTools,
    sortOrder: binding.sortOrder,
    mcpServer: binding.mcpServer ? safeMcpServer(binding.mcpServer) : undefined,
  }
}
