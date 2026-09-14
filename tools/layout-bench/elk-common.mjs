// Socle commun des modèles ELK : on réutilise du code du repo ce qui n'est pas en cause
// (normalisation des filiations, assignation des générations, chaînes de couples par génération)
// et on ne confie à ELK que ce qui est en cause : l'ordre et le placement X.
import ELK from 'elkjs/lib/elk.bundled.js'
import { layoutModule, constants } from './load.mjs'

export const elk = new ELK()
export const { PERSON_W, PERSON_H, UNION_W, UNKNOWN_W } = constants
export const NODE_SPACING = 30
export const FAMILY_GAP = 60
export const LAYER_GAP = 60

// Modèle de base issu du code repo : nœuds typés (+ génération), arêtes de filiation, couples, chaînes
export function baseModel(graphData) {
  const result = layoutModule.computeLayout(graphData)
  const nodes = result.children.map(n => ({ ...n }))
  const chainsPerGen = new Map([...layoutModule.componentOrderPerGen].map(([g, comps]) => [g, comps.map(c => [...c])]))
  return {
    nodes,
    byId: new Map(nodes.map(n => [n.id, n])),
    edges: result.edges.map(e => ({ ...e })),
    coupleBarMeta: layoutModule.coupleBarMeta.map(c => ({ ...c })),
    chainsPerGen,
  }
}

// Réinjecte les positions calculées (map id → {x,y}) dans une copie des nœuds, Y forcé par génération
export function finalize(base, posById) {
  const children = base.nodes.map(n => {
    const p = posById.get(n.id)
    return { ...n, x: p ? p.x : 0, y: n._generation * (PERSON_H + LAYER_GAP) }
  })
  let minX = Math.min(...children.map(n => n.x))
  for (const n of children) n.x -= minX
  return { result: { children, edges: base.edges }, coupleBarMeta: base.coupleBarMeta }
}

export function chainWidth(base, ids, spacing = NODE_SPACING) {
  const ns = ids.map(id => base.byId.get(id))
  return ns.reduce((s, n) => s + n.width, 0) + Math.max(0, ns.length - 1) * spacing
}

// Offsets X de chaque membre d'une chaîne, dans l'ordre de la chaîne
export function chainOffsets(base, ids, spacing = NODE_SPACING) {
  const offsets = new Map()
  let x = 0
  for (const id of ids) {
    const n = base.byId.get(id)
    offsets.set(id, x)
    x += n.width + spacing
  }
  return offsets
}
