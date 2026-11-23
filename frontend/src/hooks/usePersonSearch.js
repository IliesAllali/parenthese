import { useState, useMemo, useCallback } from 'react'
import { EAST_ASIAN } from '../utils/eastAsian.js'

/**
 * Système de scoring pour la pertinence de recherche
 */
const SCORE_WEIGHTS = {
  // Poids 100 : Ultra pertinent
  NAME_EXACT: 100,
  FIRSTNAME_EXACT: 100,
  LASTNAME_EXACT: 100,

  // Poids 80 : Très pertinent
  NAME_STARTS_WITH: 80,
  NICKNAME_STARTS_WITH: 80,
  FIRSTNAME_STARTS_WITH: 80,
  LASTNAME_STARTS_WITH: 80,
  PROFESSION_EXACT: 80,
  BIRTH_PLACE_EXACT: 80,

  // Poids 50 : Moyennement pertinent
  NAME_CONTAINS: 50,
  PROFESSION_CONTAINS: 50,
  BIRTH_YEAR_MATCH: 50,
  DEATH_YEAR_MATCH: 50,
  REGION_MATCH: 50,
  NICKNAME_CONTAINS: 50,

  // Poids 20 : Peu pertinent
  NOTE_CONTAINS: 20,
}

// Taper « à vérifier » (avec ou sans accents, même en partie) liste les personnes marquées à vérifier
const asksToVerify = (q) => {
  const plain = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ')
  return plain.length >= 5 && 'a verifier'.startsWith(plain)
}

// Assez long pour chercher : deux caractères, ou un seul en chinois, japonais ou coréen, où un caractère est
// déjà un nom (« 陳 », #258)
export function isSearchable(query) {
  const q = String(query ?? '').trim()
  return q.length >= 2 || (q.length === 1 && EAST_ASIAN.test(q))
}

/**
 * Seuil minimum de score pour afficher un résultat
 */
const MIN_SCORE_THRESHOLD = 30

// Texte comparable : sans accents ni majuscules, traits d'union, apostrophes et ponctuation lus comme des espaces.
// « andre » trouve André, « jean pierre » Jean-Pierre, « d'arc » d’Arc (apostrophe typographique d'un téléphone).
export function fold(value) {
  return String(value ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-‐‑–—'’‘ʼ`.,;:/()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Les champs d'une personne, une fois rendus comparables
function fieldsOf(person) {
  const firstName = fold(person.firstName)
  const lastName = fold(person.lastName)
  const birthName = fold(person.birthName)
  return {
    firstName,
    lastName,
    birthName: birthName !== lastName ? birthName : '',
    // Les deux ordres : « andre dupont » et « dupont andre », l'ordre des registres. Un nom d'Asie de l'Est
    // s'écrit aussi d'un seul tenant : « 陳港生 »
    names: [`${firstName} ${lastName}`.trim(), `${lastName} ${firstName}`.trim(), ...(EAST_ASIAN.test(firstName + lastName) ? [`${lastName}${firstName}`] : [])],
    birthNames: birthName && birthName !== lastName ? [`${firstName} ${birthName}`.trim(), `${birthName} ${firstName}`.trim()] : [],
    nickname: fold(person.nickname),
    profession: fold(person.profession),
    birthPlace: fold(person.birthPlace),
    region: fold(person.region),
    note: fold(person.note),
    birthYear: person.birthYear?.toString() || '',
    deathYear: person.deathYear?.toString() || '',
  }
}

const wordsOf = (text) => text.split(' ').filter(Boolean)
// Un mot de la requête commence un mot du champ : « brive » dans « brive la gaillarde »
const startsAWord = (text, q) => text === q || text.startsWith(q) || text.includes(` ${q}`)
// Chaque mot de la requête commence un mot du nom, dans n'importe quel ordre : « martin jean pierre »
const everyWordInName = (f, q) => {
  const nameWords = wordsOf([f.firstName, f.lastName, f.birthName, f.nickname].join(' '))
  const queryWords = wordsOf(q)
  return queryWords.length > 1 && queryWords.every((word) => nameWords.some((name) => name.startsWith(word)))
}

/**
 * Calcule le score de pertinence pour une personne
 * @param {string} query - Requête de recherche
 * @param {Object} person - Objet personne
 * @returns {number} Score de pertinence
 */
function calculateScore(query, person) {
  let score = 0
  const q = fold(query)

  if (!isSearchable(q)) return 0
  if (person.toVerify && asksToVerify(q)) return SCORE_WEIGHTS.NAME_EXACT

  const f = fieldsOf(person)

  // === NOM/PRÉNOM ===
  if (f.names.includes(q)) score += SCORE_WEIGHTS.NAME_EXACT
  if (f.firstName === q) score += SCORE_WEIGHTS.FIRSTNAME_EXACT
  if (f.lastName === q) score += SCORE_WEIGHTS.LASTNAME_EXACT
  if (f.firstName.startsWith(q)) score += SCORE_WEIGHTS.FIRSTNAME_STARTS_WITH
  if (f.lastName.startsWith(q)) score += SCORE_WEIGHTS.LASTNAME_STARTS_WITH
  if (f.names.some((name) => name.startsWith(q))) {
    score += SCORE_WEIGHTS.NAME_STARTS_WITH
  } else if (f.names.some((name) => name.includes(q)) || everyWordInName(f, q)) {
    score += SCORE_WEIGHTS.NAME_CONTAINS
  }

  // === NOM DE NAISSANCE === (une grand-mère née Dupont, mariée Martin)
  if (f.birthName) {
    if (f.birthName === q || f.birthNames.includes(q)) score += SCORE_WEIGHTS.LASTNAME_EXACT
    else if (f.birthName.startsWith(q) || f.birthNames.some((name) => name.startsWith(q))) score += SCORE_WEIGHTS.LASTNAME_STARTS_WITH
  }

  // === PROFESSION ===
  if (f.profession) {
    if (f.profession === q) score += SCORE_WEIGHTS.PROFESSION_EXACT
    else if (f.profession.includes(q)) score += SCORE_WEIGHTS.PROFESSION_CONTAINS
  }

  // === SURNOM ===
  if (f.nickname && f.nickname.includes(q)) {
    score += f.nickname.startsWith(q) ? SCORE_WEIGHTS.NICKNAME_STARTS_WITH : SCORE_WEIGHTS.NICKNAME_CONTAINS
  }

  // === LIEUX ===
  if (f.birthPlace) {
    if (f.birthPlace === q || f.birthPlace.split(' ')[0] === q) score += SCORE_WEIGHTS.BIRTH_PLACE_EXACT
    else if (startsAWord(f.birthPlace, q)) score += SCORE_WEIGHTS.REGION_MATCH
  }
  if (f.region && f.region.includes(q)) score += SCORE_WEIGHTS.REGION_MATCH

  // === DATES ===
  if (f.birthYear && f.birthYear.includes(q)) score += SCORE_WEIGHTS.BIRTH_YEAR_MATCH
  if (f.deathYear && f.deathYear.includes(q)) score += SCORE_WEIGHTS.DEATH_YEAR_MATCH

  // === CONTENU (notes, etc.) ===
  if (f.note && f.note.includes(q)) score += SCORE_WEIGHTS.NOTE_CONTAINS

  return score
}

const matchesName = (f, q) => f.names.some((name) => name.includes(q)) || f.firstName.startsWith(q) || f.lastName.startsWith(q) || everyWordInName(f, q)
const matchesBirthName = (f, q) => Boolean(f.birthName) && (f.birthName.startsWith(q) || f.birthNames.some((name) => name.startsWith(q)))

/**
 * Détermine la raison principale du match (pour affichage badge)
 * @param {string} query
 * @param {Object} person
 * @returns {string} Raison du match
 */
function getMatchReason(query, person) {
  const q = fold(query)
  const f = fieldsOf(person)

  if (person.toVerify && asksToVerify(q)) return 'À vérifier'
  if (matchesName(f, q)) return 'Nom'
  if (matchesBirthName(f, q)) return 'Nom de naissance'
  if (f.nickname.includes(q)) return 'Surnom'
  if (f.profession && f.profession.includes(q)) return 'Profession'
  if (f.birthPlace && startsAWord(f.birthPlace, q)) return 'Lieu'
  if (f.birthYear && f.birthYear.includes(q)) return 'Date'
  return 'Contenu'
}

/**
 * Retourne la valeur précise qui a matché (pour affichage à côté du badge)
 * @param {string} query
 * @param {Object} person
 * @returns {string}
 */
function getMatchDetail(query, person) {
  const q = fold(query)
  if (!q) return ''
  const f = fieldsOf(person)

  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim()
  if (matchesName(f, q)) return fullName
  if (matchesBirthName(f, q)) return String(person.birthName || '').trim()
  if (f.nickname.includes(q)) return person.nickname
  if (f.profession.includes(q)) return person.profession || ''
  if (f.birthPlace && startsAWord(f.birthPlace, q)) return person.birthPlace || ''
  if (f.region.includes(q)) return person.region || ''

  if (f.birthYear.includes(q) || f.deathYear.includes(q)) {
    if (f.birthYear && f.deathYear) return `${f.birthYear}-${f.deathYear}`
    return f.birthYear || f.deathYear
  }

  if (f.note.includes(q)) {
    // L'extrait se prend dans la note telle qu'écrite ; la position vient du texte rendu comparable, à peu près
    const note = String(person.note || '')
    const index = Math.max(0, f.note.indexOf(q))
    const start = Math.max(0, index - 10)
    const end = Math.min(note.length, index + q.length + 18)
    const excerpt = note.slice(start, end).trim()
    return start > 0 ? `...${excerpt}` : excerpt
  }

  return ''
}

/**
 * Hook pour la recherche de personnes avec scoring
 *
 * @param {Array} persons - Liste de toutes les personnes
 * @returns {Object} API de recherche
 */
// revision : le tableau des personnes est modifié sur place (ajout, suppression) ; sa révision relance le calcul
export function usePersonSearch(persons = [], revision = 0) {
  const [query, setQuery] = useState('')
  const [isActive, setIsActive] = useState(false)

  // Calculer les résultats de recherche avec scoring
  const results = useMemo(() => {
    if (!isSearchable(query)) {
      return []
    }

    const scored = persons
      .map(person => ({
        person,
        score: calculateScore(query, person),
        reason: getMatchReason(query, person),
        matchDetail: getMatchDetail(query, person),
      }))
      .filter(item => item.score >= MIN_SCORE_THRESHOLD)
      .sort((a, b) => {
        // Trier par score décroissant, puis alphabétique si égalité
        if (b.score !== a.score) {
          return b.score - a.score
        }
        const nameA = `${a.person.firstName} ${a.person.lastName}`
        const nameB = `${b.person.firstName} ${b.person.lastName}`
        return nameA.localeCompare(nameB)
      })
      .slice(0, 50) // Limiter à 50 résultats max

    return scored
  }, [query, persons, revision]) // eslint-disable-line react-hooks/exhaustive-deps

  // Liste des IDs de personnes matchées (pour highlight galaxie)
  const matchedPersonIds = useMemo(() => {
    return results.map(r => r.person.id)
  }, [results])

  const handleSearch = useCallback((searchQuery) => {
    setQuery(searchQuery)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setIsActive(false)
  }, [])

  const activate = useCallback(() => {
    setIsActive(true)
  }, [])

  const deactivate = useCallback(() => {
    setIsActive(false)
    setQuery('')
  }, [])

  return {
    query,
    results,
    matchedPersonIds,
    isActive,
    hasResults: results.length > 0,
    handleSearch,
    clearSearch,
    activate,
    deactivate,
  }
}

export { calculateScore, getMatchReason, MIN_SCORE_THRESHOLD }
