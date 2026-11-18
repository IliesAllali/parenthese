import { describe, expect, it } from 'vitest'
import { birthdayToday, localDayKey, MAX_BIRTHDAY_AGE } from './birthday.js'

const on = (iso) => new Date(`${iso}T10:00:00`)
const living = (birthDate, extra = {}) => ({ birthDate, isAlive: true, ...extra })

describe('birthdayToday', () => {
  it('fête une personne vivante le jour de sa naissance, avec son âge', () => {
    expect(birthdayToday(living('1928-11-18'), on('2026-11-18'))).toEqual({ age: 98 })
  })

  it('ne fête rien la veille ni le lendemain', () => {
    expect(birthdayToday(living('1928-11-18'), on('2026-11-17'))).toBeNull()
    expect(birthdayToday(living('1928-11-18'), on('2026-11-19'))).toBeNull()
  })

  it('accepte la date telle que la renvoie l’API, avec l’heure', () => {
    expect(birthdayToday(living('1955-04-09T00:00:00.000Z'), on('2026-04-09'))).toEqual({ age: 71 })
  })

  it('ignore une année seule, rangée au 1er janvier', () => {
    expect(birthdayToday(living('1950'), on('2026-01-01'))).toBeNull()
    expect(birthdayToday(living('1950-01-01'), on('2026-01-01'))).toBeNull()
  })

  it('ignore une date approximative (vers, avant, entre)', () => {
    for (const birthDatePrecision of ['about', 'before', 'between', 'estimated']) {
      expect(birthdayToday(living('1928-11-18', { birthDatePrecision }), on('2026-11-18'))).toBeNull()
    }
  })

  it('ne fête pas une personne décédée, avec ou sans date de décès', () => {
    expect(birthdayToday({ birthDate: '1920-11-18', isAlive: false, deathDate: '1995-03-02' }, on('2026-11-18'))).toBeNull()
    expect(birthdayToday({ birthDate: '1920-11-18', isAlive: false, isDeceased: true }, on('2026-11-18'))).toBeNull()
  })

  it(`ne fête pas au-delà de ${MAX_BIRTHDAY_AGE} ans, ni le jour de la naissance`, () => {
    expect(birthdayToday(living('1910-11-18'), on('2026-11-18'))).toBeNull()
    expect(birthdayToday(living('1916-11-18'), on('2026-11-18'))).toEqual({ age: 110 })
    expect(birthdayToday(living('2026-11-18'), on('2026-11-18'))).toBeNull()
  })

  it('fête un 29 février le 28 les années non bissextiles, et le 29 les autres', () => {
    expect(birthdayToday(living('1960-02-29'), on('2026-02-28'))).toEqual({ age: 66 })
    expect(birthdayToday(living('1960-02-29'), on('2028-02-28'))).toBeNull()
    expect(birthdayToday(living('1960-02-29'), on('2028-02-29'))).toEqual({ age: 68 })
  })

  it('ne casse pas sans personne ni date', () => {
    expect(birthdayToday(null)).toBeNull()
    expect(birthdayToday(living(null))).toBeNull()
    expect(birthdayToday(living('date inconnue'))).toBeNull()
  })
})

describe('localDayKey', () => {
  it('donne le jour local', () => {
    expect(localDayKey(on('2026-03-07'))).toBe('2026-03-07')
  })
})
