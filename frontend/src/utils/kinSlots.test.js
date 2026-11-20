import { describe, expect, it } from 'vitest'
import { isSlotId, kinSlots } from './kinSlots'
import { normalizeFiliationsForLayout } from '../components/galaxy/elkLayout'

const person = (id, sex = null) => ({ id, firstName: id, lastName: 'Martin', sex })

describe('kinSlots', () => {
  it('une personne seule : son père et sa mère en cases, en couple', () => {
    const slots = kinSlots({ selfId: 'lucie', persons: [person('lucie', 'female')] })
    expect(slots.persons.map((p) => [p.slot.role, p.slot.childId, p.slot.generation])).toEqual([
      ['father', 'lucie', 1],
      ['mother', 'lucie', 1],
    ])
    expect(slots.persons.every((p) => isSlotId(p.id) && p.ghost.source === 'slot')).toBe(true)
    expect(slots.unions).toHaveLength(1)
    expect(slots.filiations[0]).toMatchObject({ childId: 'lucie', unionId: slots.unions[0].id })
  })

  it('un parent saisi : la case de l’autre parent, et les deux grands-parents de ce côté', () => {
    const persons = [person('lucie', 'female'), person('marc', 'male')]
    const filiations = [{ id: 'f1', childId: 'lucie', parentId: 'marc', unionId: null }]
    const slots = kinSlots({ selfId: 'lucie', persons, unions: [], filiations })
    expect(slots.persons.map((p) => `${p.slot.childId}:${p.slot.role}`)).toEqual(['lucie:mother', 'marc:father', 'marc:mother'])
    // Le placement relie Marc et la case en couple : pas de « Inconnu » à côté de Marc
    const all = [...filiations, ...slots.filiations]
    const normalized = normalizeFiliationsForLayout(all, slots.unions).filter((f) => f.childId === 'lucie')
    expect(normalized).toHaveLength(1)
    expect(normalized[0].unionId).toBe('ghost:slot:lucie:u')
  })

  it('parent de sexe inconnu : la case dit « parent »', () => {
    const persons = [person('lucie'), person('alex')]
    const slots = kinSlots({ selfId: 'lucie', persons, filiations: [{ id: 'f', childId: 'lucie', parentId: 'alex' }] })
    expect(slots.persons[0].slot.role).toBe('parent')
  })

  it('deux parents et quatre grands-parents : plus aucune case', () => {
    const persons = ['lucie', 'marc', 'helene', 'paul', 'jeanne', 'henri', 'rose'].map((id) => person(id))
    const unions = [
      { id: 'u1', partner1Id: 'marc', partner2Id: 'helene' },
      { id: 'u2', partner1Id: 'paul', partner2Id: 'jeanne' },
      { id: 'u3', partner1Id: 'henri', partner2Id: 'rose' },
    ]
    const filiations = [
      { id: 'f1', childId: 'lucie', unionId: 'u1' },
      { id: 'f2', childId: 'marc', unionId: 'u2' },
      { id: 'f3', childId: 'helene', unionId: 'u3' },
    ]
    expect(kinSlots({ selfId: 'lucie', persons, unions, filiations }).persons).toEqual([])
  })

  it('s’arrête aux grands-parents', () => {
    const persons = ['lucie', 'marc', 'paul'].map((id) => person(id, 'male'))
    const filiations = [{ id: 'f1', childId: 'lucie', parentId: 'marc' }, { id: 'f2', childId: 'marc', parentId: 'paul' }]
    const slots = kinSlots({ selfId: 'lucie', persons, filiations })
    expect(slots.persons.some((p) => p.slot.childId === 'paul')).toBe(false)
  })

  it('sans personne de départ : rien', () => {
    expect(kinSlots({ selfId: null, persons: [person('a')] }).persons).toEqual([])
    expect(kinSlots({ selfId: 'absent', persons: [person('a')] }).persons).toEqual([])
  })
})
