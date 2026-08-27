import assert from 'node:assert/strict'
import test from 'node:test'
import { signSdkState, verifySdkState } from '../dist/services/sdk-state.js'

test('durable SDK state signature binds run, agent, version, and snapshot', () => {
  const state = {
    runId: 'run-1',
    agentId: 'agent-1',
    stateVersion: 3,
    sdkState: '{"pending":"call-1"}',
  }
  const signature = signSdkState(state)
  assert.match(signature, /^[a-f\d]{64}$/)
  assert.equal(verifySdkState(state, signature), true)
  assert.equal(verifySdkState({ ...state, runId: 'run-2' }, signature), false)
  assert.equal(
    verifySdkState({ ...state, agentId: 'agent-2' }, signature),
    false
  )
  assert.equal(verifySdkState({ ...state, stateVersion: 4 }, signature), false)
  assert.equal(
    verifySdkState({ ...state, sdkState: `${state.sdkState}x` }, signature),
    false
  )
})
