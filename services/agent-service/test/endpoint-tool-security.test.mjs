import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertEndpointBodySize,
  normalizeEndpointHeaders,
  normalizeEndpointMethod,
  readBoundedEndpointResponse,
  resolveEndpointToolUrl,
} from '../dist/services/endpoint-tool-security.js'

test('endpoint templates cannot delegate their origin to model input', () => {
  assert.throws(
    () => resolveEndpointToolUrl('http://{host}/v1', 'http://127.0.0.1/v1'),
    /fixed http\(s\) origin/
  )
  assert.throws(
    () =>
      resolveEndpointToolUrl(
        'https://api.example.com/{path}',
        'https://evil.example/v1'
      ),
    /cannot change/
  )
  assert.equal(
    resolveEndpointToolUrl(
      'https://api.example.com/search?q={query}',
      'https://api.example.com/search?q=test'
    ).origin,
    'https://api.example.com'
  )
})

test('endpoint requests use a method allowlist and strip hop-by-hop headers', () => {
  assert.equal(normalizeEndpointMethod('post'), 'POST')
  assert.throws(() => normalizeEndpointMethod('CONNECT'), /Unsupported/)
  assert.deepEqual(
    normalizeEndpointHeaders({
      Host: 'metadata.google.internal',
      Connection: 'keep-alive',
      Authorization: 'Bearer configured-secret',
      Invalid: 123,
    }),
    { Authorization: 'Bearer configured-secret' }
  )
})

test('endpoint request and response bodies are bounded', async () => {
  assert.throws(
    () => assertEndpointBodySize('x'.repeat(1024 * 1024 + 1)),
    /maximum size/
  )
  const response = new Response('small response')
  assert.equal(
    await readBoundedEndpointResponse(response, new AbortController().signal),
    'small response'
  )
  await assert.rejects(
    readBoundedEndpointResponse(
      new Response('x', {
        headers: { 'content-length': String(1024 * 1024 + 1) },
      }),
      new AbortController().signal
    ),
    /maximum size/
  )
})
