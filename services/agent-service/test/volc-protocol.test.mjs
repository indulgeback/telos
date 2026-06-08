import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeVolcFrame,
  encodeVolcAudioEvent,
  encodeVolcFrame,
  encodeVolcJsonEvent,
  VOLC_COMPRESSION,
  VOLC_EVENTS,
  VOLC_FLAGS,
  VOLC_MESSAGE_TYPES,
  VOLC_SERIALIZATION,
} from '../dist/services/realtime/volc-protocol.js'

test('encodes connection events without a session id', () => {
  const frame = decodeVolcFrame(
    encodeVolcJsonEvent(VOLC_EVENTS.START_CONNECTION, {}, 1, 'ignored-session')
  )

  assert.equal(frame.messageType, VOLC_MESSAGE_TYPES.FULL_CLIENT_REQUEST)
  assert.equal(frame.flags, VOLC_FLAGS.EVENT)
  assert.equal(frame.serialization, VOLC_SERIALIZATION.JSON)
  assert.equal(frame.compression, VOLC_COMPRESSION.NONE)
  assert.equal(frame.event, VOLC_EVENTS.START_CONNECTION)
  assert.equal(frame.sessionId, undefined)
  assert.deepEqual(frame.json, {})
})

test('encodes session events with session id before payload', () => {
  const frame = decodeVolcFrame(
    encodeVolcJsonEvent(
      VOLC_EVENTS.START_SESSION,
      { dialog: { extra: { input_mod: 'text' } } },
      2,
      'session-1'
    )
  )

  assert.equal(frame.event, VOLC_EVENTS.START_SESSION)
  assert.equal(frame.sessionId, 'session-1')
  assert.deepEqual(frame.json, { dialog: { extra: { input_mod: 'text' } } })
})

test('encodes raw audio task requests as full client event frames', () => {
  const frame = decodeVolcFrame(
    encodeVolcAudioEvent(
      VOLC_EVENTS.TASK_REQUEST,
      Buffer.from([1, 2, 3, 4]),
      3,
      'session-1'
    )
  )

  assert.equal(frame.messageType, VOLC_MESSAGE_TYPES.AUDIO_ONLY_REQUEST)
  assert.equal(frame.flags, VOLC_FLAGS.EVENT)
  assert.equal(frame.serialization, VOLC_SERIALIZATION.RAW)
  assert.equal(frame.compression, VOLC_COMPRESSION.NONE)
  assert.equal(frame.event, VOLC_EVENTS.TASK_REQUEST)
  assert.equal(frame.sessionId, 'session-1')
  assert.deepEqual([...frame.payload], [1, 2, 3, 4])
})

test('decodes server connection events with connect id', () => {
  const frame = decodeVolcFrame(
    encodeVolcFrame({
      messageType: VOLC_MESSAGE_TYPES.FULL_SERVER_RESPONSE,
      flags: VOLC_FLAGS.EVENT,
      serialization: VOLC_SERIALIZATION.JSON,
      compression: VOLC_COMPRESSION.NONE,
      event: VOLC_EVENTS.CONNECTION_STARTED,
      sessionId: 'connect-1',
      payload: {},
    })
  )

  assert.equal(frame.event, VOLC_EVENTS.CONNECTION_STARTED)
  assert.equal(frame.sessionId, 'connect-1')
  assert.equal(frame.connectId, undefined)
  assert.deepEqual(frame.json, {})
})
