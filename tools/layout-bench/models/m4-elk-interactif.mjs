// M4 : ELK en mode interactif, amorcé par le layout actuel.
// Nœuds plats avec x,y issus du Sugiyama custom ; ELK garde l'ORDRE (crossing minimization INTERACTIVE)
// et ne refait que le placement X. Test : "notre ordre + le placement d'ELK" bat-il "notre ordre + notre placement" ?
import { elk, baseModel, finalize, NODE_SPACING, LAYER_GAP } from '../elk-common.mjs'

function build(base, extra) {
  const children = base.nodes.map(n => ({
    id: n.id, width: n.width, height: n.height, x: n.x, y: n.y,
    layoutOptions: { 'elk.partitioning.partition': String(n._generation) },
  }))
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.interactive': 'true',
      'elk.partitioning.activate': 'true',
      'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
      'elk.layered.cycleBreaking.strategy': 'INTERACTIVE',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_GAP),
      'elk.spacing.nodeNode': String(NODE_SPACING),
      'elk.separateConnectedComponents': 'false',
      'elk.edgeRouting': 'POLYLINE',
      ...extra,
    },
    children,
    edges: base.edges.map(e => ({ id: e.id, sources: e.sources, targets: e.targets })),
  }
}

async function run(graphData, extra) {
  const base = baseModel(graphData)
  const out = await elk.layout(build(base, extra))
  const pos = new Map(out.children.map(c => [c.id, { x: c.x, y: c.y }]))
  return finalize(base, pos)
}

export const variants = [
  { name: 'M4a interactif + BRANDES_KOEPF', layout: (g) => run(g, { 'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF' }) },
  { name: 'M4b interactif + NETWORK_SIMPLEX', layout: (g) => run(g, { 'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX' }) },
]
