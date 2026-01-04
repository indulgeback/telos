/**
 * Property-Based Tests for formatDuration utility
 *
 * **Feature: video-recorder-teleprompter, Property 1: Timer Format Consistency**
 * **Validates: Requirements 4.1, 4.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { formatDuration } from '../utils'

describe('formatDuration - Property-Based Tests', () => {
  /**
   * **Feature: video-recorder-teleprompter, Property 1: Timer Format Consistency**
   *
   * For any non-negative integer duration in seconds, the formatDuration function
   * SHALL produce a string in "HH:MM:SS" format where each component is zero-padded to 2 digits.
   *
   * **Validates: Requirements 4.1, 4.2**
   */
  it('should always produce HH:MM:SS format with zero-padded components', () => {
    fc.assert(
      fc.property(fc.nat({ max: 359999 }), seconds => {
        const result = formatDuration(seconds)

        // Check format: exactly "HH:MM:SS" pattern
        const formatRegex = /^\d{2}:\d{2}:\d{2}$/
        expect(result).toMatch(formatRegex)

        // Parse components
        const [hours, minutes, secs] = result.split(':').map(Number)

        // Verify component ranges
        expect(hours).toBeGreaterThanOrEqual(0)
        expect(minutes).toBeGreaterThanOrEqual(0)
        expect(minutes).toBeLessThan(60)
        expect(secs).toBeGreaterThanOrEqual(0)
        expect(secs).toBeLessThan(60)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: video-recorder-teleprompter, Property 1: Timer Format Consistency**
   *
   * The formatted duration should be mathematically consistent:
   * hours * 3600 + minutes * 60 + seconds should equal the input.
   *
   * **Validates: Requirements 4.1, 4.2**
   */
  it('should produce mathematically consistent output', () => {
    fc.assert(
      fc.property(fc.nat({ max: 359999 }), inputSeconds => {
        const result = formatDuration(inputSeconds)
        const [hours, minutes, secs] = result.split(':').map(Number)

        const reconstructed = hours * 3600 + minutes * 60 + secs
        expect(reconstructed).toBe(inputSeconds)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: video-recorder-teleprompter, Property 1: Timer Format Consistency**
   *
   * Negative inputs should be treated as 0.
   *
   * **Validates: Requirements 4.1**
   */
  it('should handle negative inputs by treating them as 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: -1 }), negativeSeconds => {
        const result = formatDuration(negativeSeconds)
        expect(result).toBe('00:00:00')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Feature: video-recorder-teleprompter, Property 1: Timer Format Consistency**
   *
   * Floating point inputs should be floored to integers.
   *
   * **Validates: Requirements 4.1**
   */
  it('should floor floating point inputs', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 359999, noNaN: true }),
        floatSeconds => {
          const result = formatDuration(floatSeconds)
          const flooredInput = Math.floor(floatSeconds)
          const expectedResult = formatDuration(flooredInput)
          expect(result).toBe(expectedResult)
        }
      ),
      { numRuns: 100 }
    )
  })
})
