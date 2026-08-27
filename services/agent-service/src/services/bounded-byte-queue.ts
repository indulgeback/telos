/**
 * Small byte-accounted FIFO used at streaming boundaries.
 *
 * The Web Streams desiredSize signal only accounts for chunks already handed
 * to the controller. Event producers such as Redis subscriptions can still
 * outrun a slow client, so callers keep this second, explicitly bounded queue
 * and disconnect once it is full. The client can resume from the last SSE
 * sequence it actually received.
 */
export class BoundedByteQueue<T extends Uint8Array> {
  private readonly values: T[] = []
  private totalBytes = 0

  constructor(private readonly maxBytes: number) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
      throw new Error('maxBytes must be a positive safe integer')
    }
  }

  get length() {
    return this.values.length
  }

  get byteLength() {
    return this.totalBytes
  }

  push(value: T) {
    if (value.byteLength > this.maxBytes - this.totalBytes) return false
    this.values.push(value)
    this.totalBytes += value.byteLength
    return true
  }

  shift() {
    const value = this.values.shift()
    if (value) this.totalBytes -= value.byteLength
    return value
  }

  clear() {
    this.values.length = 0
    this.totalBytes = 0
  }
}
