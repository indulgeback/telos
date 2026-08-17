/**
 * run 级 pending 数据缓存（Redis + TTL）。
 *
 * 取代进程内 Map：多实例可读；run 异常终止无人消费时靠 TTL 自动过期，
 * 修复旧实现的内存泄漏（只增不减）。
 */
import Redis from 'ioredis'
import { config } from '../config/index.js'
import { logger } from '../config/index.js'

const DEFAULT_TTL_SECONDS = 30 * 60

const client = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
})
client.on('error', err =>
  logger.error({ msg: 'pending-cache redis client error', err })
)

export class PendingRunCache<T> {
  constructor(
    private readonly prefix: string,
    private readonly ttlSeconds: number = DEFAULT_TTL_SECONDS
  ) {}

  private key(runId: string) {
    return `run:pending:${this.prefix}:${runId}`
  }

  async set(runId: string, value: T): Promise<void> {
    if (!runId) return
    await client.set(this.key(runId), JSON.stringify(value), 'EX', this.ttlSeconds)
  }

  /** 取出并删除（一次性消费）。Redis 故障时返回 undefined 而非抛错，不阻断 run 收尾 */
  async consume(runId: string): Promise<T | undefined> {
    if (!runId) return undefined
    try {
      const raw = await client.getdel(this.key(runId))
      return raw ? (JSON.parse(raw) as T) : undefined
    } catch (err) {
      logger.warn({ msg: 'pending-cache consume failed', key: this.key(runId), err })
      return undefined
    }
  }
}
