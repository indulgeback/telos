import {
  getVolcRealtimeDiagnostics,
  runVolcRealtimeTextTurn,
} from '../dist/services/realtime/volc-realtime.js'

const diagnostics = getVolcRealtimeDiagnostics()

if (!diagnostics.readyForRealConnection) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: 'Volc realtime credentials are not configured.',
        missingEnv: diagnostics.missingEnv,
      },
      null,
      2
    )
  )
  process.exit(1)
}

const events = []
const timeout = AbortSignal.timeout(30000)

try {
  await runVolcRealtimeTextTurn(
    {
      input: '请用一句话回复：Telos 火山实时语音连接测试成功。',
      signal: timeout,
    },
    (type, payload = {}) => {
      events.push({ type, payload })
      if (
        type === 'response.output_text.delta' ||
        type === 'response.failed' ||
        type === 'response.completed'
      ) {
        console.log(JSON.stringify({ type, payload }))
      }
    }
  )

  const completed = events.some(event => event.type === 'response.completed')
  const text = events
    .filter(event => event.type === 'response.output_text.delta')
    .map(event => event.payload.delta || '')
    .join('')

  console.log(
    JSON.stringify(
      {
        ok: completed,
        mode: diagnostics.mode,
        model: diagnostics.model,
        text,
      },
      null,
      2
    )
  )
  process.exit(completed ? 0 : 1)
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  )
  process.exit(1)
}
