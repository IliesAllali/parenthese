import { locale, t } from '../i18n/index.js'

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

// « Prénom Nom » pour une phrase ou une liste ; le prénom inconnu s'affiche comme son libellé
export function fullNameLabel(person) {
  return [firstNameLabel(person), surnameLabel(person?.lastName)].filter(Boolean).join(' ').trim()
}
