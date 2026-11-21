// « Pour qui ? » (#245) : les personnes de l'arbre, des plus proches de soi aux plus lointaines, chacune avec son
// lien (« Père », « Cousine germaine »). Parcours en largeur : parents, frères et sœurs, conjoints, enfants.
import { nameKinship, normalizeSex } from './kinship/index.js'

// Au-delà, le lien n'est plus nommé : la liste reste rapide sur un gros arbre
const NAMED_MAX = 400

const facts = (p) => ({ id: p.id, sex: normalizeSex(p.sex), birthYear: p.birthYear ?? null })

/**
 * @param {Object} graph - { persons, getParents(id), getChildren(id), getPartners(id) } : des personnes
 * @param {string} selfId - soi ; sans soi, l'ordre de l'arbre
 * @returns {Array<{ person, label, self }>} soi d'abord, puis par proximité ; les personnes non reliées à la fin
 */
export function kinPeople({ persons = [], getParents, getChildren, getPartners }, selfId) {
  const self = persons.find((p) => String(p.id) === String(selfId))
  if (!self) return persons.map((person) => ({ person, label: '', self: false }))

  const seen = new Set([String(self.id)])
  const out = [{ person: self, label: '', self: true }]
  const queue = [{ person: self, steps: [] }]
  while (queue.length) {
    const { person, steps } = queue.shift()
    const parents = getParents(person.id)
    const siblings = []
    for (const parent of parents) for (const child of getChildren(parent.id)) if (String(child.id) !== String(person.id)) siblings.push(child)
    const next = [
      ...parents.map((p) => ['up', p]),
      ...siblings.map((p) => ['sibling', p]),
      ...getPartners(person.id).map((p) => ['spouse', p]),
      ...getChildren(person.id).map((p) => ['down', p]),
    ]
    for (const [move, other] of next) {
      if (!other || seen.has(String(other.id))) continue
      seen.add(String(other.id))
      const path = [...steps, { move, person: facts(other) }]
      const label = out.length <= NAMED_MAX ? nameKinship({ from: facts(self), steps: path }) : ''
      out.push({ person: other, label, self: false })
      queue.push({ person: other, steps: path })
    }
  }
  for (const person of persons) if (!seen.has(String(person.id))) out.push({ person, label: '', self: false })
  return out
}
