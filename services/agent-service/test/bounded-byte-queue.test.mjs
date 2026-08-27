import assert from 'node:assert/strict'
import test from 'node:test'

import { BoundedByteQueue } from '../dist/services/bounded-byte-queue.js'

test('bounded byte queue accounts bytes and preserves FIFO order', () => {
  const queue = new BoundedByteQueue(5)
  const first = Uint8Array.from([1, 2])
  const second = Uint8Array.from([3, 4, 5])

  assert.equal(queue.push(first), true)
  assert.equal(queue.push(second), true)
  assert.equal(queue.byteLength, 5)
  assert.equal(queue.push(Uint8Array.of(6)), false)
  assert.deepEqual(queue.shift(), first)
  assert.deepEqual(queue.shift(), second)
  assert.equal(queue.byteLength, 0)
})

test('bounded byte queue rejects invalid limits and can be cleared', () => {
  assert.throws(() => new BoundedByteQueue(0), /positive safe integer/)
  const queue = new BoundedByteQueue(3)
  queue.push(Uint8Array.of(1, 2, 3))
  queue.clear()
  assert.equal(queue.length, 0)
  assert.equal(queue.byteLength, 0)
})
