/** Ensures late history/list responses cannot commit into a newer selection. */
export class LatestRequest {
  private generation = 0

  next() {
    return ++this.generation
  }

  isCurrent(generation: number) {
    return this.generation === generation
  }

  invalidate() {
    this.next()
  }

  async run<T>(
    load: () => Promise<T>,
    commit: (value: T) => void,
    generation = this.next()
  ) {
    const value = await load()
    if (!this.isCurrent(generation)) return false
    commit(value)
    return true
  }
}
