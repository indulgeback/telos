# VolcEngine Realtime Voice

This service supports VolcEngine Doubao realtime voice for the Chat page voice
mode. The browser records 16 kHz mono PCM, sends it through
`/api/agent/realtime/audio`, and receives realtime text/audio events from the
agent service.

## Environment

Copy `services/agent-service/.env.example` to `services/agent-service/.env` and
set these values:

```env
VOLC_REALTIME_APP_ID="your-app-id"
VOLC_REALTIME_ACCESS_KEY="your-access-key"
VOLC_REALTIME_ENDPOINT="wss://openspeech.bytedance.com/api/v3/realtime/dialogue"
VOLC_REALTIME_RESOURCE_ID="volc.speech.dialog"
VOLC_REALTIME_APP_KEY="PlgvMymc7f3tQnJ6"
VOLC_REALTIME_MODEL="1.2.1.1"
VOLC_REALTIME_DEMO=false
```

`zh_female_vv_jupiter_bigtts` is an O-series premium voice. Use model
`1.2.1.1` with this speaker. Model `2.2.0.0` is SC2.0 and should be paired
with clone/custom voices such as `saturn_...` or `S_...`.

Use demo mode only for local UI development without cloud credentials:

```env
VOLC_REALTIME_DEMO=true
```

Demo mode does not prove the cloud handshake. It only proves the local browser,
gateway, WebSocket, and UI path.

## Diagnostics

The frontend reads:

```http
GET /api/agent/realtime/config
```

The response includes:

- `configured`: true when either demo mode is enabled or real credentials are
  present.
- `readyForRealConnection`: true only when real cloud credentials are present.
- `mode`: `demo` or `real`.
- `missingEnv`: env var names that must be set before real cloud verification.

The Chat page shows a small warning chip when `missingEnv` is not empty.

## Local Verification

Run unit tests for protocol encoding and the realtime text handshake:

```bash
pnpm --filter ./services/agent-service test
```

Run the real cloud smoke test:

```bash
pnpm --filter ./services/agent-service smoke:volc-realtime
```

Expected failure when credentials are absent:

```json
{
  "ok": false,
  "message": "Volc realtime credentials are not configured.",
  "missingEnv": [
    "VOLC_REALTIME_APP_ID",
    "VOLC_REALTIME_ACCESS_KEY"
  ]
}
```

Expected success when credentials are present:

```json
{
  "ok": true,
  "mode": "real",
  "model": "1.2.1.1",
  "text": "..."
}
```

## Runtime Flow

Text turns and audio turns use the same server acknowledgement order:

1. Send `START_CONNECTION`.
2. Wait for `CONNECTION_STARTED`.
3. Send `START_SESSION`.
4. Wait for `SESSION_STARTED`.
5. Send `CHAT_TEXT_QUERY` for text mode or `TASK_REQUEST` audio frames for
   push-to-talk mode.
6. Complete on server terminal events such as `CHAT_ENDED`,
   `SESSION_FINISHED`, or failure events.

This ordering is covered by `test/volc-realtime-text.test.mjs`.
