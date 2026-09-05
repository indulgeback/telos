/** Own asynchronous microphone resources across disconnects and unmounts. */
export class VoiceSessionScope {
  private generation = 0
  private cleanups = new Set<() => void>()

  begin() {
    this.close()
    return this.generation
  }

  isCurrent(generation: number) {
    return generation === this.generation
  }

  retain(generation: number, dispose: () => void) {
    if (!this.isCurrent(generation)) {
      dispose()
      return
    }
    this.cleanups.add(dispose)
  }

  close() {
    this.generation += 1
    const cleanups = [...this.cleanups]
    this.cleanups.clear()
    for (const dispose of cleanups) {
      try {
        dispose()
      } catch {
        // One already-closed resource must not prevent releasing the others.
      }
    }
  }
}
