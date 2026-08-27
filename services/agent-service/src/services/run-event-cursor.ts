const REDIS_STREAM_ID = /^\d+-\d+$/

/** XREAD requires a valid explicit stream ID; empty cursors are not allowed. */
export function normalizeRunEventCursor(cursor?: string | null): string {
  return cursor && REDIS_STREAM_ID.test(cursor) ? cursor : '0-0'
}

/** Compare two valid Redis Stream IDs without lossy Number conversion. */
export function compareRunEventCursors(left: string, right: string) {
  const [leftMs, leftSeq] = normalizeRunEventCursor(left).split('-').map(BigInt)
  const [rightMs, rightSeq] = normalizeRunEventCursor(right)
    .split('-')
    .map(BigInt)
  if (leftMs !== rightMs) return leftMs < rightMs ? -1 : 1
  if (leftSeq === rightSeq) return 0
  return leftSeq < rightSeq ? -1 : 1
}
