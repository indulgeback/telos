import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

process.env.VOLC_REALTIME_APP_ID = 'test-app'
process.env.VOLC_REALTIME_ACCESS_KEY = 'test-key'
process.env.VOLC_REALTIME_DEMO = 'false'

const protocol = await import('../dist/services/realtime/volc-protocol.js')
const realtime = await import('../dist/services/realtime/volc-realtime.js')

const {
  decodeVolcFrame,
  encodeVolcFrame,
  VOLC_COMPRESSION,
  VOLC_EVENTS,
  VOLC_FLAGS,
  VOLC_MESSAGE_TYPES,
  VOLC_SERIALIZATION,
} = protocol
const { getVolcRealtimeDiagnostics, runVolcRealtimeTextTurn } = realtime

class FakeVolcSocket extends EventEmitter {
  static instances = []

  readyState = 0
  sentEvents = []
  onopen = undefined
  onmessage = undefined
  onerror = undefined
  onclose = undefined

  constructor(connectId) {
    super()
    this.connectId = connectId
    FakeVolcSocket.instances.push(this)
    queueMicrotask(() => {
      this.readyState = 1
      this.onopen?.()
      this.emit('open', {})
    })
  }

  addEventListener(type, listener) {
    this.on(type, listener)
  }

  removeEventListener(type, listener) {
    this.off(type, listener)
  }

  send(data) {
    const frame = decodeVolcFrame(data)
    this.sentEvents.push(frame.event)

    if (frame.event === VOLC_EVENTS.START_CONNECTION) {
      this.emitServerEvent(VOLC_EVENTS.CONNECTION_STARTED, {}, {
        connectId: this.connectId,
      })
      return
    }

    if (frame.event === VOLC_EVENTS.START_SESSION) {
      this.emitServerEvent(VOLC_EVENTS.SESSION_STARTED, {}, {
        sessionId: frame.sessionId,
      })
      return
    }

    if (frame.event === VOLC_EVENTS.SAY_HELLO) {
      this.emitServerEvent(VOLC_EVENTS.CHAT_RESPONSE, { text: '你好，Telos' }, {
        sessionId: frame.sessionId,
      })
      this.emitServerEvent(VOLC_EVENTS.CHAT_ENDED, {}, {
        sessionId: frame.sessionId,
      })
    }
  }

  close(_code, reason = 'closed') {
    this.readyState = 3
    this.onclose?.({ reason })
    this.emit('close', { reason })
  }

  emitServerEvent(event, payload, ids = {}) {
    queueMicrotask(() => {
      const data = encodeVolcFrame({
        messageType: VOLC_MESSAGE_TYPES.FULL_SERVER_RESPONSE,
        flags: VOLC_FLAGS.EVENT,
        serialization: VOLC_SERIALIZATION.JSON,
        compression: VOLC_COMPRESSION.NONE,
        event,
        sessionId: ids.sessionId,
        connectId: ids.connectId,
        payload,
      })
      this.onmessage?.({ data })
      this.emit('message', { data })
    })
  }
}

test('text turn waits for connection and session acknowledgements before query', async () => {
  FakeVolcSocket.instances.length = 0
  const writes = []

  await runVolcRealtimeTextTurn(
    {
      input: '测试握手顺序',
      sessionId: 'session-1',
      connectId: 'connect-1',
      socketFactory: connectId => new FakeVolcSocket(connectId),
    },
    (type, payload = {}) => writes.push({ type, payload })
  )

  const socket = FakeVolcSocket.instances[0]
  assert.ok(socket)
  assert.deepEqual(socket.sentEvents.slice(0, 3), [
    VOLC_EVENTS.START_CONNECTION,
    VOLC_EVENTS.START_SESSION,
    VOLC_EVENTS.SAY_HELLO,
  ])
  assert.equal(
    socket.sentEvents.indexOf(VOLC_EVENTS.START_SESSION) >
      socket.sentEvents.indexOf(VOLC_EVENTS.START_CONNECTION),
    true
  )
  assert.equal(
    socket.sentEvents.indexOf(VOLC_EVENTS.SAY_HELLO) >
      socket.sentEvents.indexOf(VOLC_EVENTS.START_SESSION),
    true
  )
  assert.ok(
    writes.some(
      event =>
        event.type === 'response.output_text.delta' &&
        event.payload.delta === '你好，Telos'
    )
  )
  assert.ok(writes.some(event => event.type === 'response.completed'))
})

test('diagnostics report real connection readiness from credentials', () => {
  const diagnostics = getVolcRealtimeDiagnostics()

  assert.equal(diagnostics.configured, true)
  assert.equal(diagnostics.readyForRealConnection, true)
  assert.equal(diagnostics.demo, false)
  assert.equal(diagnostics.mode, 'real')
  assert.deepEqual(diagnostics.missingEnv, [])
})

test('diagnostics report missing credentials in a clean process', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      [
        "import { getVolcRealtimeDiagnostics } from './dist/services/realtime/volc-realtime.js'",
        'const diagnostics = getVolcRealtimeDiagnostics()',
        'console.log(JSON.stringify(diagnostics))',
      ].join(';'),
    ],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
      env: {
        ...process.env,
        VOLC_REALTIME_APP_ID: '',
        VOLC_REALTIME_ACCESS_KEY: '',
        VOLC_REALTIME_DEMO: 'false',
      },
    }
  )

  assert.equal(result.status, 0, result.stderr)
  const diagnostics = JSON.parse(result.stdout.trim().split('\n').at(-1))
  assert.equal(diagnostics.configured, false)
  assert.equal(diagnostics.readyForRealConnection, false)
  assert.deepEqual(diagnostics.missingEnv, [
    'VOLC_REALTIME_APP_ID',
    'VOLC_REALTIME_ACCESS_KEY',
  ])
})
