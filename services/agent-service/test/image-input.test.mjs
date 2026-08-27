import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeUserImageParts } from '../dist/services/image-input.js'

test('normalizes only supported image shapes and enforces the attachment count', () => {
  const normalized = normalizeUserImageParts([
    'https://example.com/a.png',
    { type: 'image', url: 'https://example.com/b.png' },
    {
      type: 'image_url',
      image_url: { url: 'https://example.com/c.png' },
    },
    { type: 'arbitrary', url: 'https://example.com/ignored.png' },
  ])
  assert.equal(normalized.length, 3)
  assert.throws(
    () =>
      normalizeUserImageParts([
        'https://example.com/1.png',
        'https://example.com/2.png',
        'https://example.com/3.png',
        'https://example.com/4.png',
        'https://example.com/5.png',
      ]),
    /Too many/
  )
})

test('data images are bounded by decoded bytes rather than URL characters', () => {
  const bytes = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(40_000),
  ])
  const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`
  assert.ok(dataUrl.length > 32_768)
  assert.equal(normalizeUserImageParts([dataUrl]).length, 1)
})
