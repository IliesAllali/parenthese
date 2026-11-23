import { afterEach, describe, expect, it } from 'vitest'
import { familyNameFirst, firstNameLabel, fullNameLabel, isFirstNameUnknown, setSurnameUppercase, shortNameLabel, surnameLabel } from './personName.js'

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

describe('noms d’Asie de l’Est (#258)', () => {
  afterEach(() => setSurnameUppercase(false))
  const fang = { firstName: '仕龙', lastName: '房' }

  it('met le nom de famille d’abord, collé au prénom', () => {
    expect(familyNameFirst(fang)).toBe(true)
    expect(fullNameLabel(fang)).toBe('房仕龙')
    expect(fullNameLabel({ firstName: '민준', lastName: '김' })).toBe('김민준')
    expect(fullNameLabel({ firstName: 'Kong-sang', lastName: 'Chan' })).toBe('Kong-sang Chan')
  })

  it('garde le libellé du prénom inconnu à part', () => {
    expect(fullNameLabel({ firstName: '', lastName: '房' })).toBe('Prénom inconnu 房')
    expect(fullNameLabel({ firstName: '', lastName: '房' }, { unknown: false })).toBe('房')
  })

  it('dans une phrase, un prénom en caractères Han donne le nom entier', () => {
    expect(shortNameLabel(fang)).toBe('房仕龙')
    expect(shortNameLabel({ firstName: '仕龙', lastName: '' })).toBe('仕龙')
    expect(shortNameLabel({ firstName: 'Marie', lastName: 'Dupont' })).toBe('Marie')
  })

  it('le japonais en kana et le coréen gardent le prénom seul', () => {
    expect(shortNameLabel({ firstName: 'さくら', lastName: '山田' })).toBe('さくら')
    expect(shortNameLabel({ firstName: '민준', lastName: '김' })).toBe('민준')
  })
})
