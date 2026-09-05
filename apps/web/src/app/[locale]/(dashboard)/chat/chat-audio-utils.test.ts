import { describe, expect, it } from 'vitest'
import {
  downsampleToPcm16,
  extractImageUrlsFromMessageParts,
} from './chat-audio-utils'

describe('chat audio and image helpers', () => {
  it('converts float samples to little-endian PCM16', () => {
    const bytes = new Uint8Array(
      downsampleToPcm16(new Float32Array([-1, 0, 1]), 16_000)
    )
    expect(Array.from(bytes)).toEqual([0, 128, 0, 0, 255, 127])
  })

  it('extracts supported image URL shapes without duplicates', () => {
    expect(
      extractImageUrlsFromMessageParts([
        { type: 'image', url: 'https://one.test/a.png' },
        { type: 'image_url', image_url: { url: 'https://one.test/a.png' } },
        { type: 'input_image', image: 'https://two.test/b.png' },
      ])
    ).toEqual(['https://one.test/a.png', 'https://two.test/b.png'])
  })
})
