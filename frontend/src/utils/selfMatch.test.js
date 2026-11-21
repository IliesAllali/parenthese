import { describe, expect, it } from 'vitest'
import { candidateLabels, findSelfCandidates } from './selfMatch.js'

// « C'est vous, Claire ? » (#248)
describe('reconnaître la personne qui ouvre le lien', () => {
  const persons = [
    { id: 1, firstName: 'Claire', birthYear: 1985, isAlive: true },
    { id: 2, firstName: 'Claire', birthYear: 1931, deathYear: 2019, isAlive: false },
    { id: 3, firstName: 'Hélène', birthYear: 1960, isAlive: true },
    { id: 4, firstName: 'Marie-Claire', birthYear: 1990, isAlive: true },
  ]

  it('trouve une seule personne vivante, sans tenir compte des accents ni de la casse', () => {
    expect(findSelfCandidates(persons, ' claire ').map((p) => p.id)).toEqual([1])
    expect(findSelfCandidates(persons, 'helene').map((p) => p.id)).toEqual([3])
  })

  it('compare le premier prénom tapé, et garde un prénom composé entier', () => {
    expect(findSelfCandidates(persons, 'Claire Martin').map((p) => p.id)).toEqual([1])
    expect(findSelfCandidates(persons, 'Marie-Claire').map((p) => p.id)).toEqual([4])
  })

  it('ne propose rien sans prénom ou sans personne qui correspond', () => {
    expect(findSelfCandidates(persons, '')).toEqual([])
    expect(findSelfCandidates(persons, 'Victor')).toEqual([])
  })

  it('propose de choisir quand plusieurs personnes vivantes portent ce prénom', () => {
    const twins = [...persons, { id: 5, firstName: 'Claire', birthYear: 2010, isAlive: true }]
    expect(findSelfCandidates(twins, 'Claire').map((p) => p.id)).toEqual([1, 5])
  })
})

describe('deux personnes du même prénom', () => {
  it('chaque bouton dit le nom et l’année, puis les parents si les deux se ressemblent encore', () => {
    const parents = { a: [{ firstName: 'Jeanne' }, { firstName: 'Paul' }], b: [{ firstName: 'Lucie' }] }
    expect(candidateLabels([
      { id: 'a', firstName: 'Claire', lastName: 'Martin' },
      { id: 'b', firstName: 'Claire', lastName: 'Martin' },
      { id: 'c', firstName: 'Claire', lastName: 'Duval', birthYear: 1990 },
    ], (person) => parents[person.id] || [])).toEqual(['Claire Martin · Jeanne & Paul', 'Claire Martin · Lucie', 'Claire Duval · 1990'])
  })
})
