// Saisie d'une date dans la fiche : une année seule (« 1950 ») ou une date complète (« 12/03/1950 »).
// L'année seule se range au 1er janvier, la convention de toute l'appli (issue #77).
// L'ordre et le séparateur suivent la région du navigateur : « 03/12/1950 » en en-US, « 1950-03-12 » en fr-CA
// (issue #152). Le mois s'écrit aussi en lettres, en français, en anglais ou en allemand : « 12 mars 1950 »,
// « March 12, 1950 », « 12. März 1950 ».
// Une date approchée se tape aussi (cas limites du 20/11) : « mars 1950 » ou « 03/1950 », rangée au 1er du mois avec la
// précision « month », et « vers 1920 » (about, around, um, ca.), rangée au 1er janvier avec la précision « about ».
import { dateFormat, dateLocale, t } from '../i18n/index.js'

const pad = (n) => String(n).padStart(2, '0')

// Valeur stockée (« 1950-01-01 », « 1950 », « 1950-03-12 ») vers le texte du champ
export function dateToInputText(value, { order, sep } = dateFormat) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const full = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (full) {
    const [, y, m, d] = full
    if (m === '01' && d === '01') return y
    const parts = { d, m, y }
    return order.split('').map((k) => parts[k]).join(sep)
  }
  const year = raw.match(/^(\d{4})$/)
  return year ? year[1] : raw
}

// Chiffres seuls au-delà d'une année (5 à 8 chiffres) : on pose les séparateurs, « 12031950 » → « 12/03/1950 »
export function formatDigitsAsDate(text, { order, sep } = dateFormat) {
  const raw = String(text ?? '')
  if (!/^\d{5,8}$/.test(raw)) return raw
  if (order === 'ymd') return [raw.slice(0, 4), raw.slice(4, 6), raw.slice(6)].filter(Boolean).join(sep)
  return `${raw.slice(0, 2)}${sep}${raw.slice(2, 4)}${sep}${raw.slice(4)}`
}

// Noms des mois sans accents, en minuscules, dans les langues de l'appli (« janner » : Jänner, en Autriche)
const MONTHS = [
  ['janvier', 'january', 'januar', 'janner'], ['fevrier', 'february', 'februar'], ['mars', 'march', 'marz'], ['avril', 'april'],
  ['mai', 'may'], ['juin', 'june', 'juni'], ['juillet', 'july', 'juli'], ['aout', 'august'], ['septembre', 'september'],
  ['octobre', 'october', 'oktober'], ['novembre', 'november'], ['decembre', 'december', 'dezember'],
]
const normalize = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// « juin », « June », « sept. », « févr » : un mois si le mot (3 lettres au moins) n'en désigne qu'un
function monthFromWord(word) {
  const w = normalize(word).replace(/\.$/, '')
  if (w.length < 3 || !/^[a-z]+$/.test(w)) return undefined
  const found = new Set(MONTHS.flatMap((names, i) => (names.some((n) => n.startsWith(w)) ? [i + 1] : [])))
  return found.size === 1 ? [...found][0] : undefined
}

// « 12 juin 1950 », « 1er juin 1950 », « June 12, 1950 », « 12 June 1950 », « 12. Juni 1950 »
function parseWritten(raw) {
  const words = raw.replace(/,/g, ' ').replace(/\b(\d{1,2})(er|st|nd|rd|th)\b/gi, '$1').replace(/^(\d{1,2})\.(?=\s)/, '$1')
    .split(/\s+/).filter(Boolean)
  if (words.length !== 3 || !/^\d{4}$/.test(words[2])) return undefined
  const [a, b, year] = words
  if (/^\d{1,2}$/.test(a) && monthFromWord(b)) return { day: a, month: monthFromWord(b), year }
  if (monthFromWord(a) && /^\d{1,2}$/.test(b)) return { day: b, month: monthFromWord(a), year }
  return undefined
}

// Texte du champ vers la valeur stockée : '' si vide, « AAAA-MM-JJ » si valable, undefined si on ne comprend pas
export function parseDateInput(text, { order } = dateFormat) {
  const raw = String(text ?? '').trim()
  if (!raw) return ''
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`
  let day
  let month
  let year
  const yearLast = raw.match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/)
  const yearFirst = raw.match(/^(\d{4})[/.\-\s](\d{1,2})[/.\-\s](\d{1,2})$/)
  const written = yearLast || yearFirst ? undefined : parseWritten(raw)
  // Année en dernier : le mois d'abord seulement dans une région qui l'écrit ainsi (en-US)
  if (yearLast && order === 'mdy') [, month, day, year] = yearLast
  else if (yearLast) [, day, month, year] = yearLast
  else if (yearFirst) [, year, month, day] = yearFirst
  else if (written) ({ day, month, year } = written)
  else return undefined
  const d = Number(day)
  const m = Number(month)
  const y = Number(year)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined
  return `${year}-${pad(m)}-${pad(d)}`
}

// Une année seule (rangée au 1er janvier) se lit « 1950 », pas « 1 janvier 1950 »
export const isYearOnly = (value) => /^\d{4}(-01-01)?$/.test(String(value ?? '').slice(0, 10))

// « vers », « environ », « about », « um », « ca. », « ~ » devant une année
const ABOUT_WORDS = ['vers', 'v', 'env', 'environ', 'about', 'abt', 'around', 'circa', 'ca', 'c', 'um', 'etwa', 'ungefahr', 'gegen']
function stripAbout(raw) {
  const tilde = raw.match(/^~\s*(.+)$/)
  if (tilde) return tilde[1]
  const match = raw.match(/^([^\s\d]+)\.?\s+(.+)$/)
  if (match && ABOUT_WORDS.includes(normalize(match[1]).replace(/\.$/, ''))) return match[2]
  return null
}

// « mars 1950 », « March 1950 », « März 1950 », « 03/1950 », « 3.1950 », « 1950-03 »
function parseMonthYear(raw) {
  const words = raw.replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  let month
  let year
  if (words.length === 2 && /^\d{4}$/.test(words[1]) && monthFromWord(words[0])) [month, year] = [monthFromWord(words[0]), words[1]]
  const digits = raw.match(/^(\d{1,2})[/.\-\s](\d{4})$/) || raw.match(/^(\d{4})[/.-](\d{1,2})$/)
  if (!month && digits) [month, year] = /^\d{4}$/.test(digits[1]) ? [Number(digits[2]), digits[1]] : [Number(digits[1]), digits[2]]
  // Pavé numérique du téléphone, sans barre : « 031950 », que le champ a mis en forme « 03/19/50 ». Une année avant
  // 1500 est écartée, pour ne pas lire « 10/11/19 » (le début de 10/11/1950) comme octobre 1119.
  const compact = raw.replace(/[/.\-\s]/g, '')
  if (!month && /^\d{5,6}$/.test(compact) && Number(compact.slice(-4)) >= 1500) [month, year] = [Number(compact.slice(0, -4)), compact.slice(-4)]
  if (!month || month < 1 || month > 12) return undefined
  return `${year}-${pad(month)}-01`
}

// Texte du champ vers { date, precision } : date « AAAA-MM-JJ » (ou '' si vide), precision null, 'month' ou 'about' ;
// undefined si on ne comprend pas
export function parseDateEntry(text, format = dateFormat) {
  const raw = String(text ?? '').trim()
  const exact = parseDateInput(raw, format)
  if (exact !== undefined) return { date: exact, precision: null }
  const month = parseMonthYear(raw)
  if (month) return { date: month, precision: 'month' }
  const about = stripAbout(raw)
  if (about && /^\d{4}$/.test(about.trim())) return { date: `${about.trim()}-01-01`, precision: 'about' }
  return undefined
}

// Valeur stockée et sa précision vers le texte du champ : « vers 1920 », « mars 1950 », sinon comme dateToInputText
export function dateEntryToText(value, precision, format = dateFormat) {
  const raw = String(value ?? '').trim()
  const parts = raw.match(/^(\d{4})-(\d{2})/)
  if (parts && precision === 'about') return t('vers {year}', { year: parts[1] })
  if (parts && precision === 'month') {
    return new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, 1)).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
  return dateToInputText(value, format)
}

// Précisions à envoyer avec les dates d'une personne : seulement celles d'une date présente
export function datePrecisionsOf(person = {}) {
  return {
    birthDatePrecision: person.birthDate ? person.birthDatePrecision || null : null,
    deathDatePrecision: person.deathDate ? person.deathDatePrecision || null : null,
  }
}
