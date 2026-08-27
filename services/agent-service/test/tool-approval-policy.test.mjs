import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mcpToolRequiresApproval,
  toolRequiresApproval,
} from '../dist/services/tool-approval-policy.js'

test('local tool approval defaults protect command and mutating endpoints', () => {
  assert.equal(
    toolRequiresApproval({
      name: 'run_command',
      endpoint: { kind: 'builtin', builtin: 'run_command' },
    }),
    true
  )
  assert.equal(
    toolRequiresApproval({
      name: 'write_file',
      endpoint: { kind: 'builtin', builtin: 'write_file' },
    }),
    false
  )
  assert.equal(toolRequiresApproval({ endpoint: { method: 'POST' } }), true)
  assert.equal(
    toolRequiresApproval({
      endpoint: { method: 'POST' },
      tags: ['approval-exempt'],
    }),
    false
  )
  assert.equal(
    toolRequiresApproval({
      endpoint: { method: 'GET' },
      tags: ['sensitive'],
    }),
    true
  )
})

test('MCP sensitive policy fails closed without a classification', () => {
  assert.equal(
    mcpToolRequiresApproval({
      policy: 'sensitive',
      toolName: 'delete_record',
      sensitiveTools: [],
    }),
    true
  )
  assert.equal(
    mcpToolRequiresApproval({
      policy: 'sensitive',
      toolName: 'read_record',
      sensitiveTools: ['delete_record'],
    }),
    false
  )
  assert.equal(
    mcpToolRequiresApproval({
      policy: 'all',
      toolName: 'read_record',
      sensitiveTools: [],
    }),
    true
  )
})
