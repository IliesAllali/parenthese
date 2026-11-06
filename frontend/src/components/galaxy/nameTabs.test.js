import { describe, expect, it } from 'vitest'
import { nameTabsOf } from './nameTabs'

// Branche Garnier : Jean et Marthe (née Roux), trois enfants Garnier, dont Paul (marié à Julie Petit, deux
// enfants Garnier) et Anne (mariée à Marc Duval, un fils Duval). Un Garnier sans lien, ailleurs.
const p = (id, firstName, lastName, birthName = null, birthDate = null) => ({ id, firstName, lastName, birthName, birthDate })
const graph = {
  persons: [
    p(1, 'Jean', 'Garnier', null, '1920-01-01'), p(2, 'Marthe', 'Garnier', 'Roux'), p(3, 'Paul', 'Garnier'), p(4, 'Anne', 'Duval', 'Garnier'),
    p(5, 'Luc', 'Garnier'), p(6, 'Julie', 'Petit'), p(7, 'Lou', 'Garnier'), p(8, 'Léo', 'GARNIER'), p(9, 'Marc', 'Duval'), p(10, 'Hugo', 'Duval'),
    p(11, 'Joseph', 'Garnier'), p(12, 'Rose', 'Roux'),
  ],
  unions: [{ id: 'u1', partner1Id: 1, partner2Id: 2 }, { id: 'u2', partner1Id: 3, partner2Id: 6 }, { id: 'u3', partner1Id: 4, partner2Id: 9 }],
  filiations: [
    { childId: 3, unionId: 'u1' }, { childId: 4, unionId: 'u1' }, { childId: 5, unionId: 'u1' },
    { childId: 7, unionId: 'u2' }, { childId: 8, unionId: 'u2' }, { childId: 10, unionId: 'u3' }, { childId: 2, parentId: 12 },
  ],
}

describe('nameTabsOf', () => {
  const tabs = nameTabsOf(graph, 5)
  const garnier = tabs.find((tb) => tb.label === 'Garnier')
  it("premier onglet : l'arbre entier", () => {
    expect(tabs[0]).toMatchObject({ all: true, personIds: null, count: 12 })
  })
  it('une branche au même nom, nom de naissance compris, casse ignorée', () => {
    expect([...garnier.personIds].filter((id) => ['1', '3', '4', '5', '7', '8'].includes(id)).length).toBe(6)
  })
  it('avec les conjoints des porteurs', () => {
    for (const id of ['2', '6', '9']) expect(garnier.personIds.has(id)).toBe(true)
  })
  it("en plus clair : l'enfant d'une fille mariée et le parent d'une épouse", () => {
    expect([...garnier.faded].sort()).toEqual(['10'])
  })
  it('l homonyme sans lien reste dehors, l ancêtre ouvre l onglet', () => {
    expect(garnier.personIds.has('11')).toBe(false)
    expect(garnier.referenceId).toBe('1')
  })
  it('sous le seuil, pas d onglet', () => {
    expect(nameTabsOf(graph, 7).length).toBe(1)
  })
})
