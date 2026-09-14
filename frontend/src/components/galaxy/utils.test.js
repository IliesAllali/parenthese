import { describe, it, expect } from 'vitest'
import { easeOutCubic, getEntranceProgress } from './utils'

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutCubic(0)).toBe(0)
  })

  it('returns 1 at t=1', () => {
    expect(easeOutCubic(1)).toBe(1)
  })

  it('returns 0.5 < result < 1 at t=0.5', () => {
    const result = easeOutCubic(0.5)
    expect(result).toBeGreaterThan(0.5)
    expect(result).toBeLessThan(1)
  })

  it('is monotonically increasing', () => {
    let prev = 0
    for (let i = 1; i <= 10; i++) {
      const current = easeOutCubic(i / 10)
      expect(current).toBeGreaterThan(prev)
      prev = current
    }
  })
})

describe('getEntranceProgress', () => {
  it('returns 0 before start time', () => {
    expect(getEntranceProgress(50, 100, 200)).toBe(0)
  })

  it('returns 1 after end time', () => {
    expect(getEntranceProgress(400, 100, 200)).toBe(1)
  })

  it('returns 1 exactly at end time', () => {
    expect(getEntranceProgress(300, 100, 200)).toBe(1)
  })

  it('returns value between 0 and 1 during animation', () => {
    const result = getEntranceProgress(200, 100, 200)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1)
  })

  it('returns 0 at exactly start time', () => {
    expect(getEntranceProgress(100, 100, 200)).toBe(0)
  })

  it('applies easeOutCubic to progress', () => {
    // At halfway (elapsed=200, start=100, duration=200) → t=0.5
    const result = getEntranceProgress(200, 100, 200)
    expect(result).toBeCloseTo(easeOutCubic(0.5), 10)
  })
})
