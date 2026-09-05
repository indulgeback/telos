import { API_BASE_URL } from '@/service/request'

export const createClientMessageId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
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
  if (inputSampleRate === outputSampleRate) {
    const buffer = new ArrayBuffer(input.length * 2)
    const view = new DataView(buffer)
    input.forEach((sample, index) => {
      const clamped = Math.max(-1, Math.min(1, sample))
      view.setInt16(
        index * 2,
        clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
        true
      )
    })
    return buffer
  }

  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.floor(input.length / ratio)
  const buffer = new ArrayBuffer(outputLength * 2)
  const view = new DataView(buffer)

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j += 1) {
      sum += input[j] ?? 0
    }
    const sample = sum / Math.max(1, end - start)
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(
      i * 2,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true
    )
  }

  return buffer
}

export const base64ToArrayBuffer = (value: string) => {
  const binary = window.atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return buffer
}

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Failed to read image file'))
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })

export const tryGetImageUrl = (part: unknown): string | null => {
  if (!part || typeof part !== 'object') return null
  const raw = part as Record<string, unknown>

  if (typeof raw.url === 'string' && raw.url.trim()) return raw.url
  if (typeof raw.image === 'string' && raw.image.trim()) return raw.image

  const imageUrl = raw.image_url
  if (imageUrl && typeof imageUrl === 'object') {
    const url = (imageUrl as { url?: unknown }).url
    if (typeof url === 'string' && url.trim()) return url
  }

  const file = raw.file
  if (file && typeof file === 'object') {
    const fileUrl = (file as { url?: unknown }).url
    if (typeof fileUrl === 'string' && fileUrl.trim()) return fileUrl
  }

  return null
}

export const extractImageUrlsFromMessageParts = (parts: unknown): string[] => {
  if (!Array.isArray(parts)) return []
  const urls: string[] = []

  parts.forEach(part => {
    if (!part || typeof part !== 'object') return
    const type = (part as { type?: unknown }).type
    if (
      type !== 'image' &&
      type !== 'image_url' &&
      type !== 'file' &&
      type !== 'input_image'
    ) {
      return
    }
    const url = tryGetImageUrl(part)
    if (url && !urls.includes(url)) {
      urls.push(url)
    }
  })

  return urls
}
