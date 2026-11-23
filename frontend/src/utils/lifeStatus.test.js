import { describe, expect, it } from 'vitest'
import { deceasedLabel, presumedDeceased, vitalChanges } from './lifeStatus.js'

describe('statut en vie ou décédé(e)', () => {
  const now = new Date(2026, 10, 23)

  it('née il y a plus de 110 ans : décédée par défaut', () => {
    expect(presumedDeceased('1886-01-01', now)).toBe(true)
    expect(presumedDeceased('1915', now)).toBe(true)
  })

  it('110 ans tout juste, plus jeune, ou sans naissance : en vie', () => {
    expect(presumedDeceased('1916-01-01', now)).toBe(false)
    expect(presumedDeceased('1990-05-12', now)).toBe(false)
    expect(presumedDeceased('', now)).toBe(false)
    expect(presumedDeceased(null, now)).toBe(false)
  })

  it('le libellé décédé suit le sexe', () => {
    expect(deceasedLabel('male')).toBe('Décédé')
    expect(deceasedLabel('female')).toBe('Décédée')
    expect(deceasedLabel(null)).toBe('Décédé(e)')
  })
})

describe('décès saisi dans l’onglet Vie : les changements de la fiche', () => {
  const empty = { year: '', day: '', approx: false, place: '' }

  it('une personne en vie : la date, le lieu, et le passage en décédé(e)', () => {
    expect(vitalChanges('death', empty, { year: '1950', day: '', approx: false, place: ' Nantes ' }, false))
      .toEqual({ deathYear: '1950', deathDatePrecision: null, deathPlace: 'Nantes', isAlive: false })
  })

  it('décès sans date : la personne passe quand même en décédé(e)', () => {
    expect(vitalChanges('death', empty, empty, false)).toEqual({ isAlive: false })
  })

  it('date exacte, ou année environ', () => {
    expect(vitalChanges('death', empty, { year: '1950', day: '1950-03-12', approx: false, place: '' }, true))
      .toEqual({ deathYear: '1950-03-12', deathDatePrecision: null })
    expect(vitalChanges('death', empty, { year: '1950', day: '', approx: true, place: '' }, true))
      .toEqual({ deathYear: '1950', deathDatePrecision: 'about' })
  })

  it('rien de changé sur une personne décédée : rien ne part, une précision au mois reste intacte', () => {
    const initial = { year: '1950', day: '', approx: false, place: 'Nantes' }
    expect(vitalChanges('death', initial, { ...initial }, true)).toEqual({})
  })

  it('la naissance ne touche pas au statut', () => {
    expect(vitalChanges('birth', empty, { year: '1886', day: '', approx: false, place: '' }, false))
      .toEqual({ birthYear: '1886', birthDatePrecision: null })
  })
})
