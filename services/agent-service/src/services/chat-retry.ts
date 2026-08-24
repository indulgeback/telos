export interface LatestAssistantMessage {
  id: string
  runId: string | null
}

export function canReplaceLatestAssistant(
  latestAssistant: LatestAssistantMessage | null,
  retryRunId: string,
  previousReplacementMessageId?: string | null
): boolean {
  if (!latestAssistant) return true
  return (
    latestAssistant.runId === retryRunId ||
    latestAssistant.id === previousReplacementMessageId
  )
}
