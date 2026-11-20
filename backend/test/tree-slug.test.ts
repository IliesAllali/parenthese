import { describe, expect, it } from 'vitest'

import { nextFreeSlug, normalizeSlug, SLUG_MAX_LENGTH } from '../src/lib/tree-slug.js'

// Deux familles Martin ne se gênent plus : la seconde reçoit un suffixe au lieu d'une erreur 409 (#251)
describe('adresse d’un arbre', () => {
  it('garde l’adresse quand elle est libre', () => {
    expect(nextFreeSlug('famille-martin', [])).toBe('famille-martin')
    expect(nextFreeSlug('famille-martin', ['famille-martinez'])).toBe('famille-martin')
  })

  it('ajoute -2, puis le premier numéro libre', () => {
    expect(nextFreeSlug('famille-martin', ['famille-martin'])).toBe('famille-martin-2')
    expect(nextFreeSlug('famille-martin', ['famille-martin', 'famille-martin-2', 'famille-martin-3'])).toBe('famille-martin-4')
    expect(nextFreeSlug('famille-martin', ['famille-martin', 'famille-martin-3'])).toBe('famille-martin-2')
  })

  it('reste sous 64 caractères avec le suffixe', () => {
    const long = 'a'.repeat(SLUG_MAX_LENGTH)
    const slug = nextFreeSlug(long, [long])
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
    expect(slug.endsWith('-2')).toBe(true)
    // Pas de double tiret quand la coupe tombe sur un tiret
    const dashed = `${'a'.repeat(SLUG_MAX_LENGTH - 2)}-b`
    expect(nextFreeSlug(dashed, [dashed])).toBe(`${'a'.repeat(SLUG_MAX_LENGTH - 2)}-2`)
  })

  it('normalise le nom en adresse', () => {
    expect(normalizeSlug('  Famille Lefèvre-Durand ')).toBe('famille-lefevre-durand')
  })
})
