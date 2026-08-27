export interface TerminalRunSnapshot {
  id: string
  status: string
  finalOutput?: string | null
  error?: string | null
}

export function isTerminalUiEventType(type: string) {
  return type === 'response.completed' || type === 'response.failed'
}

/** Build the durable UI terminal projection from the database run snapshot. */
export function buildTerminalUiPayload(run: TerminalRunSnapshot) {
  if (run.status === 'completed') {
    return {
      type: 'response.completed',
      response_id: run.id,
      output_text: run.finalOutput ?? '',
    }
  }
  if (run.status === 'failed' || run.status === 'cancelled') {
    return {
      type: 'response.failed',
      response_id: run.id,
      error:
        run.error ||
        (run.status === 'cancelled' ? 'Run cancelled' : 'Run failed'),
      run_status: run.status,
    }
  }
  return null
}
