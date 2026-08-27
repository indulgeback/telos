import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isToolUserAssignable,
  safeAgentToolBinding,
  safeTool,
} from '../dist/services/tool-access.js'

const base = {
  id: 'tool-1',
  name: 'custom',
  type: 'invokable',
  displayName: 'Custom',
  description: 'Custom endpoint',
  category: 'custom',
  endpoint: {
    kind: 'http',
    url_template: 'https://example.com/{query}',
    headers: { Authorization: 'Bearer secret' },
  },
  parameters: { type: 'object' },
  responseTransform: { wrapper_text: '{output}' },
  rateLimit: { max: 1 },
  enabled: true,
  version: '1.0.0',
  tags: [],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

test('custom tools require an explicit user-assignable tag', () => {
  assert.equal(isToolUserAssignable(base), false)
  assert.equal(
    isToolUserAssignable({ ...base, tags: ['user-assignable'] }),
    true
  )
})

test('run_command remains non-assignable while safe builtins are assignable', () => {
  assert.equal(
    isToolUserAssignable({
      ...base,
      id: 'builtin_calculator',
      name: 'calculator',
      category: 'builtin',
      endpoint: { kind: 'builtin', builtin: 'calculator' },
    }),
    true
  )
  assert.equal(
    isToolUserAssignable({
      ...base,
      id: 'builtin_run_command',
      name: 'run_command',
      category: 'builtin',
      endpoint: { kind: 'builtin', builtin: 'run_command' },
    }),
    false
  )
  assert.equal(
    isToolUserAssignable({
      ...base,
      id: 'builtin_future_admin',
      name: 'future_admin',
      category: 'builtin',
      endpoint: { kind: 'builtin', builtin: 'future_admin' },
    }),
    false
  )
})

test('safe tool serialization strips endpoint credentials and internals', () => {
  const serialized = safeTool({ ...base, tags: ['user-assignable'] })
  assert.equal('endpoint' in serialized, false)
  assert.equal('responseTransform' in serialized, false)
  assert.equal('rateLimit' in serialized, false)

  const binding = safeAgentToolBinding({
    id: 'binding-1',
    agentId: 'agent-1',
    toolId: base.id,
    enabled: true,
    config: { apiKey: 'binding-secret' },
    sortOrder: 0,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    tool: { ...base, tags: ['user-assignable'] },
  })
  assert.equal('config' in binding, false)
  assert.equal('endpoint' in binding.tool, false)
})
