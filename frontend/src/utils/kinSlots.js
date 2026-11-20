// Cases à remplir (#245) : les parents et les grands-parents qui manquent autour de soi, dessinés en pointillés
// gris avec un « ? ». Toucher une case ouvre le formulaire court de ce proche. On s'arrête aux grands-parents :
// les parents de soi, puis les parents de chaque parent déjà saisi.
// Les cases passent par le même chemin que les fantômes (utils/ghosts.js) : elles ne s'ajoutent qu'au placement
// et au dessin, jamais aux données de l'arbre.

const SLOT_GHOST = { source: 'slot', key: 'slot' }

function parentIdsOf(childId, unions, filiations) {
  const unionById = new Map(unions.map((u) => [String(u.id), u]))
  const ids = []
  const add = (id) => { if (id != null && !ids.includes(String(id))) ids.push(String(id)) }
  for (const f of filiations) {
    if (String(f.childId) !== String(childId)) continue
    if (f.unionId) {
      const u = unionById.get(String(f.unionId))
      if (u) { add(u.partner1Id); add(u.partner2Id) }
    } else {
      add(f.parentId)
    }
  }
  return ids
}

// Le rôle qui manque à côté d'un parent connu : son sexe le dit, sinon on ne sait pas lequel des deux
function missingRole(knownParent) {
  if (knownParent?.sex === 'male') return 'mother'
  if (knownParent?.sex === 'female') return 'father'
  return 'parent'
}

/**
 * @param {{ selfId, persons, unions, filiations }} graph - l'arbre, et la personne de départ (soi)
 * @returns même forme que ghostsFromChanges : { persons, unions, filiations, annotations, patches }
 */
export function kinSlots({ selfId, persons = [], unions = [], filiations = [] } = {}) {
  const out = { persons: [], unions: [], filiations: [], annotations: [], patches: new Map() }
  if (selfId == null) return out
  const personById = new Map(persons.map((p) => [String(p.id), p]))
  const self = personById.get(String(selfId))
  if (!self) return out

  const slotPerson = (childId, role, generation) => ({
    id: `ghost:slot:${childId}:${role}`,
    firstName: '',
    lastName: '',
    sex: role === 'father' ? 'male' : role === 'mother' ? 'female' : null,
    isAlive: true,
    photo: null,
    frameType: 'square',
    slot: { childId: String(childId), role, generation },
    ghost: SLOT_GHOST,
  })

  const addSlotsFor = (childId, generation) => {
    const parents = parentIdsOf(childId, unions, filiations).filter((id) => personById.has(id))
    if (parents.length >= 2) return parents
    if (parents.length === 0) {
      const father = slotPerson(childId, 'father', generation)
      const mother = slotPerson(childId, 'mother', generation)
      const unionId = `ghost:slot:${childId}:u`
      out.persons.push(father, mother)
      out.unions.push({ id: unionId, partner1Id: father.id, partner2Id: mother.id, unionType: 'mariage', displayOrder: 9999, ghost: SLOT_GHOST })
      out.filiations.push({ id: `ghost:slot:${childId}:f`, childId: String(childId), parentId: null, unionId, parentageType: 'biologique', displayOrder: 9999, ghost: SLOT_GHOST })
      return parents
    }
    // Un seul parent connu : la case prend la place du « Inconnu » que le placement dessinait à côté de lui
    const known = personById.get(parents[0])
    const slot = slotPerson(childId, missingRole(known), generation)
    out.persons.push(slot)
    out.unions.push({ id: `ghost:slot:${childId}:u`, partner1Id: known.id, partner2Id: slot.id, unionType: 'mariage', displayOrder: 9999, ghost: SLOT_GHOST })
    out.filiations.push({ id: `ghost:slot:${childId}:f`, childId: String(childId), parentId: slot.id, unionId: null, parentageType: 'biologique', displayOrder: 9999, ghost: SLOT_GHOST })
    return parents
  }

  const parents = addSlotsFor(self.id, 1)
  for (const parentId of parents) addSlotsFor(parentId, 2)
  return out
}

export function isSlotId(id) {
  return typeof id === 'string' && id.startsWith('ghost:slot:')
}
