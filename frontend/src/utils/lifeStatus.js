// En vie ou décédé(e) : le choix montré en deux options côte à côte (fiche, ajout d'une personne).
// Un bouton qui affichait l'état courant (« En vie ») ne disait pas qu'on pouvait le changer (live du 22/11).
import { t } from '../i18n/index.js'

// Née il y a plus de 110 ans : décédée par défaut à l'ajout, et à l'import GEDCOM sans décès noté
// (même seuil côté serveur, backend/src/lib/presumed-deceased.ts)
export const PRESUMED_DECEASED_AGE = 110

export function presumedDeceased(birthDate, now = new Date()) {
  const match = String(birthDate ?? '').match(/^(\d{4})/)
  if (!match) return false
  return now.getFullYear() - Number(match[1]) > PRESUMED_DECEASED_AGE
}

// Naissance ou décès saisi dans l'onglet Vie : les changements de la fiche, sous la forme de l'onglet Infos
// (deathYear, deathDatePrecision, deathPlace, isAlive), pour passer par le même enregistrement. Seuls les champs
// changés partent : une précision « mars 1950 » qu'on n'a pas touchée reste intacte.
// initial et current : { year, day, approx, place } de la fiche « Ajouter un moment »
export function vitalChanges(type, initial, current, personDeceased) {
  const changes = {}
  if (current.year !== initial.year || current.day !== initial.day || current.approx !== initial.approx) {
    const start = current.day || current.year || null
    changes[`${type}Year`] = start
    changes[`${type}DatePrecision`] = start && current.approx && !current.day ? 'about' : null
  }
  const place = current.place.trim()
  if (place !== initial.place) changes[`${type}Place`] = place || null
  if (type === 'death' && !personDeceased) changes.isAlive = false
  return changes
}

// Sexe déjà ramené à 'male', 'female' ou autre
export function deceasedLabel(sex) {
  if (sex === 'male') return t('Décédé')
  if (sex === 'female') return t('Décédée')
  return t('Décédé(e)')
}
