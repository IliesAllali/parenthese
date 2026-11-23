import { describe, expect, it } from 'vitest'

import { presumedDeceased } from '../src/lib/presumed-deceased'

describe('décès présumé : née il y a plus de 110 ans', () => {
  const now = new Date('2026-11-23T00:00:00.000Z')

  it('plus de 110 ans : décédée', () => {
    expect(presumedDeceased(new Date('1886-01-01T00:00:00.000Z'), now)).toBe(true)
    expect(presumedDeceased(new Date('1915-06-01T00:00:00.000Z'), now)).toBe(true)
  })

  it('110 ans tout juste, plus jeune, ou sans naissance : rien n’est présumé', () => {
    expect(presumedDeceased(new Date('1916-01-01T00:00:00.000Z'), now)).toBe(false)
    expect(presumedDeceased(new Date('1990-01-01T00:00:00.000Z'), now)).toBe(false)
    expect(presumedDeceased(null, now)).toBe(false)
  })
})
