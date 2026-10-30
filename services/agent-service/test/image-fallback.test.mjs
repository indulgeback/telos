import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  mapArkSize,
  mapWanxSize,
} from '../dist/services/image-generator.js'

test('ark size maps all supported aspect ratios', () => {
  assert.equal(mapArkSize('1:1'), '2048x2048')
  assert.equal(mapArkSize('9:16'), '1152x2048')
  assert.equal(mapArkSize('16:9'), '2048x1152')
  assert.equal(mapArkSize('4:3'), '2048x1536')
  assert.equal(mapArkSize('3:4'), '1536x2048')
  assert.equal(mapArkSize(undefined), '2048x2048')
})

test('wanx size maps all supported aspect ratios', () => {
  assert.equal(mapWanxSize('1:1'), '1024*1024')
  assert.equal(mapWanxSize('9:16'), '720*1280')
  assert.equal(mapWanxSize('16:9'), '1280*720')
  assert.equal(mapWanxSize('4:3'), '1024*768')
  assert.equal(mapWanxSize('3:4'), '768*1024')
  assert.equal(mapWanxSize(undefined), '1024*1024')
})
