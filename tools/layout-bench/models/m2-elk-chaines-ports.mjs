// M2 : chaînes de couples = un seul nœud ELK, ports à position fixe.
// Une chaîne (A - u1 - B - u2 - C, même génération) devient un nœud large ; chaque union est un port
// SUD (sortie vers les enfants), chaque personne un port NORD (entrée depuis ses parents).
// ELK ne peut donc jamais séparer un couple : il ne voit que des blocs. Il fait ce qu'il sait faire :
// minimiser les croisements entre blocs et placer les blocs (Brandes-Köpf / network simplex).
import { elk, baseModel, finalize, chainWidth, chainOffsets, NODE_SPACING, FAMILY_GAP, LAYER_GAP, PERSON_H } from '../elk-common.mjs'

function build(base, extra, spacing = NODE_SPACING) {
  const children = []
  const portOwner = new Map() // nodeId → { chainId, offset }
  const sortedGens = [...base.chainsPerGen.keys()].sort((a, b) => a - b)
  for (const g of sortedGens) {
    base.chainsPerGen.get(g).forEach((chain, i) => {
      const chainId = `c-${g}-${i}`
      const offsets = chainOffsets(base, chain, spacing)
      const ports = []
      for (const id of chain) {
        const n = base.byId.get(id)
        const off = offsets.get(id)
        portOwner.set(id, { chainId, offset: off })
        if (n._type === 'union') {
          ports.push({ id: `${id}:out`, width: 1, height: 1, x: off + n.width / 2, y: PERSON_H, layoutOptions: { 'elk.port.side': 'SOUTH' } })
        } else {
          ports.push({ id: `${id}:in`, width: 1, height: 1, x: off + n.width / 2, y: 0, layoutOptions: { 'elk.port.side': 'NORTH' } })
        }
      }
      children.push({
        id: chainId, width: chainWidth(base, chain, spacing), height: PERSON_H, ports,
        layoutOptions: { 'elk.partitioning.partition': String(g), 'elk.portConstraints': 'FIXED_POS' },
        _chain: chain, _offsets: offsets,
      })
    })
  }
  const edges = base.edges.map(e => ({ id: e.id, sources: [`${e.sources[0]}:out`], targets: [`${e.targets[0]}:in`] }))
  return {
    graph: {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.partitioning.activate': 'true',
        'elk.layered.spacing.nodeNodeBetweenLayers': String(LAYER_GAP),
        'elk.spacing.nodeNode': String(FAMILY_GAP),
        'elk.separateConnectedComponents': 'false',
        'elk.edgeRouting': 'POLYLINE',
        'elk.layered.thoroughness': '10',
        ...extra,
      },
      children,
      edges,
    },
    portOwner,
  }
}

async function run(graphData, extra, spacing) {
  const base = baseModel(graphData)
  const { graph } = build(base, extra, spacing)
  const out = await elk.layout(graph)
  const pos = new Map()
  for (const c of out.children) {
    const src = graph.children.find(n => n.id === c.id)
    for (const id of src._chain) pos.set(id, { x: c.x + src._offsets.get(id), y: c.y })
  }
  return finalize(base, pos)
}

export const variants = [
  { name: 'M2a chaînes+ports, BRANDES_KOEPF', layout: (g) => run(g, { 'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF' }) },
  { name: 'M2b chaînes+ports, NETWORK_SIMPLEX', layout: (g) => run(g, { 'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX' }) },
  { name: 'M2c chaînes+ports, LINEAR_SEGMENTS', layout: (g) => run(g, { 'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS' }) },
  {
    name: 'M2d chaînes+ports, BK + ordre modèle',
    layout: (g) => run(g, { 'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF', 'elk.layered.considerModelOrder.strategy': 'PREFER_NODES' }),
  },
]
