// M1 : ELK "naïf".
// Nœuds plats (personne, union, inconnu) partitionnés par génération, aucune arête de couple,
// ordre du modèle = chaînes calculées côté repo. Deux variantes : options minimales (crossing NONE,
// placement SIMPLE) et options par défaut d'ELK (LAYER_SWEEP + BRANDES_KOEPF) pour voir ce qu'ELK
// fait des couples quand on le laisse libre.
import { elk, baseModel, finalize, NODE_SPACING, LAYER_GAP } from '../elk-common.mjs'

function build(base, extra) {
  const children = []
  const sortedGens = [...base.chainsPerGen.keys()].sort((a, b) => a - b)
  for (const g of sortedGens) {
    for (const chain of base.chainsPerGen.get(g)) {
      for (const id of chain) {
        const n = base.byId.get(id)
        children.push({ id, width: n.width, height: n.height, layoutOptions: { 'elk.partitioning.partition': String(g) } })
      }
    }
  }
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.partitioning.activate': 'true',
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
  {
    name: 'M1a ELK naïf (NONE + SIMPLE)',
    layout: (g) => run(g, {
      'elk.layered.crossingMinimization.strategy': 'NONE',
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    }),
  },
  {
    name: 'M1b ELK naïf (défauts : LAYER_SWEEP + BK)',
    layout: (g) => run(g, {
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    }),
  },
]
