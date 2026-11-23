import { describe, expect, it } from 'vitest'
import { mostlySurnamesInCapitals, portraitShapeOf } from '../src/lib/tree-display.js'

describe('noms de famille en capitales dans un fichier', () => {
  it('compte à partir de 80 % des noms qui ont des lettres', () => {
    expect(mostlySurnamesInCapitals(['MARTIN', 'DURAND', 'LEFÈVRE', 'GARÇON', 'Martin'])).toBe(true)
    expect(mostlySurnamesInCapitals(['MARTIN', 'DURAND', 'LEFÈVRE', 'Garçon', 'Martin'])).toBe(false)
  })

  it('ignore les noms vides ou sans lettre, et un fichier sans aucun nom ne change rien', () => {
    expect(mostlySurnamesInCapitals(['MARTIN', '', '  ', '?', 'DURAND'])).toBe(true)
    expect(mostlySurnamesInCapitals(['', '?'])).toBe(false)
    expect(mostlySurnamesInCapitals([])).toBe(false)
  })

  it('un nom composé ou à particule tout en capitales compte', () => {
    expect(mostlySurnamesInCapitals(['DE LA FONTAINE', "D'ARTOIS", 'MARTIN-DURAND'])).toBe(true)
  })
})

describe('forme des portraits', () => {
  it('garde les quatre formes connues, le reste revient à « variées »', () => {
    for (const shape of ['varied', 'round', 'square', 'polaroid']) expect(portraitShapeOf(shape)).toBe(shape)
    expect(portraitShapeOf('rect')).toBe('varied')
    expect(portraitShapeOf(null)).toBe('varied')
  })
})
