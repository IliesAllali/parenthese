import { locale, t } from '../i18n/index.js'
import { EAST_ASIAN, HAN } from './eastAsian.js'

// Noms de famille en capitales (« Bertrand GAUTHIER ») : réglage de l'arbre ouvert, reçu avec le graphe.
// Seul l'affichage change, le nom reste enregistré tel qu'il a été tapé.
let surnameUppercase = false

export function setSurnameUppercase(on) {
  surnameUppercase = Boolean(on)
}

export function isSurnameUppercase() {
  return surnameUppercase
}

// Nom de famille (ou de naissance) tel qu'il s'affiche
export function surnameLabel(value) {
  const name = String(value ?? '').trim()
  return surnameUppercase ? name.toLocaleUpperCase(locale) : name
}

// Prénom inconnu : le backend stocke une chaîne vide. L'affichage dit « Prénom inconnu » (en italique).
export function isFirstNameUnknown(person) {
  return !String(person?.firstName ?? '').trim()
}

export function firstNameLabel(person) {
  return isFirstNameUnknown(person) ? t('Prénom inconnu') : String(person.firstName).trim()
}

// Un nom écrit en chinois, japonais ou coréen se lit nom de famille d'abord, collé au prénom (« 陳港生 ») (#258).
// Un nom romanisé (« Kong-sang Chan ») garde l'ordre tel qu'il a été saisi.
export function familyNameFirst(person) {
  return EAST_ASIAN.test(`${person?.firstName ?? ''}${person?.lastName ?? ''}`)
}

// « Prénom Nom » pour une phrase ou une liste, « 陳港生 » pour un nom d'Asie de l'Est. Le prénom inconnu s'affiche
// comme son libellé, séparé du nom ; `unknown: false` le laisse vide (le nom seul, ou rien)
export function fullNameLabel(person, { unknown = true } = {}) {
  const unknownFirst = isFirstNameUnknown(person)
  const first = unknownFirst ? (unknown ? firstNameLabel(person) : '') : String(person.firstName).trim()
  const last = surnameLabel(person?.lastName)
  if (familyNameFirst(person) && !unknownFirst) return `${last}${first}`
  return [first, last].filter(Boolean).join(' ').trim()
}

// Le nom d'une personne dans une phrase (« Pas encore de souvenir pour Marie ») : son prénom. Un prénom chinois
// ne s'emploie guère seul, surtout d'un caractère : un prénom en caractères Han donne le nom entier (#258).
// Le japonais et le coréen ne sont pas tranchés : un prénom en kana ou en hangul reste seul.
export function shortNameLabel(person) {
  const first = String(person?.firstName ?? '')
  return HAN.test(first) && !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(first) ? fullNameLabel(person) : firstNameLabel(person)
}
