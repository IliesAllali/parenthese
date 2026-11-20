// « C'est vous, Claire ? » (#248) : le prénom tapé à l'accueil, comparé aux personnes vivantes de l'arbre.
// Une seule correspond : l'arbre la propose. Plusieurs : on choisit. Aucune : on ne demande rien.

const normalize = (value) => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
// Premier prénom : « Marie Claire » se compare sur « marie », « Marie-Claire » reste entier
const firstGiven = (value) => normalize(value).split(/\s+/)[0] || ''

export function isLiving(person) {
  return person?.isAlive !== false && !person?.deathYear && !person?.ghost
}

export function findSelfCandidates(persons, typedName) {
  const wanted = firstGiven(typedName)
  if (!wanted) return []
  return (persons || []).filter((person) => isLiving(person) && firstGiven(person.firstName) === wanted)
}

// Réponse donnée une fois par arbre et par navigateur : on ne redemande pas après « Non »
const askedKey = (treeId) => `self_asked_${treeId}`

export function hasAnsweredSelf(treeId) {
  if (!treeId) return true
  try {
    return localStorage.getItem(askedKey(treeId)) === '1'
  } catch {
    return true
  }
}

export function markSelfAnswered(treeId) {
  if (!treeId) return
  try {
    localStorage.setItem(askedKey(treeId), '1')
  } catch {
    // Stockage indisponible : la question reviendra à la prochaine visite
  }
}

// Le texte de chaque bouton quand plusieurs personnes portent le prénom : nom et année, puis, si deux boutons se
// ressemblent encore (deux Claire Martin sans date), les prénoms de leurs parents. parentsOf(person) → personnes.
export function candidateLabels(candidates, parentsOf = () => []) {
  const base = (candidates || []).map((person) => [
    [person.firstName, person.lastName].filter(Boolean).join(' '),
    person.birthYear ? String(person.birthYear) : '',
  ].filter(Boolean).join(' · '))
  return base.map((label, index) => {
    if (base.indexOf(label) === base.lastIndexOf(label)) return label
    const parents = (parentsOf(candidates[index]) || []).map((parent) => parent?.firstName).filter(Boolean)
    return parents.length ? `${label} · ${parents.join(' & ')}` : label
  })
}
