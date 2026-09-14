import { describe, it, expect } from 'vitest'
import { computeRelationshipLabel } from './pathfinding'

describe('computeRelationshipLabel', () => {
  it('returns empty string for empty path', () => {
    expect(computeRelationshipLabel([])).toBe('')
  })

  it('returns empty string for single-edge path', () => {
    expect(computeRelationshipLabel([{ type: 'couple', id: 'c1' }])).toBe('')
  })

  it('returns Conjoint(e) for spouse (couple→couple)', () => {
    expect(computeRelationshipLabel([
      { type: 'couple', id: 'c1' },
      { type: 'couple', id: 'c2' },
    ])).toBe('Conjoint(e)')
  })

  it('returns Parent for 1 up (filiation→couple)', () => {
    expect(computeRelationshipLabel([
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c1' },
    ])).toBe('Parent')
  })

  it('returns Enfant for 1 down (couple→filiation)', () => {
    expect(computeRelationshipLabel([
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f1' },
    ])).toBe('Enfant')
  })

  it('returns Grand-parent for 2 ups', () => {
    expect(computeRelationshipLabel([
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f2' },
      { type: 'couple', id: 'c2' },
    ])).toBe('Grand-parent')
  })

  it('returns Petit-enfant for 2 downs', () => {
    expect(computeRelationshipLabel([
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c2' },
      { type: 'filiation', id: 'f2' },
    ])).toBe('Petit-enfant')
  })

  it('returns Frère/Sœur for 1 up + 1 down', () => {
    expect(computeRelationshipLabel([
      { type: 'filiation', id: 'f1' },
      { type: 'filiation', id: 'f2' },
    ])).toBe('Frère/Sœur')
  })

  it('returns Oncle/Tante for 2 ups + 1 down', () => {
    expect(computeRelationshipLabel([
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f2' },
      { type: 'filiation', id: 'f3' },
    ])).toBe('Oncle/Tante')
  })

  it('returns Neveu/Nièce for 1 up + 2 downs', () => {
    expect(computeRelationshipLabel([
      { type: 'filiation', id: 'f1' },
      { type: 'filiation', id: 'f2' },
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f3' },
    ])).toBe('Neveu/Nièce')
  })

  it('returns Cousin(e) germain(e) for 2 ups + 2 downs', () => {
    expect(computeRelationshipLabel([
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f2' },
      { type: 'filiation', id: 'f3' },
      { type: 'couple', id: 'c2' },
      { type: 'filiation', id: 'f4' },
    ])).toBe('Cousin(e) germain(e)')
  })

  it('returns Beau-parent for spouse + 1 up', () => {
    expect(computeRelationshipLabel([
      { type: 'couple', id: 'c1' },
      { type: 'couple', id: 'c2' },
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c3' },
    ])).toBe('Beau-parent')
  })

  it('returns Bel-enfant for spouse + 1 down', () => {
    expect(computeRelationshipLabel([
      { type: 'couple', id: 'c1' },
      { type: 'couple', id: 'c2' },
      { type: 'couple', id: 'c3' },
      { type: 'filiation', id: 'f1' },
    ])).toBe('Bel-enfant')
  })

  it('returns Beau-frère/sœur for spouse + 1 up + 1 down', () => {
    expect(computeRelationshipLabel([
      { type: 'couple', id: 'c1' },
      { type: 'couple', id: 'c2' },
      { type: 'filiation', id: 'f1' },
      { type: 'filiation', id: 'f2' },
    ])).toBe('Beau-frère/sœur')
  })

  it('returns Arrière-grand-parent for 3 ups', () => {
    expect(computeRelationshipLabel([
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f2' },
      { type: 'couple', id: 'c2' },
      { type: 'filiation', id: 'f3' },
      { type: 'couple', id: 'c3' },
    ])).toBe('Arrière-grand-parent')
  })

  it('returns Arrière-petit-enfant for 3 downs', () => {
    expect(computeRelationshipLabel([
      { type: 'couple', id: 'c1' },
      { type: 'filiation', id: 'f1' },
      { type: 'couple', id: 'c2' },
      { type: 'filiation', id: 'f2' },
      { type: 'couple', id: 'c3' },
      { type: 'filiation', id: 'f3' },
    ])).toBe('Arrière-petit-enfant')
  })
})
