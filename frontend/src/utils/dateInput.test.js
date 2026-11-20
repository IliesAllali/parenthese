import { describe, expect, it } from 'vitest'
import { dateEntryToText, dateWarnings, dateToInputText, formatDigitsAsDate, isYearOnly, parseDateEntry, parseDateInput } from './dateInput.js'

describe('saisie d’une date (issue #77)', () => {
  it('une année seule ou une date complète', () => {
    expect(parseDateInput('1950')).toBe('1950-01-01')
    expect(parseDateInput('12/03/1950')).toBe('1950-03-12')
    expect(parseDateInput('2.3.1950')).toBe('1950-03-02')
    expect(parseDateInput('1950-03-12')).toBe('1950-03-12')
    expect(parseDateInput('  ')).toBe('')
  })

  it('refuse ce qui n’est pas une date', () => {
    expect(parseDateInput('31/02/1950')).toBeUndefined()
    expect(parseDateInput('195')).toBeUndefined()
    expect(parseDateInput('vers 1950')).toBeUndefined()
  })

  it('réaffiche la valeur comme on l’a tapée', () => {
    expect(dateToInputText('1950-01-01')).toBe('1950')
    expect(dateToInputText('1950-03-12')).toBe('12/03/1950')
    expect(dateToInputText(null)).toBe('')
    expect(isYearOnly('1950-01-01')).toBe(true)
    expect(isYearOnly('1950-03-12')).toBe(false)
  })
})

describe('formatDigitsAsDate', () => {
  it('pose les barres au-delà de quatre chiffres, pour le clavier numérique du téléphone', () => {
    expect(formatDigitsAsDate('1950')).toBe('1950')
    expect(formatDigitsAsDate('12031')).toBe('12/03/1')
    expect(formatDigitsAsDate('12031950')).toBe('12/03/1950')
    expect(parseDateInput(formatDigitsAsDate('12031950'))).toBe('1950-03-12')
  })

  it('laisse tel quel ce qui contient déjà un séparateur', () => {
    expect(formatDigitsAsDate('12/03/19')).toBe('12/03/19')
    expect(formatDigitsAsDate('1/3/1950')).toBe('1/3/1950')
  })
})

const FR = { order: 'dmy', sep: '/' }
const US = { order: 'mdy', sep: '/' }
const CA = { order: 'ymd', sep: '-' }

describe('région du navigateur (issue #152)', () => {
  it('en-US : le mois avant le jour', () => {
    expect(dateToInputText('1950-03-12', US)).toBe('03/12/1950')
    expect(parseDateInput('03/12/1950', US)).toBe('1950-03-12')
    expect(parseDateInput('12/25/1950', US)).toBe('1950-12-25')
    expect(parseDateInput('25/12/1950', US)).toBeUndefined()
    expect(formatDigitsAsDate('03121950', US)).toBe('03/12/1950')
  })
  it('fr-CA : l année d abord, avec des tirets', () => {
    expect(dateToInputText('1950-03-12', CA)).toBe('1950-03-12')
    expect(parseDateInput('1950-3-12', CA)).toBe('1950-03-12')
    expect(formatDigitsAsDate('19500312', CA)).toBe('1950-03-12')
    expect(formatDigitsAsDate('19503', CA)).toBe('1950-3')
  })
  it('une année seule ne change nulle part', () => {
    for (const f of [FR, US, CA]) {
      expect(dateToInputText('1950-01-01', f)).toBe('1950')
      expect(dateToInputText('1950', f)).toBe('1950')
      expect(parseDateInput('1950', f)).toBe('1950-01-01')
    }
  })
  it('l année en premier se lit partout', () => {
    expect(parseDateInput('1950-03-12', FR)).toBe('1950-03-12')
    expect(parseDateInput('1950/03/12', US)).toBe('1950-03-12')
  })
})

describe('mois en lettres, français, anglais ou allemand', () => {
  it('jour, mois, année', () => {
    expect(parseDateInput('12 juin 1924', FR)).toBe('1924-06-12')
    expect(parseDateInput('1er août 1950', FR)).toBe('1950-08-01')
    expect(parseDateInput('12 June 1924', US)).toBe('1924-06-12')
    expect(parseDateInput('3 sept. 1901', FR)).toBe('1901-09-03')
    expect(parseDateInput('3 févr 1901', FR)).toBe('1901-02-03')
    expect(parseDateInput('3 FEVRIER 1901', FR)).toBe('1901-02-03')
  })
  it('mois, jour, année', () => {
    expect(parseDateInput('June 12, 1924', US)).toBe('1924-06-12')
    expect(parseDateInput('Aug 1st 1950', FR)).toBe('1950-08-01')
  })
  it('refuse un mois ambigu ou une date impossible', () => {
    expect(parseDateInput('12 ju 1924', FR)).toBeUndefined()
    expect(parseDateInput('12 jui 1924', FR)).toBeUndefined()
    expect(parseDateInput('31 juin 1924', FR)).toBeUndefined()
    expect(parseDateInput('juin 1924', FR)).toBeUndefined()
  })
  it('allemand : point après le jour, Umlaut facultatif, Jänner', () => {
    const DE = { order: 'dmy', sep: '.' }
    expect(parseDateInput('12. März 1950', DE)).toBe('1950-03-12')
    expect(parseDateInput('12 Marz 1950', DE)).toBe('1950-03-12')
    expect(parseDateInput('1. Okt. 1901', DE)).toBe('1901-10-01')
    expect(parseDateInput('24. Dezember 1944', DE)).toBe('1944-12-24')
    expect(parseDateInput('3. Jänner 1920', DE)).toBe('1920-01-03')
    expect(parseDateInput('12.03.1950', DE)).toBe('1950-03-12')
    expect(dateToInputText('1950-03-12', DE)).toBe('12.03.1950')
    expect(parseDateInput('31. Juni 1950', DE)).toBeUndefined()
  })
})

describe('date approchée (cas limites du 20/11)', () => {
  const fr = { order: 'dmy', sep: '/' }
  it('mois et année : en lettres, en chiffres, au pavé numérique', () => {
    for (const text of ['mars 1950', 'Mars 1950', 'March 1950', 'März 1950', '03/1950', '3.1950', '1950-03', '031950', '03/19/50']) {
      expect(parseDateEntry(text, fr)).toEqual({ date: '1950-03-01', precision: 'month' })
    }
  })

  it('vers une année, en français, en anglais, en allemand', () => {
    for (const text of ['vers 1920', 'Vers 1920', 'v. 1920', 'env. 1920', 'about 1920', 'circa 1920', 'ca. 1920', 'um 1920', '~1920']) {
      expect(parseDateEntry(text, fr)).toEqual({ date: '1920-01-01', precision: 'about' })
    }
  })

  it('une date exacte ou vide garde sa forme, le reste est refusé', () => {
    expect(parseDateEntry('1950', fr)).toEqual({ date: '1950-01-01', precision: null })
    expect(parseDateEntry('12/03/1950', fr)).toEqual({ date: '1950-03-12', precision: null })
    expect(parseDateEntry('', fr)).toEqual({ date: '', precision: null })
    for (const text of ['13/1950', 'vers mars', 'bientôt 1920', '10/11/19', 'vers 19']) {
      expect(parseDateEntry(text, fr)).toBeUndefined()
    }
  })

  it('réaffiche une date approchée comme on la dit', () => {
    expect(dateEntryToText('1920-01-01', 'about', fr)).toBe('vers 1920')
    expect(dateEntryToText('1950-03-01', 'month', fr)).toMatch(/^mars 1950$/i)
    expect(dateEntryToText('1950-03-12', null, fr)).toBe('12/03/1950')
    expect(parseDateEntry(dateEntryToText('1950-03-01', 'month', fr), fr)).toEqual({ date: '1950-03-01', precision: 'month' })
  })
})

describe('avertissements doux des dates (cas limites du 20/11)', () => {
  const today = '2026-11-20'
  it('signale un décès avant la naissance', () => {
    expect(dateWarnings({ birthDate: '1950-03-12', deathDate: '1949-12-31' }, today).death).toBe('Le décès est avant la naissance')
    expect(dateWarnings({ birthDate: '1950-03-12', deathDate: '2001-01-01' }, today)).toEqual({ birth: '', death: '' })
  })
  it('compare à l’année près une date à l’année, au mois ou « vers »', () => {
    expect(dateWarnings({ birthDate: '1950-06-12', deathDate: '1950-01-01' }, today).death).toBe('')
    expect(dateWarnings({ birthDate: '1920-01-01', birthDatePrecision: 'about', deathDate: '1919-05-01', deathDatePrecision: 'month' }, today).death).toBe('Le décès est avant la naissance')
  })
  it('signale une date dans le futur', () => {
    expect(dateWarnings({ birthDate: '2026-12-01' }, today).birth).toBe('Cette date est dans le futur')
    expect(dateWarnings({ birthDate: '2026-01-01' }, today).birth).toBe('')
    expect(dateWarnings({ birthDate: '1950-01-01', deathDate: '2027-01-01' }, today).death).toBe('Cette date est dans le futur')
  })
})
