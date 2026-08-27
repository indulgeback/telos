import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canBindMcpServer,
  isMcpUserAssignable,
  safeMcpServer,
} from '../dist/services/mcp-access.js'

const publicHttpServer = {
  id: 'mcp-public',
  name: 'Public HTTP MCP',
  description: 'safe description',
  transport: 'sse',
  enabled: true,
  metadata: { userAssignable: true },
  command: 'secret-command',
  args: ['--secret'],
  url: 'http://internal.example',
  env: { TOKEN: 'secret' },
}

test('MCP assignment is explicit and never permits stdio for users', () => {
  assert.equal(isMcpUserAssignable(publicHttpServer), true)
  assert.equal(canBindMcpServer(publicHttpServer, false), true)
  assert.equal(
    isMcpUserAssignable({ ...publicHttpServer, transport: 'stdio' }),
    false
  )
  assert.equal(
    isMcpUserAssignable({
      ...publicHttpServer,
      metadata: { userAssignable: false },
    }),
    false
  )
  assert.equal(
    canBindMcpServer({ ...publicHttpServer, enabled: false }, false),
    false
  )
  assert.equal(
    canBindMcpServer({ ...publicHttpServer, enabled: false }, true),
    true
  )
})

test('safe MCP serialization strips execution and credential fields', () => {
  const safe = safeMcpServer(publicHttpServer)
  assert.deepEqual(safe, {
    id: 'mcp-public',
    name: 'Public HTTP MCP',
    description: 'safe description',
    transport: 'sse',
    enabled: true,
  })
  for (const field of ['command', 'args', 'url', 'env', 'metadata']) {
    assert.equal(field in safe, false, `unexpected sensitive field: ${field}`)
  }
})
