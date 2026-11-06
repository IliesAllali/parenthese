import { describe, expect, it } from 'vitest'
import { bearersOfName, kinAround } from './blockLayout'

// Henri Garnier (membre de l'onglet Garnier) et Odette, née Morel, notée au nom de son mari.
// Leurs enfants : Paul Garnier (marié à Julie Petit, une fille Lou Garnier) et Anne, au nom de sa mère.
// Un Garnier sans lien, ailleurs dans l'arbre.
const p = (id, firstName, lastName, birthName = null) => ({ id, firstName, lastName, birthName })
const graph = {
  persons: [
    p(1, 'Henri', 'Garnier'), p(2, 'Odette', 'Garnier', 'Morel'), p(3, 'Paul', 'Garnier'), p(4, 'Anne', 'Morel'),
    p(5, 'Julie', 'Petit'), p(6, 'Lou', 'Garnier'), p(7, 'Jean', 'Garnier'), p(8, 'Marc', 'Morel'),
  ],
  unions: [{ id: 'u1', partner1Id: 1, partner2Id: 2 }, { id: 'u2', partner1Id: 3, partner2Id: 5 }],
  filiations: [
    { childId: 3, unionId: 'u1' }, { childId: 4, unionId: 'u1' }, { childId: 6, unionId: 'u2' }, { childId: 2, parentId: 8 },
  ],
}

describe('bearersOfName', () => {
  const { added, coParents } = bearersOfName(['1'], 'Garnier', graph)
  it('prend les enfants au nom, de génération en génération, avec leurs conjoints', () => {
    expect([...added].sort()).toEqual(['3', '5', '6'])
  })
  it("laisse dehors l'enfant au nom de sa mère, l'homonyme sans lien, et la mère notée au nom du mari", () => {
    expect(added.has('4')).toBe(false)
    expect(added.has('7')).toBe(false)
    expect(added.has('2')).toBe(false)
  })
  it("rend l'autre parent à estomper", () => {
    expect([...coParents]).toEqual(['2'])
  })
  it('ignore la casse du nom', () => {
    expect(bearersOfName(['1'], 'GARNIER', graph).added.has('3')).toBe(true)
  })
})

describe('kinAround', () => {
  it('ma ligne seulement : personne autour', () => {
    expect(kinAround(['1'], 0, graph).size).toBe(0)
  })
  it('1 lien : conjoint et enfants, et l\'autre parent', () => {
    expect([...kinAround(['1'], 1, graph)].sort()).toEqual(['2', '3', '4'])
  })
  it('2 liens : petits-enfants, conjoints des enfants, parents du conjoint', () => {
    expect([...kinAround(['1'], 2, graph)].sort()).toEqual(['2', '3', '4', '5', '6', '8'])
  })
})
