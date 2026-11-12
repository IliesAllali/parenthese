import { afterEach, describe, expect, it } from 'vitest'
import { firstNameLabel, fullNameLabel, isFirstNameUnknown, setSurnameUppercase, surnameLabel } from './personName.js'

describe('prénom inconnu', () => {
  it('un prénom vide ou blanc est inconnu', () => {
    expect(isFirstNameUnknown({ firstName: '' })).toBe(true)
    expect(isFirstNameUnknown({ firstName: '   ' })).toBe(true)
    expect(isFirstNameUnknown({ firstName: 'Marie' })).toBe(false)
  })

  it('le libellé affiché remplace le prénom vide', () => {
    expect(firstNameLabel({ firstName: '' })).toBe('Prénom inconnu')
    expect(firstNameLabel({ firstName: ' Marie ' })).toBe('Marie')
  })

  it('le nom complet garde le nom de famille à côté du libellé', () => {
    expect(fullNameLabel({ firstName: '', lastName: 'Dupont' })).toBe('Prénom inconnu Dupont')
    expect(fullNameLabel({ firstName: 'Marie', lastName: '' })).toBe('Marie')
  })
})

describe('noms de famille en capitales', () => {
  afterEach(() => setSurnameUppercase(false))

  it('laisse le nom tel qu il a été tapé tant que le réglage est éteint', () => {
    expect(surnameLabel('Gauthier')).toBe('Gauthier')
    expect(fullNameLabel({ firstName: 'Bertrand', lastName: 'Gauthier' })).toBe('Bertrand Gauthier')
  })

  it('met le nom en capitales, accents et particules compris, sans toucher au prénom', () => {
    setSurnameUppercase(true)
    expect(surnameLabel(' de la Fontaine ')).toBe('DE LA FONTAINE')
    expect(surnameLabel('Lefèvre-Hébert')).toBe('LEFÈVRE-HÉBERT')
    expect(fullNameLabel({ firstName: 'Bertrand', lastName: 'Gauthier' })).toBe('Bertrand GAUTHIER')
    expect(fullNameLabel({ firstName: '', lastName: 'Gauthier' })).toBe('Prénom inconnu GAUTHIER')
  })

  it('ne transforme pas une valeur absente', () => {
    setSurnameUppercase(true)
    expect(surnameLabel(null)).toBe('')
    expect(surnameLabel(undefined)).toBe('')
  })
})
