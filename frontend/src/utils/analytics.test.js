import { describe, expect, it } from 'vitest'
import { scrubAnalyticsEvent, scrubTreeSlug, toInteractionMediaType, toJourneyRole, toOpaqueTreeId } from './analytics'

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

  it('never lets a tree slug leave the browser', () => {
    expect(scrubTreeSlug('https://app.parenthese.io/arbre/dupont-x7Kq?ref=1#p')).toBe('https://app.parenthese.io/arbre/:slug?ref=1#p')
    expect(scrubTreeSlug('/arbre/dupont-x7Kq')).toBe('/arbre/:slug')
    expect(scrubTreeSlug('https://x.io/?return_url=https%3A%2F%2Fapp.parenthese.io%2Farbre%2Fdupont%2Dx7Kq&a=1'))
      .toBe('https://x.io/?return_url=https%3A%2F%2Fapp.parenthese.io%2Farbre%2F%3Aslug&a=1')
    expect(scrubTreeSlug('/aide/')).toBe('/aide/')

    const event = scrubAnalyticsEvent({
      event: 'tree_viewed',
      properties: { $current_url: 'https://app.parenthese.io/arbre/abc', $pathname: '/arbre/abc', $referrer: 'https://app.parenthese.io/arbre/abc/', n: 3 },
      $set_once: { $initial_current_url: 'https://app.parenthese.io/arbre/abc', $initial_pathname: '/arbre/abc' },
    })
    expect(JSON.stringify(event)).not.toContain('abc')
    expect(event.properties.$pathname).toBe('/arbre/:slug')
    expect(event.properties.n).toBe(3)
    expect(scrubAnalyticsEvent(null)).toBeNull()
  })
})
