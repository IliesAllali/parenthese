// « Paul, Marie, Jean » dans le champ Prénom d'un enfant ou d'un frère : une personne par prénom.
// Sans virgule, ou pour un parent ou un conjoint, le champ reste un seul prénom.
const MAX_NAMES = 20

export function splitFirstNames(value, relations = []) {
  const text = String(value || '')
  if (!text.includes(',')) return [text]
  if (!relations.some((rel) => rel.type === 'child' || rel.type === 'sibling')) return [text]
  const names = []
  for (const part of text.split(',')) {
    const name = part.trim()
    if (name && !names.includes(name)) names.push(name)
  }
  return names.length > 1 ? names.slice(0, MAX_NAMES) : [names[0] || text]
}

// « Paul, Marie et Jean »
export function joinFirstNames(names, and) {
  if (names.length < 2) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`
}
