import { describe, expect, it } from 'vitest'
import { joinFirstNames, splitFirstNames } from './firstNames.js'

const child = [{ type: 'child', personId: 1 }]

describe('plusieurs prénoms dans le champ Prénom', () => {
  it("découpe pour un enfant ou un frère", () => {
    expect(splitFirstNames('Paul, Marie, Jean', child)).toEqual(['Paul', 'Marie', 'Jean'])
    expect(splitFirstNames('Paul,Marie', [{ type: 'sibling', personId: 2 }])).toEqual(['Paul', 'Marie'])
  })

  it('laisse un seul prénom sans virgule, ou pour un parent ou un conjoint', () => {
    expect(splitFirstNames('Jean-Pierre', child)).toEqual(['Jean-Pierre'])
    expect(splitFirstNames('Paul, Marie', [{ type: 'parent', personId: 1 }])).toEqual(['Paul, Marie'])
    expect(splitFirstNames('Paul, Marie', [])).toEqual(['Paul, Marie'])
  })

  it('ignore les vides et les doublons', () => {
    expect(splitFirstNames(' Paul , , Marie, Paul ', child)).toEqual(['Paul', 'Marie'])
    expect(splitFirstNames('Paul,', child)).toEqual(['Paul'])
  })

  it('les relie pour le message', () => {
    expect(joinFirstNames(['Paul', 'Marie', 'Jean'], 'et')).toBe('Paul, Marie et Jean')
    expect(joinFirstNames(['Paul'], 'et')).toBe('Paul')
  })
})
