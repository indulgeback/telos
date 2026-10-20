import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  filterVoiceToolRaws,
  parseVoiceFunctionCallEvent,
} from '../dist/services/realtime/volc-realtime.js'

function makeToolRow(overrides = {}) {
  return {
    id: 'tool_test',
    name: 'get_current_time',
    displayName: 'Get time',
    description: 'Returns the current time',
    category: 'builtin',
    enabled: true,
    endpoint: { kind: 'builtin', builtin: 'get_current_time' },
    parameters: { type: 'object', properties: {} },
    responseTransform: null,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('filterVoiceToolRaws', () => {
  it('keeps safe builtin tools', () => {
    const filtered = filterVoiceToolRaws([makeToolRow()])
    assert.deepEqual(
      filtered.map(row => row.name),
      ['get_current_time']
    )
  })

  it('keeps custom HTTP tools explicitly tagged user-assignable', () => {
    const rows = [
      makeToolRow({
        id: 'tool_weather',
        name: 'weather',
        endpoint: {
          url_template: 'https://example.com',
          method: 'GET',
        },
        tags: ['user-assignable'],
      }),
    ]
    assert.equal(filterVoiceToolRaws(rows).length, 1)
  })

  it('excludes approval-required builtins like run_command', () => {
    const rows = [
      makeToolRow(),
      makeToolRow({
        id: 'tool_run_command',
        name: 'run_command',
        endpoint: { kind: 'builtin', builtin: 'run_command' },
      }),
    ]
    assert.deepEqual(
      filterVoiceToolRaws(rows).map(row => row.name),
      ['get_current_time']
    )
  })

  it('excludes tools tagged as approval-required', () => {
    const rows = [
      makeToolRow({ tags: ['approval-required'] }),
      makeToolRow({ id: 'tool_ok' }),
    ]
    const filtered = filterVoiceToolRaws(rows)
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].id, 'tool_ok')
  })

  it('excludes custom tools without the user-assignable tag', () => {
    const rows = [
      makeToolRow({
        id: 'tool_admin',
        name: 'admin_tool',
        endpoint: { url_template: 'https://example.com', method: 'GET' },
        tags: ['admin-only'],
      }),
      makeToolRow({ id: 'tool_ok' }),
    ]
    const filtered = filterVoiceToolRaws(rows)
    assert.deepEqual(
      filtered.map(row => row.id),
      ['tool_ok']
    )
  })

  it('excludes disabled tools', () => {
    const rows = [makeToolRow({ enabled: false }), makeToolRow({ id: 'tool_ok' })]
    const filtered = filterVoiceToolRaws(rows)
    assert.deepEqual(
      filtered.map(row => row.id),
      ['tool_ok']
    )
  })

  it('caps the toolset at 16 entries', () => {
    const rows = Array.from({ length: 20 }, (_, index) =>
      makeToolRow({ id: `tool_${index}`, name: `calc_${index}` })
    )
    assert.equal(filterVoiceToolRaws(rows).length, 16)
  })
})

describe('parseVoiceFunctionCallEvent', () => {
  it('parses the flat event envelope', () => {
    const parsed = parseVoiceFunctionCallEvent({
      call_id: 'call-1',
      name: 'generate_image',
      arguments: '{"prompt":"a cat"}',
    })
    assert.equal(parsed.callId, 'call-1')
    assert.equal(parsed.name, 'generate_image')
    assert.equal(parsed.argsRaw, '{"prompt":"a cat"}')
  })

  it('parses a nested item envelope', () => {
    const parsed = parseVoiceFunctionCallEvent({
      item: {
        callId: 'call-2',
        name: 'calculator',
        arguments: '{"expression":"1+1"}',
      },
    })
    assert.equal(parsed.callId, 'call-2')
    assert.equal(parsed.name, 'calculator')
    assert.equal(parsed.argsRaw, '{"expression":"1+1"}')
  })

  it('synthesizes a callId and keeps empty fields when the event is malformed', () => {
    const parsed = parseVoiceFunctionCallEvent({})
    assert.match(parsed.callId, /^[0-9a-f-]{36}$/)
    assert.equal(parsed.name, '')
    assert.equal(parsed.argsRaw, '')
  })
})
