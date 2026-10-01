import { coupleBarMeta } from './elkLayout'
import { t } from '../../i18n/index.js'

// ============================================================
// BFS — chemin le plus court entre deux personnes
// Le graphe est bidirectionnel : person ↔ union (coupleBarMeta)
// et union ↔ enfant (layoutData.edges). Les unions sont des
// noeuds intermédiaires invisibles ; seuls les noeuds personne
// comptent comme "étapes".
// ============================================================
export function findPathBFS(fromElkId, toElkId, layoutData) {
  if (!layoutData || fromElkId === toElkId) return null

  // Construire l'adjacence
  const adj = new Map()
  const ensure = (id) => { if (!adj.has(id)) adj.set(id, []) }

  coupleBarMeta.forEach(({ elkId, p1Key, p2Key }) => {
    ensure(p1Key); ensure(p2Key); ensure(elkId)
    adj.get(p1Key).push({ neighbor: elkId, type: 'couple', id: elkId })
    adj.get(elkId).push({ neighbor: p1Key, type: 'couple', id: elkId })
    adj.get(p2Key).push({ neighbor: elkId, type: 'couple', id: elkId })
    adj.get(elkId).push({ neighbor: p2Key, type: 'couple', id: elkId })
  })

  if (layoutData.edges) {
    layoutData.edges.forEach(edge => {
      const src = edge.sources[0], tgt = edge.targets[0]
      ensure(src); ensure(tgt)
      adj.get(src).push({ neighbor: tgt, type: 'filiation', id: edge.id })
      adj.get(tgt).push({ neighbor: src, type: 'filiation', id: edge.id })
    })
  }

  // BFS
  const visited = new Set([fromElkId])
  const prev = new Map()
  const queue = [fromElkId]

  while (queue.length > 0) {
    const cur = queue.shift()
    if (cur === toElkId) break
    for (const link of (adj.get(cur) || [])) {
      if (!visited.has(link.neighbor)) {
        visited.add(link.neighbor)
        prev.set(link.neighbor, { from: cur, type: link.type, id: link.id })
        queue.push(link.neighbor)
      }
    }
  }

  if (!prev.has(toElkId)) return null

  // Reconstruire le chemin
  const nodePath = []
  const edgePath = []
  let cur = toElkId
  while (cur !== fromElkId) {
    nodePath.unshift(cur)
    const p = prev.get(cur)
    edgePath.unshift({ type: p.type, id: p.id })
    cur = p.from
  }
  nodePath.unshift(fromElkId)

  const label = computeRelationshipLabel(edgePath)
  return { nodePath, edgePath, label }
}

// ============================================================
// Calcul du lien de parenté à partir du chemin BFS
// On analyse la direction à chaque union traversée :
//   filiation→couple = UP (enfant → parent)
//   couple→filiation = DOWN (parent → enfant)
//   filiation→filiation = SIBLING (frères/sœurs, +1 up +1 down)
//   couple→couple = SPOUSE (conjoints)
// Puis (ups, downs) donne le degré de parenté.
// ============================================================
export function computeRelationshipLabel(edgePath) {
  if (edgePath.length < 2) return ''

  let ups = 0, downs = 0, hasSpouse = false

  for (let i = 0; i < edgePath.length; i += 2) {
    if (i + 1 >= edgePath.length) break
    const entering = edgePath[i].type
    const leaving = edgePath[i + 1].type
    if (entering === 'couple' && leaving === 'couple') hasSpouse = true
    else if (entering === 'couple' && leaving === 'filiation') downs++
    else if (entering === 'filiation' && leaving === 'couple') ups++
    else if (entering === 'filiation' && leaving === 'filiation') { ups++; downs++ }
  }

  // Conjoint direct
  if (hasSpouse && ups === 0 && downs === 0) return t('Conjoint(e)')

  // In-laws courants
  if (hasSpouse) {
    if (ups === 1 && downs === 0) return t('Beau-parent')
    if (ups === 0 && downs === 1) return t('Bel-enfant')
    if (ups === 1 && downs === 1) return t('Beau-frère/sœur')
  }

  // Ascendants directs
  let label
  if (downs === 0 && ups > 0) {
    if (ups === 1) label = t('Parent')
    else if (ups === 2) label = t('Grand-parent')
    else if (ups === 3) label = t('Arrière-grand-parent')
    else label = t('Aïeul(e) {n}e gén.', { n: ups })
  }
  // Descendants directs
  else if (ups === 0 && downs > 0) {
    if (downs === 1) label = t('Enfant')
    else if (downs === 2) label = t('Petit-enfant')
    else if (downs === 3) label = t('Arrière-petit-enfant')
    else label = t('Descendant(e) {n}e gén.', { n: downs })
  }
  // Fratrie
  else if (ups === 1 && downs === 1) { label = t('Frère/Sœur') }
  // Oncle / Tante
  else if (ups === 2 && downs === 1) { label = t('Oncle/Tante') }
  else if (ups === 3 && downs === 1) { label = t('Grand-oncle/tante') }
  // Neveu / Nièce
  else if (ups === 1 && downs === 2) { label = t('Neveu/Nièce') }
  else if (ups === 1 && downs === 3) { label = t('Petit-neveu/nièce') }
  // Cousins
  else if (ups >= 2 && downs >= 2) {
    const degree = Math.min(ups, downs) - 1
    const removed = Math.abs(ups - downs)
    if (degree === 1 && removed === 0) label = t('Cousin(e) germain(e)')
    else if (degree === 1) label = t('Petit-cousin(e)')
    else if (removed === 0) label = t('Cousin(e) {n}e degré', { n: degree })
    else label = t('Cousin(e) éloigné(e)')
  }
  else { label = t('{n} liens', { n: ups + downs }) }

  if (hasSpouse && label) label = t('{label} par alliance', { label })
  return label
}
