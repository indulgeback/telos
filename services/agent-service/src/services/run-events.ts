/**
 * Run 事件流（Redis Stream 实现）。
 *
 * 设计要点：
 * - 进行中 run 的事件写入 Redis Stream（XADD），Stream ID 天然原子递增，
 *   多实例并发写入也保证全局有序——彻底取代旧实现里「进程内锁 +
 *   SELECT MAX(sequence) + INSERT 到 agent_run_events 表」的写放大
 * - 断线续传：SSE 端点用 XRANGE(after) 回放 + XREAD BLOCK 订阅
 * - 生命周期：key 带 TTL（默认 30 分钟）兜底；run 终态后只缩短 TTL，
 *   保留一段时间供断线重连/诊断读取（不会立即 DEL）
 * - agent_run_events 表不再写入（存量数据待清理，表保留观察期）
 */
import Redis from 'ioredis'
import { config } from '../config/index.js'
import { logger } from '../config/index.js'
import { normalizeRunEventCursor } from './run-event-cursor.js'
import { isTerminalUiEventType } from './run-terminal.js'
import type { RunLease } from './run-lease.js'

const EVENT_TTL_SECONDS = 30 * 60
const CANCEL_MARKER_TTL_SECONDS = 24 * 60 * 60
const READ_BLOCK_MS = 5_000
const READ_BATCH_SIZE = 128
const DEFAULT_HISTORY_LIMIT = 2_000
const EVENT_FENCE_CLOSE_TIMEOUT_MS = 2_000
const WRITE_CONNECT_TIMEOUT_MS = 1_000
const WRITE_COMMAND_TIMEOUT_MS = 2_000

let writeClient: Redis | null = null
let connectingClient: Redis | null = null
let connectingPromise: Promise<void> | null = null

function newWriteClient() {
  const client = new Redis(config.redisUrl, getRunEventsWriteOptions())
  client.on('error', err =>
    logger.error({ msg: 'run-events redis write client error', err })
  )
  client.on('end', () => {
    if (writeClient === client) writeClient = null
  })
  return client
}

/** Exposed without creating a client so the bounded write contract is testable. */
export function getRunEventsWriteOptions() {
  return {
    connectTimeout: WRITE_CONNECT_TIMEOUT_MS,
    enableOfflineQueue: false,
    lazyConnect: true,
    // Projection writes are best effort. Never leave a command pending until
    // Redis comes back, and never resend a command whose caller has timed out.
    maxRetriesPerRequest: 1,
    autoResendUnfulfilledCommands: false,
    commandTimeout: WRITE_COMMAND_TIMEOUT_MS,
    retryStrategy: (times: number) => (times <= 2 ? times * 100 : null),
  }
}

/**
 * Explicitly establish readiness before issuing a projection command. With
 * offline queues disabled, commands cannot be silently replayed after a
 * terminal DB transition when Redis recovers.
 */
async function readyWriteClient() {
  const client =
    writeClient && writeClient.status !== 'end'
      ? writeClient
      : (writeClient = newWriteClient())

  if (client.status === 'ready') return client
  if (client.status === 'wait') {
    if (connectingClient !== client) {
      connectingClient = client
      connectingPromise = client.connect().finally(() => {
        if (connectingClient === client) {
          connectingClient = null
          connectingPromise = null
        }
      })
    }
  }
  // Concurrent first writes share the same explicit connection attempt. They
  // must not fail merely because the first caller changed wait -> connecting.
  if (connectingClient === client && connectingPromise) {
    await connectingPromise
  }
  if ((client.status as string) !== 'ready') {
    throw new Error(`run-events Redis is not ready (${client.status})`)
  }
  return client
}

async function withWriteClient<T>(operation: (client: Redis) => Promise<T>) {
  return operation(await readyWriteClient())
}

function streamKey(runId: string) {
  return `run:events:${runId}`
}

function cancelKey(runId: string) {
  return `run:cancelled:${runId}`
}

function terminalEventKey(runId: string) {
  return `run:terminal-event:${runId}`
}

function eventFenceKey(runId: string) {
  return `run:event-fence:${runId}`
}

function uiEventDedupeKey(runId: string, dedupeKey: string) {
  return `run:ui-event:${runId}:${dedupeKey}`
}

const APPEND_TERMINAL_EVENT_SCRIPT = `
local existing = redis.call('GET', KEYS[2])
if existing then
  return existing
end
local id = redis.call(
  'XADD', KEYS[1], '*',
  'type', ARGV[1],
  'payload', ARGV[2],
  'agent', ARGV[3]
)
redis.call('EXPIRE', KEYS[1], ARGV[4])
redis.call('SET', KEYS[2], id, 'EX', ARGV[4])
return id
`

// Redis is the live projection, so generation fencing is enforced in the
// same atomic operation as XADD. The expiry supplied here is the last lease
// expiry successfully committed by PostgreSQL; a stale worker cannot extend
// it locally because only a successful DB heartbeat mutates the lease object.
const APPEND_FENCED_EVENT_SCRIPT = `
local requested_fence = tonumber(ARGV[4])
local current = redis.call('GET', KEYS[2])
if current then
  local current_fence, current_attempt, current_state = string.match(current, '^([^:]+):([^:]+):([^:]+)$')
  current_fence = tonumber(current_fence)
  if current_fence > requested_fence then
    return ''
  end
  if current_fence == requested_fence and (current_attempt ~= ARGV[5] or current_state ~= 'open') then
    return ''
  end
end
local now = redis.call('TIME')
local now_ms = (tonumber(now[1]) * 1000) + math.floor(tonumber(now[2]) / 1000)
if now_ms >= tonumber(ARGV[6]) then
  return ''
end
if not current or tonumber(string.match(current, '^([^:]+):')) < requested_fence then
  redis.call('SET', KEYS[2], ARGV[4] .. ':' .. ARGV[5] .. ':open', 'EX', ARGV[7])
else
  redis.call('EXPIRE', KEYS[2], ARGV[7])
end
local id = redis.call(
  'XADD', KEYS[1], '*',
  'type', ARGV[1],
  'payload', ARGV[2],
  'agent', ARGV[3]
)
redis.call('EXPIRE', KEYS[1], ARGV[7])
return id
`

const CLOSE_EVENT_FENCE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local requested_fence = tonumber(ARGV[1])
if current then
  local current_fence, current_attempt = string.match(current, '^([^:]+):([^:]+):')
  current_fence = tonumber(current_fence)
  if current_fence > requested_fence then
    return 0
  end
  if current_fence == requested_fence and current_attempt ~= ARGV[2] then
    return 0
  end
end
redis.call('SET', KEYS[1], ARGV[1] .. ':' .. ARGV[2] .. ':closed', 'EX', ARGV[3])
return 1
`

export interface RunEvent {
  id: string
  sequence: string
  type: string
  payload: Record<string, unknown>
  agentName?: string | null
}

function parseStreamEntry(
  runId: string,
  entry: [id: string, fields: string[]]
): RunEvent | null {
  const [id, fields] = entry
  const record: Record<string, string> = {}
  for (let i = 0; i + 1 < fields.length; i += 2) {
    record[fields[i]] = fields[i + 1]
  }
  try {
    const payload = record.payload
      ? (JSON.parse(record.payload) as Record<string, unknown>)
      : {}
    return {
      id,
      sequence: id,
      type:
        record.type ||
        (typeof payload.type === 'string' ? payload.type : 'unknown'),
      payload,
      agentName: record.agent || null,
    }
  } catch (err) {
    logger.warn({ msg: 'Failed to parse run event payload', runId, id, err })
    return null
  }
}

/** 追加一条 run 事件（Stream ID 即 sequence，原子递增） */
export async function appendRunEvent(
  runId: string,
  type: string,
  payload: unknown = {},
  agentName?: string | null
): Promise<RunEvent> {
  const key = streamKey(runId)
  const merged = { ...(payload as Record<string, unknown>), type }
  const id = await withWriteClient(async client => {
    const eventId = (await client.xadd(
      key,
      '*',
      'type',
      type,
      'payload',
      JSON.stringify(merged),
      'agent',
      agentName ?? ''
    )) as string
    // 每次写入刷新 TTL：进行中 run 的事件持续续期，终态后不再写入则到期自动清理。
    // EXPIRE 失败不让整次 append 抛错（XADD 已成功，事件本体不丢；TTL 由 30min 内
    // 后续写入或终态 DEL 兜底），避免 pendingEmits reject 连锁跳过 run 收尾落库
    try {
      await client.expire(key, EVENT_TTL_SECONDS)
    } catch (err) {
      logger.warn({ msg: 'Failed to refresh run events TTL', runId, err })
    }
    return eventId
  })
  return {
    id,
    sequence: id,
    type,
    payload: merged,
    agentName: agentName ?? null,
  }
}

/**
 * Append a non-terminal event only while this exact attempt generation still
 * owns an unexpired lease. A newer fence or an explicitly closed generation
 * rejects queued callbacks atomically before they can reach the stream.
 */
export async function appendRunEventForLease(
  lease: RunLease,
  type: string,
  payload: unknown = {},
  agentName?: string | null
): Promise<RunEvent | null> {
  const merged = {
    ...(payload as Record<string, unknown>),
    type,
    attempt_id: lease.attemptId,
    fence_token: lease.fenceToken,
  }
  const id = (await withWriteClient(client =>
    client.eval(
      APPEND_FENCED_EVENT_SCRIPT,
      2,
      streamKey(lease.runId),
      eventFenceKey(lease.runId),
      type,
      JSON.stringify(merged),
      agentName ?? '',
      String(lease.fenceToken),
      lease.attemptId,
      String(lease.leaseExpiresAt.getTime()),
      String(EVENT_TTL_SECONDS)
    )
  )) as string
  if (!id) return null
  return {
    id,
    sequence: id,
    type,
    payload: merged,
    agentName: agentName ?? null,
  }
}

/** Prevent any later callback from this attempt from appending live output. */
export async function closeRunEventFence(lease: RunLease) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const close = withWriteClient(client =>
      client.eval(
        CLOSE_EVENT_FENCE_SCRIPT,
        1,
        eventFenceKey(lease.runId),
        String(lease.fenceToken),
        lease.attemptId,
        String(EVENT_TTL_SECONDS)
      )
    )
    const result = await Promise.race([
      close,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('run event fence close timed out')),
          EVENT_FENCE_CLOSE_TIMEOUT_MS
        )
        timeout.unref?.()
      }),
    ])
    return result === 1
  } catch (err) {
    // The process-local gate is already sealed by the executor. Redis is a
    // rebuildable projection, so a bounded failure must not block the durable
    // approval/terminal database transition.
    logger.warn({
      msg: 'run event fence close failed',
      runId: lease.runId,
      err,
    })
    return false
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export async function appendRunUiEvent(
  runId: string,
  type: string,
  payload: Record<string, unknown>
) {
  if (isTerminalUiEventType(type)) {
    const key = streamKey(runId)
    const merged = { ...payload, type }
    const { id, entries } = await withWriteClient(async client => {
      const eventId = (await client.eval(
        APPEND_TERMINAL_EVENT_SCRIPT,
        2,
        key,
        terminalEventKey(runId),
        type,
        JSON.stringify(merged),
        '',
        String(EVENT_TTL_SECONDS)
      )) as string
      const streamEntries = (await client.xrange(key, eventId, eventId)) as [
        string,
        string[],
      ][]
      return { id: eventId, entries: streamEntries }
    })
    const existing = entries[0] ? parseStreamEntry(runId, entries[0]) : null
    return (
      existing ?? {
        id,
        sequence: id,
        type,
        payload: merged,
        agentName: null,
      }
    )
  }
  return appendRunEvent(runId, type, payload)
}

/** Idempotent non-terminal UI projection, keyed by the durable outbox row. */
export async function appendRunUiEventOnce(
  runId: string,
  type: string,
  payload: Record<string, unknown>,
  dedupeKey: string
) {
  const key = streamKey(runId)
  const merged = { ...payload, type }
  const { id, entries } = await withWriteClient(async client => {
    const eventId = (await client.eval(
      APPEND_TERMINAL_EVENT_SCRIPT,
      2,
      key,
      uiEventDedupeKey(runId, dedupeKey),
      type,
      JSON.stringify(merged),
      '',
      String(EVENT_TTL_SECONDS)
    )) as string
    const streamEntries = (await client.xrange(key, eventId, eventId)) as [
      string,
      string[],
    ][]
    return { id: eventId, entries: streamEntries }
  })
  return (
    (entries[0] ? parseStreamEntry(runId, entries[0]) : null) ?? {
      id,
      sequence: id,
      type,
      payload: merged,
      agentName: null,
    }
  )
}

/**
 * Distributed cancellation marker.  The local AbortController is only an
 * optimization: a request can be served by a different worker replica.
 */
export async function markRunCancelled(runId: string, reason: string) {
  await withWriteClient(client =>
    client.set(
      cancelKey(runId),
      reason || 'Run cancelled',
      'EX',
      CANCEL_MARKER_TTL_SECONDS
    )
  )
}

export async function isRunCancelled(runId: string) {
  return (
    (await withWriteClient(client => client.exists(cancelKey(runId)))) === 1
  )
}

export async function clearRunCancellation(runId: string) {
  await withWriteClient(client => client.del(cancelKey(runId)))
}

/**
 * 读取 run 事件（after 之后的部分；不传 after 则全量）。
 * Stream ID 字典序 = 写入顺序，直接用 XRANGE 区间。
 */
export async function readRunEvents(
  runId: string,
  after?: string,
  limit = DEFAULT_HISTORY_LIMIT
): Promise<RunEvent[]> {
  const key = streamKey(runId)
  const boundedLimit = Math.max(1, Math.min(limit, DEFAULT_HISTORY_LIMIT))
  const start = after ? `(${after}` : '-'
  const entries = (await withWriteClient(client =>
    client.xrange(key, start, '+', 'COUNT', boundedLimit)
  )) as [string, string[]][]
  return entries
    .map(entry => parseStreamEntry(runId, entry))
    .filter((e): e is RunEvent => Boolean(e))
}

/**
 * 从显式 cursor 起订阅 run 事件（from 之后的所有条目，含订阅建立前已写入的）。
 * 必须传回放快照的最后一条 ID（无历史时 '0-0'）——XREAD 对显式 ID 返回严格
 * 大于它的全部条目，无论命令何时注册，从根上消除「先订阅('​$')再回放」的
 * 丢事件/重复事件竞态窗口。返回取消函数。
 */
export function subscribeRunEvents(
  runId: string,
  listener: (event: RunEvent) => void,
  from?: string
): () => void {
  let closed = false
  let reader: Redis | null = null
  let stopping: Promise<void> | null = null

  const loop = (async () => {
    reader = new Redis(config.redisUrl, { maxRetriesPerRequest: null })
    reader.on('error', err =>
      logger.warn({ msg: 'run-events subscriber connection error', runId, err })
    )
    try {
      let lastId = normalizeRunEventCursor(from)
      while (!closed) {
        const result = (await reader.xread(
          'COUNT',
          READ_BATCH_SIZE,
          'BLOCK',
          READ_BLOCK_MS,
          'STREAMS',
          streamKey(runId),
          lastId
        )) as [string, [string, string[]][]] | null
        if (!result || closed) continue
        for (const [, rawEntries] of result) {
          for (const rawEntry of rawEntries) {
            const entry = rawEntry as [string, string[]]
            // 先推进游标再解析：畸形数据只损失该条事件，避免 XREAD 忙循环卡死订阅
            lastId = entry[0]
            const event = parseStreamEntry(runId, entry)
            if (event && !closed) {
              listener(event)
            }
          }
        }
      }
    } catch (err) {
      if (!closed) {
        logger.warn({ msg: 'run-events subscriber loop exited', runId, err })
      }
    } finally {
      reader?.disconnect()
    }
  })()

  return () => {
    if (closed) return
    closed = true
    stopping ??= loop.catch(() => undefined)
    // BLOCK 最多 READ_BLOCK_MS 后自然退出；主动断开加速退出
    reader?.disconnect()
  }
}

/**
 * Retain terminal events for reconnects and support diagnostics. Redis TTL is
 * the eventual cleanup mechanism; callers may invoke this after a terminal
 * transition without destroying the stream immediately.
 */
export async function cleanupRunEvents(runId: string) {
  try {
    await withWriteClient(client =>
      Promise.all([
        client.expire(streamKey(runId), EVENT_TTL_SECONDS),
        client.expire(terminalEventKey(runId), EVENT_TTL_SECONDS),
        client.expire(eventFenceKey(runId), EVENT_TTL_SECONDS),
      ]).then(() => undefined)
    )
  } catch (err) {
    logger.warn({ msg: 'Failed to cleanup run events stream', runId, err })
  }
}

/** 兼容旧类型名 */
export type RunEventListener = (event: RunEvent) => void
