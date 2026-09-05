import { API_BASE_URL } from '@/service/request'

export const createClientMessageId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const getRealtimeWebSocketUrl = () => {
  const url = new URL(API_BASE_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/api/agent/realtime/audio'
  url.search = ''
  return url.toString()
}

export const downsampleToPcm16 = (
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate = 16000
) => {
  const ratio = inputSampleRate / outputSampleRate
  const outputLength =
    inputSampleRate === outputSampleRate
      ? input.length
      : Math.floor(input.length / ratio)
  const buffer = new ArrayBuffer(outputLength * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < outputLength; i += 1) {
    const start =
      inputSampleRate === outputSampleRate ? i : Math.floor(i * ratio)
    const end =
      inputSampleRate === outputSampleRate
        ? i + 1
        : Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j += 1) sum += input[j] ?? 0
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)))
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return buffer
}

export const base64ToArrayBuffer = (value: string) => {
  const binary = window.atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return buffer
}

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Failed to read image file'))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })

const tryGetImageUrl = (part: unknown): string | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>
  if (typeof raw.url === 'string' && raw.url.trim()) return raw.url
  if (typeof raw.image === 'string' && raw.image.trim()) return raw.image
  if (
    raw.image_url &&
    typeof raw.image_url === 'object' &&
    typeof (raw.image_url as { url?: unknown }).url === 'string'
  )
    return (raw.image_url as { url: string }).url
  if (
    raw.file &&
    typeof raw.file === 'object' &&
    typeof (raw.file as { url?: unknown }).url === 'string'
  )
    return (raw.file as { url: string }).url
  return null
}

export const extractImageUrlsFromMessageParts = (parts: unknown): string[] => {
  if (!Array.isArray(parts)) return []
  const urls: string[] = []
  parts.forEach(part => {
    if (!part || typeof part !== 'object') return
    const type = (part as { type?: unknown }).type
    if (!['image', 'image_url', 'file', 'input_image'].includes(String(type)))
      return
    const url = tryGetImageUrl(part)
    if (url && !urls.includes(url)) urls.push(url)
  })
  return urls
}
