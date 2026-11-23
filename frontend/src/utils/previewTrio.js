// Aperçu des réglages d'affichage (Paramètres de l'arbre) : un couple et leur enfant pris dans l'arbre de la
// famille, ceux qui ont le plus de photos. Sans couple qui a un enfant, un couple et un enfant d'exemple, sans photo.

export const EXAMPLE_TRIO = {
  left: { id: 'exemple-a', firstName: 'Paul', lastName: 'Durand', birthYear: 1948, deathYear: 2019, isAlive: false, frameType: 'polaroid' },
  right: { id: 'exemple-b', firstName: 'Jeanne', lastName: 'Martin', birthYear: 1950, isAlive: true, frameType: 'round' },
  child: { id: 'exemple-c', firstName: 'Léa', lastName: 'Durand', birthYear: 1980, isAlive: true, frameType: 'rect' },
  example: true,
}

// Une personne proposée ou une case à remplir n'est pas encore dans l'arbre
const shown = (person) => Boolean(person) && !person.ghost && !person.slot
const photos = (...people) => people.filter((person) => person.photo).length

export function pickPreviewTrio({ persons = [], unions = [], filiations = [] } = {}) {
  const byId = new Map(persons.filter(shown).map((person) => [String(person.id), person]))
  const childrenOf = new Map()
  for (const filiation of filiations) {
    if (!filiation.unionId) continue
    const child = byId.get(String(filiation.childId))
    if (!child) continue
    const key = String(filiation.unionId)
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key).push(child)
  }

  let best = null
  for (const union of unions) {
    const left = byId.get(String(union.partner1Id))
    const right = byId.get(String(union.partner2Id))
    const children = childrenOf.get(String(union.id))
    if (!left || !right || !children?.length) continue
    // L'enfant avec une photo d'abord ; à égalité, le premier de la fratrie
    const child = children.find((person) => person.photo) || children[0]
    const score = photos(left, right, child)
    if (!best || score > best.score) best = { left, right, child, score }
    if (score === 3) break
  }
  return best ? { left: best.left, right: best.right, child: best.child, example: false } : EXAMPLE_TRIO
}

// Onglets de l'aperçu : la famille de l'enfant, puis celle du parent qui porte un autre nom (la belle-famille)
export function previewFamilies({ left, right, child }) {
  const family = child.lastName || left.lastName || right.lastName || ''
  const other = [left, right].map((person) => person.birthName || person.lastName || '').find((name) => name && name !== family) || ''
  return [family, other]
}
