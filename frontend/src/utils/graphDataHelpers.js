/**
 * Fonctions helper pour manipuler les données du graphe
 * Ces fonctions acceptent les données en paramètre au lieu d'utiliser les imports statiques
 */

/**
 * Récupère les médias d'une personne
 * @param {string} personId
 * @param {Array} medias - Liste des médias
 * @returns {Array}
 */
export function getPersonMedias(personId, medias = []) {
  return medias
    .filter((media) => media.personId === personId)
    .sort((a, b) => {
      const orderDiff = (a.displayOrder || 0) - (b.displayOrder || 0)
      if (orderDiff !== 0) return orderDiff
      return (a.id || '').localeCompare(b.id || '')
    })
    .slice(0, 8) // Max 8 médias
}

/**
 * Récupère les parents d'une personne
 * @param {string} personId
 * @param {Array} persons
 * @param {Array} unions
 * @param {Array} filiations
 * @returns {Array}
 */
export function getParents(personId, persons = [], unions = [], filiations = []) {
  const fil = filiations.filter((filiation) => filiation.childId === personId)
  const result = []

  fil.forEach((f) => {
    if (f.unionId) {
      const union = unions.find((u) => u.id === f.unionId)
      if (union) {
        const p1 = persons.find((p) => p.id === union.partner1Id)
        const p2 = persons.find((p) => p.id === union.partner2Id)
        if (p1) result.push(p1)
        if (p2) result.push(p2)
      }
    } else if (f.parentId) {
      const parent = persons.find((p) => p.id === f.parentId)
      if (parent) result.push(parent)
    }
  })

  // Dédupliquer
  const seen = new Set()
  return result.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

/**
 * Récupère les enfants d'une personne
 * @param {string} personId
 * @param {Array} persons
 * @param {Array} unions
 * @param {Array} filiations
 * @returns {Array}
 */
export function getChildren(personId, persons = [], unions = [], filiations = []) {
  const childIds = new Set()

  // Via unions
  const personUnions = unions.filter((union) => union.partner1Id === personId || union.partner2Id === personId)
  personUnions.forEach((union) => {
    const childrenOfUnion = filiations.filter((fil) => fil.unionId === union.id)
    childrenOfUnion.forEach((fil) => childIds.add(fil.childId))
  })

  // Via parentId direct
  const directChildren = filiations.filter((fil) => fil.parentId === personId)
  directChildren.forEach((fil) => childIds.add(fil.childId))

  return persons.filter((p) => childIds.has(p.id))
}

/**
 * Récupère les unions d'une personne
 * @param {string} personId
 * @param {Array} unions
 * @returns {Array}
 */
export function getPersonUnions(personId, unions = []) {
  return unions
    .filter((union) => union.partner1Id === personId || union.partner2Id === personId)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
}

/**
 * Récupère la filiation d'une personne (comment elle est reliée à ses parents)
 * @param {string} personId
 * @param {Array} filiations
 * @returns {Object | null}
 */
export function getChildFiliation(personId, filiations = []) {
  const childFiliations = filiations
    .filter((f) => f.childId === personId)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

  if (childFiliations.length === 0) {
    return null
  }

  const viaUnion = childFiliations.find((f) => Boolean(f.unionId))
  if (viaUnion) {
    return viaUnion
  }

  return childFiliations.find((f) => (f.parentageType || 'biologique') === 'biologique') || childFiliations[0]
}
