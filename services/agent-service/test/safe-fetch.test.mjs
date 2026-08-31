import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyIpAddress,
  decodeImageDataUrl,
  isPublicIpAddress,
  validateSafeUrl,
  validateUrlSyntax,
} from '../dist/services/safe-fetch.js'

test('classifies public, private, local and metadata addresses', () => {
  assert.equal(classifyIpAddress('8.8.8.8'), 'public')
  assert.equal(classifyIpAddress('10.0.0.1'), 'private')
  assert.equal(classifyIpAddress('192.168.1.1'), 'private')
  assert.equal(classifyIpAddress('127.0.0.1'), 'loopback')
  assert.equal(classifyIpAddress('169.254.169.254'), 'metadata')
  assert.equal(classifyIpAddress('198.18.0.1'), 'reserved')
  assert.equal(classifyIpAddress('240.0.0.1'), 'reserved')
  assert.equal(classifyIpAddress('fc00::1'), 'private')
  assert.equal(classifyIpAddress('fe80::1'), 'link-local')
  assert.equal(classifyIpAddress('::1'), 'loopback')
  assert.equal(classifyIpAddress('ff02::1'), 'multicast')
  assert.equal(classifyIpAddress('::ffff:10.0.0.1'), 'private')
  assert.equal(classifyIpAddress('::10.0.0.1'), 'private')
  assert.equal(classifyIpAddress('64:ff9b::a00:1'), 'reserved')
  assert.equal(classifyIpAddress('2002:0a00:0001::'), 'reserved')
  assert.equal(isPublicIpAddress('1.1.1.1'), true)
  assert.equal(isPublicIpAddress('100.64.0.1'), false)
})

test('rejects unsafe URL syntax before any network lookup', () => {
  for (const value of [
    'http://localhost/image.png',
    'http://127.0.0.1/image.png',
    'http://[::1]/image.png',
    'http://10.0.0.1/image.png',
    'http://user:pass@example.com/image.png',
    'file:///etc/passwd',
    'data:image/png;base64,iVBORw0KGgo=',
  ]) {
    assert.throws(
      () => validateUrlSyntax(value),
      /not allowed|Only http|Localhost|IP address/
    )
  }
})

test('validates every resolved address, not just the first one', async () => {
  await assert.rejects(
    validateSafeUrl('https://example.com/image.png', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '192.168.0.2', family: 4 },
    ]),
    /non-public/
  )
  await assert.doesNotReject(
    validateSafeUrl('https://example.com/image.png', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '1.1.1.1', family: 4 },
    ])
  )
})

test('data image URLs are bounded and require matching magic bytes', () => {
  const png = decodeImageDataUrl('data:image/png;base64,iVBORw0KGgo=')
  assert.equal(png.mimeType, 'image/png')
  assert.equal(png.bytes.length, 8)
  assert.throws(
    () => decodeImageDataUrl('data:image/jpeg;base64,iVBORw0KGgo='),
    /magic bytes/
  )
  assert.throws(
    () => decodeImageDataUrl(`data:image/png;base64,${'A'.repeat(20_000)}`, 8),
    /maximum size/
  )
})

test('rejects local, internal and cloud-metadata hostnames', () => {
  assert.throws(
    () => validateUrlSyntax('http://sub.localhost/image.png'),
    /Localhost URLs are not allowed/
  )
  for (const value of [
    'http://printer.local/image.png',
    'http://db.internal/image.png',
    'http://metadata.google.internal/computeMetadata/v1/',
  ]) {
    assert.throws(
      () => validateUrlSyntax(value),
      /Local or metadata hostnames/
    )
  }
})

test('fails closed on DNS errors and skips lookup for literal IPs', async () => {
  await assert.rejects(
    validateSafeUrl('https://example.com/image.png', async () => {
      throw new Error('resolver down')
    }),
    /DNS lookup failed/
  )

  await assert.doesNotReject(
    validateSafeUrl('http://8.8.8.8/image.png', async () => {
      throw new Error('literal IPs must bypass the resolver')
    })
  )
})
