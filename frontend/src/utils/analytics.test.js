import { describe, expect, it } from 'vitest'
import { toInteractionMediaType, toJourneyRole, toOpaqueTreeId } from './analytics'

describe('analytics helpers', () => {
  it('maps journey roles for shared visitors', () => {
    expect(toJourneyRole('visitor')).toBe('visitor')
    expect(toJourneyRole('contributor')).toBe('contributor_anon')
    expect(toJourneyRole('owner')).toBeNull()
  })

  it('normalizes media types for tree interaction', () => {
    expect(toInteractionMediaType('photo')).toBe('photo')
    expect(toInteractionMediaType('video')).toBe('video')
    expect(toInteractionMediaType('audio')).toBe('text')
    expect(toInteractionMediaType('')).toBe('text')
  })

  it('hashes tree ids into opaque stable ids', () => {
    expect(toOpaqueTreeId('tree-123')).toMatch(/^[a-f0-9]+$/)
    expect(toOpaqueTreeId('tree-123')).toBe(toOpaqueTreeId('tree-123'))
    expect(toOpaqueTreeId('tree-123')).not.toBe(toOpaqueTreeId('tree-456'))
  })
})
