import { describe, expect, it } from 'vitest'
import { LatestRequest } from './latest-request'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

describe('chat thread history loading', () => {
  it('keeps B visible when an earlier request for A finishes later', async () => {
    const requests = new LatestRequest()
    const a = deferred<string[]>()
    const b = deferred<string[]>()
    let messages: string[] = []
    const first = requests.run(
      () => a.promise,
      value => {
        messages = value
      }
    )
    const second = requests.run(
      () => b.promise,
      value => {
        messages = value
      }
    )
    b.resolve(['B'])
    expect(await second).toBe(true)
    a.resolve(['A'])
    expect(await first).toBe(false)
    expect(messages).toEqual(['B'])
  })

  it('does not restore history after new-chat or unmount invalidates the request', async () => {
    const requests = new LatestRequest()
    const history = deferred<string[]>()
    let messages: string[] = []
    const loading = requests.run(
      () => history.promise,
      value => {
        messages = value
      }
    )
    requests.invalidate()
    history.resolve(['old thread'])
    expect(await loading).toBe(false)
    expect(messages).toEqual([])
  })
})
