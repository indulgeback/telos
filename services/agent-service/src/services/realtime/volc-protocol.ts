import { gunzipSync, gzipSync } from 'node:zlib'

export const VOLC_EVENTS = {
  START_CONNECTION: 1,
  FINISH_CONNECTION: 2,
  CONNECTION_STARTED: 50,
  CONNECTION_FAILED: 51,
  CONNECTION_FINISHED: 52,
  START_SESSION: 100,
  CANCEL_SESSION: 101,
  FINISH_SESSION: 102,
  SESSION_STARTED: 150,
  SESSION_CANCELED: 151,
  SESSION_FINISHED: 152,
  SESSION_FAILED: 153,
  USAGE_RESPONSE: 154,
  TASK_REQUEST: 200,
  UPDATE_CONFIG: 201,
  AUDIO_MUTED: 250,
  SAY_HELLO: 300,
  TTS_SENTENCE_START: 350,
  TTS_SENTENCE_END: 351,
  TTS_RESPONSE: 352,
  TTS_ENDED: 359,
  END_ASR: 400,
  ASR_INFO: 450,
  ASR_RESPONSE: 451,
  ASR_ENDED: 459,
  CHAT_TTS_TEXT: 500,
  CHAT_TEXT_QUERY: 501,
  CHAT_RAG_TEXT: 502,
  CHAT_RESPONSE: 550,
  CHAT_ENDED: 559,
} as const

export const VOLC_MESSAGE_TYPES = {
  FULL_CLIENT_REQUEST: 0b0001,
  AUDIO_ONLY_REQUEST: 0b0010,
  FULL_SERVER_RESPONSE: 0b1001,
  AUDIO_ONLY_RESPONSE: 0b1011,
  ERROR: 0b1111,
} as const

export const VOLC_SERIALIZATION = {
  RAW: 0b0000,
  JSON: 0b0001,
} as const

export const VOLC_COMPRESSION = {
  NONE: 0b0000,
  GZIP: 0b0001,
} as const

export const VOLC_FLAGS = {
  NONE: 0b0000,
  SEQUENCE: 0b0001,
  LAST_NO_SEQUENCE: 0b0010,
  NEGATIVE_SEQUENCE: 0b0011,
  EVENT: 0b0100,
} as const

type VolcMessageType =
  (typeof VOLC_MESSAGE_TYPES)[keyof typeof VOLC_MESSAGE_TYPES]
type VolcSerialization =
  (typeof VOLC_SERIALIZATION)[keyof typeof VOLC_SERIALIZATION]
type VolcCompression =
  (typeof VOLC_COMPRESSION)[keyof typeof VOLC_COMPRESSION]

export interface EncodeVolcFrameOptions {
  messageType: VolcMessageType
  flags?: number
  serialization?: VolcSerialization
  compression?: VolcCompression
  event?: number
  sequence?: number
  sessionId?: string
  connectId?: string
  payload?: Buffer | Uint8Array | string | Record<string, unknown>
}

export interface DecodedVolcFrame {
  messageType: number
  flags: number
  serialization: number
  compression: number
  event?: number
  sequence?: number
  sessionId?: string
  connectId?: string
  payload: Buffer
  json?: unknown
  text?: string
}

function writeInt32(value: number) {
  const buffer = Buffer.allocUnsafe(4)
  buffer.writeInt32BE(value, 0)
  return buffer
}

function writeString(value: string) {
  const content = Buffer.from(value)
  return Buffer.concat([writeInt32(content.length), content])
}

function readInt32(buffer: Buffer, offset: number) {
  return {
    value: buffer.readInt32BE(offset),
    offset: offset + 4,
  }
}

function readString(buffer: Buffer, offset: number) {
  const length = buffer.readInt32BE(offset)
  const start = offset + 4
  const end = start + length
  return {
    value: buffer.subarray(start, end).toString('utf8'),
    offset: end,
  }
}

function eventHasSessionId(event: number | undefined) {
  return ![
    VOLC_EVENTS.START_CONNECTION,
    VOLC_EVENTS.FINISH_CONNECTION,
    VOLC_EVENTS.CONNECTION_STARTED,
    VOLC_EVENTS.CONNECTION_FAILED,
    VOLC_EVENTS.CONNECTION_FINISHED,
  ].includes(event as any)
}

function frameHasSessionId(messageType: number, event: number | undefined) {
  if (
    messageType === VOLC_MESSAGE_TYPES.FULL_SERVER_RESPONSE ||
    messageType === VOLC_MESSAGE_TYPES.AUDIO_ONLY_RESPONSE
  ) {
    return true
  }
  return eventHasSessionId(event)
}

function eventHasConnectId(event: number | undefined) {
  return [
    VOLC_EVENTS.CONNECTION_STARTED,
    VOLC_EVENTS.CONNECTION_FAILED,
    VOLC_EVENTS.CONNECTION_FINISHED,
  ].includes(event as any)
}

function normalizePayload(
  payload: EncodeVolcFrameOptions['payload'],
  serialization: VolcSerialization
) {
  if (payload === undefined) return Buffer.alloc(0)
  if (Buffer.isBuffer(payload)) return payload
  if (payload instanceof Uint8Array) return Buffer.from(payload)
  if (typeof payload === 'string') return Buffer.from(payload)
  if (serialization === VOLC_SERIALIZATION.JSON) {
    return Buffer.from(JSON.stringify(payload))
  }
  return Buffer.from(String(payload))
}

export function encodeVolcFrame(options: EncodeVolcFrameOptions) {
  const serialization = options.serialization ?? VOLC_SERIALIZATION.JSON
  const compression = options.compression ?? VOLC_COMPRESSION.NONE
  const flags =
    options.flags ??
    (options.event !== undefined ? VOLC_FLAGS.EVENT : VOLC_FLAGS.NONE)

  const header = Buffer.from([
    (0b0001 << 4) | 0b0001,
    (options.messageType << 4) | flags,
    (serialization << 4) | compression,
    0,
  ])

  const optionalParts: Buffer[] = []
  if (flags === VOLC_FLAGS.EVENT) {
    optionalParts.push(writeInt32(options.event ?? 0))
    if (frameHasSessionId(options.messageType, options.event)) {
      optionalParts.push(writeString(options.sessionId ?? options.connectId ?? ''))
    }
    if (
      options.messageType !== VOLC_MESSAGE_TYPES.FULL_SERVER_RESPONSE &&
      options.messageType !== VOLC_MESSAGE_TYPES.AUDIO_ONLY_RESPONSE &&
      eventHasConnectId(options.event)
    ) {
      optionalParts.push(writeString(options.connectId ?? ''))
    }
  } else if (
    flags === VOLC_FLAGS.SEQUENCE ||
    flags === VOLC_FLAGS.NEGATIVE_SEQUENCE
  ) {
    optionalParts.push(writeInt32(options.sequence ?? 1))
  }

  const rawPayload = normalizePayload(options.payload, serialization)
  const payload =
    compression === VOLC_COMPRESSION.GZIP ? gzipSync(rawPayload) : rawPayload

  return Buffer.concat([
    header,
    ...optionalParts,
    writeInt32(payload.length),
    payload,
  ])
}

export function decodeVolcFrame(input: Buffer | ArrayBuffer | Uint8Array) {
  const buffer = Buffer.isBuffer(input)
    ? input
    : input instanceof ArrayBuffer
      ? Buffer.from(input)
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  if (buffer.length < 8) {
    throw new Error('Invalid Volc realtime frame: header is too short')
  }

  const headerSize = (buffer[0]! & 0b00001111) * 4
  const messageType = buffer[1]! >> 4
  const flags = buffer[1]! & 0b00001111
  const serialization = buffer[2]! >> 4
  const compression = buffer[2]! & 0b00001111
  let offset = headerSize
  const decoded: DecodedVolcFrame = {
    messageType,
    flags,
    serialization,
    compression,
    payload: Buffer.alloc(0),
  }

  if (flags === VOLC_FLAGS.SEQUENCE || flags === VOLC_FLAGS.NEGATIVE_SEQUENCE) {
    const result = readInt32(buffer, offset)
    decoded.sequence = result.value
    offset = result.offset
  }
  if (flags === VOLC_FLAGS.EVENT) {
    const result = readInt32(buffer, offset)
    decoded.event = result.value
    offset = result.offset
    if (frameHasSessionId(messageType, decoded.event)) {
      const sessionResult = readString(buffer, offset)
      decoded.sessionId = sessionResult.value
      offset = sessionResult.offset
    }
    if (
      messageType !== VOLC_MESSAGE_TYPES.FULL_SERVER_RESPONSE &&
      messageType !== VOLC_MESSAGE_TYPES.AUDIO_ONLY_RESPONSE &&
      eventHasConnectId(decoded.event)
    ) {
      const connectResult = readString(buffer, offset)
      decoded.connectId = connectResult.value
      offset = connectResult.offset
    }
  }

  if (offset + 4 > buffer.length) return decoded
  const payloadLengthResult = readInt32(buffer, offset)
  const payloadLength = Math.max(0, payloadLengthResult.value)
  offset = payloadLengthResult.offset
  const payloadEnd = Math.min(buffer.length, offset + payloadLength)
  const wirePayload = buffer.subarray(offset, payloadEnd)
  decoded.payload =
    compression === VOLC_COMPRESSION.GZIP &&
    decoded.event !== VOLC_EVENTS.TTS_RESPONSE
      ? gunzipSync(wirePayload)
      : wirePayload

  if (serialization === VOLC_SERIALIZATION.JSON && decoded.payload.length > 0) {
    decoded.text = decoded.payload.toString('utf8')
    try {
      decoded.json = JSON.parse(decoded.text)
    } catch {
      // Keep text for non-JSON server fragments.
    }
  } else if (decoded.payload.length > 0) {
    decoded.text = decoded.payload.toString('utf8')
  }

  return decoded
}

export function encodeVolcJsonEvent(
  event: number,
  payload: Record<string, unknown>,
  _sequence: number,
  sessionId?: string
) {
  return encodeVolcFrame({
    messageType: VOLC_MESSAGE_TYPES.FULL_CLIENT_REQUEST,
    flags: VOLC_FLAGS.EVENT,
    serialization: VOLC_SERIALIZATION.JSON,
    compression: VOLC_COMPRESSION.NONE,
    event,
    sessionId,
    payload,
  })
}

export function encodeVolcAudioEvent(
  event: number,
  payload: Buffer | Uint8Array,
  _sequence: number,
  sessionId?: string
) {
  return encodeVolcFrame({
    messageType: VOLC_MESSAGE_TYPES.AUDIO_ONLY_REQUEST,
    flags: VOLC_FLAGS.EVENT,
    serialization: VOLC_SERIALIZATION.RAW,
    compression: VOLC_COMPRESSION.NONE,
    event,
    sessionId,
    payload,
  })
}
