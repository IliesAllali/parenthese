// M3 : chaînes de couples = nœuds composés (hiérarchie ELK, INCLUDE_CHILDREN).
// Les personnes/unions restent de vrais nœuds ELK à l'intérieur d'un conteneur par chaîne, sans arêtes
// internes (tous au même layer → côte à côte). Les filiations relient les nœuds internes à travers la
// hiérarchie. Test : ELK garde-t-il les couples ensemble quand il voit les membres ?
import { elk, baseModel, finalize, NODE_SPACING, FAMILY_GAP, LAYER_GAP } from '../elk-common.mjs'

function build(base, extra) {
  const children = []
  const sortedGens = [...base.chainsPerGen.keys()].sort((a, b) => a - b)
  for (const g of sortedGens) {
    base.chainsPerGen.get(g).forEach((chain, i) => {
      children.push({
        id: `c-${g}-${i}`,
        layoutOptions: {
          'elk.partitioning.partition': String(g),
          'elk.padding': '[top=0,left=0,bottom=0,right=0]',
          'elk.spacing.nodeNode': String(NODE_SPACING),
        },
        children: chain.map(id => {
          const n = base.byId.get(id)
          return { id, width: n.width, height: n.height }
        }),
      })
    })
  }
  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.partitioning.activate': 'true',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_GAP),
      'elk.spacing.nodeNode': String(FAMILY_GAP),
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
  const pos = new Map()
  for (const c of out.children) for (const m of c.children) pos.set(m.id, { x: c.x + m.x, y: c.y + m.y })
  return finalize(base, pos)
}

export const variants = [
  { name: 'M3a composés INCLUDE_CHILDREN, défauts', layout: (g) => run(g, {}) },
  {
    name: 'M3b composés, ordre modèle forcé',
    layout: (g) => run(g, { 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES', 'elk.layered.crossingMinimization.forceNodeModelOrder': 'true' }),
  },
]
