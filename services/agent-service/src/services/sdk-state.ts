import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from '../config/index.js'

export interface SignedSdkState {
  runId: string
  agentId: string
  stateVersion: number
  sdkState: string
}

function lengthPrefixed(value: string) {
  return `${Buffer.byteLength(value, 'utf8')}:${value}`
}

function signingPayload(input: SignedSdkState) {
  return [
    'telos-agent-sdk-state-v1',
    lengthPrefixed(input.runId),
    lengthPrefixed(input.agentId),
    String(input.stateVersion),
    lengthPrefixed(input.sdkState),
  ].join('\n')
}

export function signSdkState(input: SignedSdkState) {
  return createHmac('sha256', config.agentStateSigningSecret)
    .update(signingPayload(input))
    .digest('hex')
}

export function verifySdkState(
  input: SignedSdkState,
  expectedSignature: string | null | undefined
) {
  if (!expectedSignature || !/^[a-f\d]{64}$/i.test(expectedSignature)) {
    return false
  }
  const expected = Buffer.from(signSdkState(input), 'hex')
  const actual = Buffer.from(expectedSignature, 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
