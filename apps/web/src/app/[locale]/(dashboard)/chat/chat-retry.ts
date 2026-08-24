export interface RetryMessage {
  id: string
  role: 'user' | 'assistant'
  content?: string
  runId?: string | null
}

export interface RetryTarget {
  runId: string
  userContent: string
}

export function getLatestRetryTarget(
  messages: RetryMessage[]
): RetryTarget | null {
  for (
    let assistantIndex = messages.length - 1;
    assistantIndex >= 0;
    assistantIndex -= 1
  ) {
    const assistant = messages[assistantIndex]
    if (assistant?.role !== 'assistant' || !assistant.runId) continue

    for (let userIndex = assistantIndex - 1; userIndex >= 0; userIndex -= 1) {
      const user = messages[userIndex]
      if (user?.role !== 'user') continue
      const userContent = user.content?.trim() || ''
      return userContent ? { runId: assistant.runId, userContent } : null
    }
  }

  return null
}

export function replaceLatestAssistant<T extends RetryMessage>(
  messages: T[],
  replacement: T
): T[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role !== 'assistant') continue
    return [...messages.slice(0, index), replacement]
  }

  return [...messages, replacement]
}
