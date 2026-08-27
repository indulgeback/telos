import assert from 'node:assert/strict'
import test from 'node:test'
import { getRunEventsWriteOptions } from '../dist/services/run-events.js'

test('run event Redis writes are bounded and never offline queued', () => {
  const options = getRunEventsWriteOptions()

  assert.equal(options.lazyConnect, true)
  assert.equal(options.enableOfflineQueue, false)
  assert.equal(options.autoResendUnfulfilledCommands, false)
  assert.equal(options.connectTimeout, 1_000)
  assert.equal(options.commandTimeout, 2_000)
  assert.equal(options.maxRetriesPerRequest, 1)
  assert.equal(options.retryStrategy(1), 100)
  assert.equal(options.retryStrategy(2), 200)
  assert.equal(options.retryStrategy(3), null)
})
