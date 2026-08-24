/**
 * Run 事件流（Redis Stream 实现）。
 *
 * 设计要点：
 * - 进行中 run 的事件写入 Redis Stream（XADD），Stream ID 天然原子递增，
 *   多实例并发写入也保证全局有序——彻底取代旧实现里「进程内锁 +
 *   SELECT MAX(sequence) + INSERT 到 agent_run_events 表」的写放大
 * - 断线续传：SSE 端点用 XRANGE(after) 回放 + XREAD BLOCK 订阅
 * - 生命周期：key 带 TTL（默认 30 分钟）兜底；run 终态后显式 DEL
 *   （会话恢复走 message parts 全量落库，事件只服务进行中 run）
 * - agent_run_events 表不再写入（存量数据待清理，表保留观察期）
 */
import Redis from 'ioredis'
import { config } from '../config/index.js'
import { logger } from '../config/index.js'
import { normalizeRunEventCursor } from './run-event-cursor.js'

const EVENT_TTL_SECONDS = 30 * 60
const READ_BLOCK_MS = 5_000

const writeClient = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: false,
})
writeClient.on('error', err =>
  logger.error({ msg: 'run-events redis write client error', err })
)

function streamKey(runId: string) {
  return `run:events:${runId}`
}

interface RunEvent {
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
  const id = (await writeClient.xadd(
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
    await writeClient.expire(key, EVENT_TTL_SECONDS)
  } catch (err) {
    logger.warn({ msg: 'Failed to refresh run events TTL', runId, err })
  }
  return { id, sequence: id, type, payload: merged, agentName: agentName ?? null }
}

export async function appendRunUiEvent(
  runId: string,
  type: string,
  payload: Record<string, unknown>
) {
  return appendRunEvent(runId, type, payload)
}

/**
 * 读取 run 事件（after 之后的部分；不传 after 则全量）。
 * Stream ID 字典序 = 写入顺序，直接用 XRANGE 区间。
 */
export async function readRunEvents(
  runId: string,
  after?: string
): Promise<RunEvent[]> {
  const key = streamKey(runId)
  const rangeArgs = after ? [key, `(${after}`, '+'] : [key, '-', '+']
  const entries = (await writeClient.xrange(
    ...(rangeArgs as [string, string, string])
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

/** run 终态后清理事件流（会话恢复走 message parts，事件已无读者） */
export async function cleanupRunEvents(runId: string) {
  try {
    await writeClient.del(streamKey(runId))
  } catch (err) {
    logger.warn({ msg: 'Failed to cleanup run events stream', runId, err })
  }
}

/** 兼容旧类型名 */
export type RunEventListener = (event: RunEvent) => void
