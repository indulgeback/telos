const REDIS_STREAM_ID = /^\d+-\d+$/

/** XREAD requires a valid explicit stream ID; empty cursors are not allowed. */
export function normalizeRunEventCursor(cursor?: string | null): string {
  return cursor && REDIS_STREAM_ID.test(cursor) ? cursor : '0-0'
}
