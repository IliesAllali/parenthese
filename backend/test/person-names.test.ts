import { describe, expect, it } from 'vitest'

import { gedcomNameValue } from '../src/routes/gedcom'

// Prénom et nom facultatifs : une personne entièrement inconnue s'enregistre aussi
describe('nom au GEDCOM', () => {
  it('export GEDCOM sans nom de famille : « Léa // », valide', () => {
    expect(gedcomNameValue('Léa', '')).toBe('Léa //')
  })

  it('personne entièrement inconnue : « // », valide', () => {
    expect(gedcomNameValue('', '')).toBe('//')
  })
})
