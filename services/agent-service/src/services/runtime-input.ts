function extractText(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (!raw || typeof raw !== 'object') return ''

  const message = raw as {
    content?: unknown
    parts?: Array<{ type?: string; text?: string }>
  }

  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(part => part.type === 'text' && typeof part.text === 'string')
      .map(part => part.text)
      .join('')
  }
  return ''
}

export function extractPromptFromBody(body: Record<string, unknown>): string {
  const explicit = extractText(body.message)
  if (explicit.trim()) return explicit.trim()

  const messages = Array.isArray(body.messages) ? body.messages : []
  const lastUser =
    [...messages].reverse().find(raw => {
      return (
        raw &&
        typeof raw === 'object' &&
        (raw as { role?: unknown }).role === 'user'
      )
    }) ?? messages[messages.length - 1]

  return extractText(lastUser).trim()
}

export const DEFAULT_AGENT_TURNS = 50
export const MAX_AGENT_TURNS = 200
