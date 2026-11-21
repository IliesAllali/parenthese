import { describe, expect, it } from 'vitest'

import { personPrecisionResets, unionPrecisionResets } from '../src/lib/date-precision'

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('précision d’une date corrigée à la main', () => {
  const current = { birthDate: d('1879-01-01'), deathDate: d('1950-05-02') }

  it('une date changée perd sa précision, une date renvoyée telle quelle la garde', () => {
    expect(personPrecisionResets(current, { birthDate: d('1880-03-12'), deathDate: d('1950-05-02') }))
      .toEqual({ birthDatePrecision: null, birthDateEnd: null })
    expect(personPrecisionResets(current, { birthDate: d('1879-01-01') })).toEqual({})
    expect(personPrecisionResets(current, { deathDate: null })).toEqual({ deathDatePrecision: null, deathDateEnd: null })
    expect(personPrecisionResets(current, {})).toEqual({})
  })

  it('mariage', () => {
    expect(unionPrecisionResets({ startDate: d('1905-01-01') }, { startDate: d('1906-01-01') })).toEqual({ startDatePrecision: null })
    expect(unionPrecisionResets({ startDate: d('1905-01-01') }, { startDate: d('1905-01-01') })).toEqual({})
    expect(unionPrecisionResets({ startDate: d('1905-01-01') }, {})).toEqual({})
  })
})

describe('précision tapée dans la fiche (« vers 1920 », « mars 1950 »)', () => {
  const current = { birthDate: d('1879-01-01'), deathDate: null }

  it('remplace la précision d’avant, et la fin d’une période lue dans un GEDCOM', () => {
    expect(personPrecisionResets(current, { birthDate: d('1920-01-01') }, { birthDatePrecision: 'about' }))
      .toEqual({ birthDatePrecision: 'about', birthDateEnd: null })
    expect(personPrecisionResets(current, { birthDate: d('1950-03-01') }, { birthDatePrecision: 'month' }))
      .toEqual({ birthDatePrecision: 'month', birthDateEnd: null })
  })

  it('une date redevenue exacte efface la précision, sans précision tapée rien ne change', () => {
    expect(personPrecisionResets(current, { birthDate: d('1879-01-01') }, { birthDatePrecision: null }))
      .toEqual({ birthDatePrecision: null, birthDateEnd: null })
    expect(personPrecisionResets(current, { birthDate: d('1879-01-01') }, {})).toEqual({})
    expect(personPrecisionResets(null, {}, { deathDatePrecision: 'about' })).toEqual({ deathDatePrecision: 'about', deathDateEnd: null })
  })
})
