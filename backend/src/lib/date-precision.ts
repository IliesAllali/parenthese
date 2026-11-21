import { z } from 'zod'

// Précision tapée dans le champ de date de la fiche : « vers 1920 » (about), « mars 1950 » (month, rangée au 1er du
// mois). Les autres précisions (entre, avant, après…) ne viennent que d'un GEDCOM.
export const typedDatePrecisionSchema = z.enum(['about', 'month']).optional().nullable()
export type TypedPrecisions = { birthDatePrecision?: string | null; deathDatePrecision?: string | null }

// Une date corrigée à la main perd la précision lue dans le GEDCOM (« vers 1879 », « entre 1914 et 1918 ») :
// elle décrivait l'ancienne date, pas celle qu'on vient de saisir. Une date renvoyée telle quelle la garde.

const sameDay = (a: Date | null | undefined, b: Date | null | undefined) =>
  (a ? a.toISOString().slice(0, 10) : null) === (b ? b.toISOString().slice(0, 10) : null)

type PersonDates = { birthDate: Date | null; deathDate: Date | null }

export function personPrecisionResets(current: PersonDates | null, next: Partial<PersonDates>, typed: TypedPrecisions = {}) {
  const out: { birthDatePrecision?: string | null; birthDateEnd?: null; deathDatePrecision?: string | null; deathDateEnd?: null } = {}
  // Une précision tapée avec la date (« vers 1920 ») remplace celle d'avant, et la fin d'une période lue dans un GEDCOM
  const withTyped = () => {
    if (typed.birthDatePrecision !== undefined) {
      out.birthDatePrecision = typed.birthDatePrecision
      out.birthDateEnd = null
    }
    if (typed.deathDatePrecision !== undefined) {
      out.deathDatePrecision = typed.deathDatePrecision
      out.deathDateEnd = null
    }
    return out
  }
  if (!current) return withTyped()
  if (next.birthDate !== undefined && !sameDay(current.birthDate, next.birthDate)) {
    out.birthDatePrecision = null
    out.birthDateEnd = null
  }
  if (next.deathDate !== undefined && !sameDay(current.deathDate, next.deathDate)) {
    out.deathDatePrecision = null
    out.deathDateEnd = null
  }
  return withTyped()
}

export function unionPrecisionResets(current: { startDate: Date | null } | null, next: { startDate?: Date | null }) {
  if (!current || next.startDate === undefined || sameDay(current.startDate, next.startDate)) return {}
  return { startDatePrecision: null }
}
