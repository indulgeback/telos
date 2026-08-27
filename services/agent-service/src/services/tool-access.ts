import type { Tool as DbTool } from '@prisma/client'
import { asRecord, asStringArray } from '../utils/json.js'
import {
  isBuiltinRunCommandTool,
  isBuiltinToolAllowed,
} from './builtin-tools.js'

function isDeclaredBuiltinTool(tool: Pick<DbTool, 'endpoint'>) {
  return String(asRecord(tool.endpoint).kind || '').toLowerCase() === 'builtin'
}

/**
 * Tool definitions are global, admin-owned capabilities. Builtins are safe to
 * assign by default (subject to their runtime switches); custom endpoints must
 * be explicitly tagged by an administrator.
 */
export function isToolUserAssignable(
  tool: Pick<DbTool, 'id' | 'name' | 'endpoint' | 'tags' | 'enabled'>
) {
  if (!tool.enabled || !isBuiltinToolAllowed(tool)) return false
  if (isDeclaredBuiltinTool(tool)) return !isBuiltinRunCommandTool(tool)
  const tags = new Set(asStringArray(tool.tags).map(tag => tag.toLowerCase()))
  return tags.has('user-assignable') || tags.has('user_assignable')
}

/** Never expose endpoint credentials, transforms, or rate-limit internals. */
export function safeTool(tool: DbTool) {
  return {
    id: tool.id,
    name: tool.name,
    type: tool.type,
    displayName: tool.displayName,
    description: tool.description,
    category: tool.category,
    parameters: tool.parameters,
    enabled: tool.enabled,
    version: tool.version,
    tags: tool.tags,
    createdAt: tool.createdAt,
    updatedAt: tool.updatedAt,
  }
}

export function safeAgentToolBinding(binding: any) {
  return {
    id: binding.id,
    agentId: binding.agentId,
    toolId: binding.toolId,
    enabled: binding.enabled,
    sortOrder: binding.sortOrder,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
    tool: binding.tool ? safeTool(binding.tool) : undefined,
  }
}
