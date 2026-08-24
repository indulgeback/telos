import { describe, expect, it } from 'vitest'
import { TELOS_OPAL_ORB, writeLiquidOrbUniforms } from './liquid-orb-uniforms'

describe('liquid orb uniforms', () => {
  it('maps the shared opal preset into the shader layout', () => {
    const values = new Float32Array(128)
    writeLiquidOrbUniforms(values, 96, 64, 1.25)

    expect(Array.from(values.slice(0, 4))).toEqual([
      96,
      64,
      1.25,
      TELOS_OPAL_ORB.speed,
    ])
    expect(values[4]).toBeCloseTo(TELOS_OPAL_ORB.radius)
    expect(values[5]).toBeCloseTo(TELOS_OPAL_ORB.zoom)
    expect(values[15]).toBe(13)
    expect(values[20]).toBeCloseTo(0.54)
    expect(values[32]).toBe(1)
    expect(values[33]).toBeCloseTo(246 / 255)
    expect(values[34]).toBeCloseTo(232 / 255)
    expect(values[35]).toBe(1)
  })
})
