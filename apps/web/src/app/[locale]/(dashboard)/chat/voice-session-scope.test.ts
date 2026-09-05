import { describe, expect, it, vi } from 'vitest'
import { VoiceSessionScope } from './voice-session-scope'

describe('microphone session lifetime', () => {
  it('releases a microphone granted after the user already disconnected', async () => {
    const scope = new VoiceSessionScope()
    const generation = scope.begin()
    let grant!: (stop: () => void) => void
    const permission = new Promise<() => void>(resolve => {
      grant = resolve
    })
    const acquired = permission.then(stop => {
      scope.retain(generation, stop)
      return scope.isCurrent(generation)
    })
    scope.close()
    const stop = vi.fn()
    grant(stop)
    expect(await acquired).toBe(false)
    expect(stop).toHaveBeenCalledOnce()
  })

  it('ends old reconnect timers and sockets before a new session starts', () => {
    const scope = new VoiceSessionScope()
    const first = scope.begin()
    const closeSocket = vi.fn()
    const cancelTimer = vi.fn()
    scope.retain(first, closeSocket)
    scope.retain(first, cancelTimer)
    const second = scope.begin()
    expect(scope.isCurrent(first)).toBe(false)
    expect(scope.isCurrent(second)).toBe(true)
    expect(closeSocket).toHaveBeenCalledOnce()
    expect(cancelTimer).toHaveBeenCalledOnce()
    scope.close()
    expect(closeSocket).toHaveBeenCalledOnce()
  })

  it('releases remaining resources when a previously closed socket throws', () => {
    const scope = new VoiceSessionScope()
    const generation = scope.begin()
    const stopTracks = vi.fn()
    scope.retain(generation, () => {
      throw new Error('already closed')
    })
    scope.retain(generation, stopTracks)
    scope.close()
    expect(stopTracks).toHaveBeenCalledOnce()
  })
})
