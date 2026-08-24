function readModelKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const modelKey = (value as Record<string, unknown>).modelKey
  return typeof modelKey === 'string' && modelKey.trim()
    ? modelKey.trim()
    : null
}

function readRequestedModel(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const model = (value as Record<string, unknown>).model
  return typeof model === 'string' && model.trim() ? model.trim() : null
}

export function resolveMessageModelKey(options: {
  messageMetadata: unknown
  runInput: unknown
}): string | null {
  return (
    readModelKey(options.messageMetadata) ||
    readRequestedModel(options.runInput) ||
    null
  )
}
