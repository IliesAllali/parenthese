// M5 : placement récursif par blocs familiaux (Reingold-Tilford adapté aux couples). Pas d'ELK.
// Un bloc = une chaîne de couples (même génération) + les blocs de ses enfants imbriqués en dessous
// (contours par génération), la chaîne centrée au-dessus. Fratries contiguës et parents centrés PAR CONSTRUCTION.
//
// Mariage entre deux familles de l'arbre : la chaîne du couple n'est placée qu'une fois, sous UNE de ses
// deux lignées (règle `owner`). L'autre lignée garde une arête longue vers elle, inévitable.
// Un bloc qui contient un enfant "externe" (placé ailleurs) est ancré : centré sur cet enfant, puis décalé
// au créneau libre le plus proche. Ça couvre beaux-parents, grands-parents de pièces rapportées, etc.
import { baseModel, finalize, chainWidth, chainOffsets, NODE_SPACING, FAMILY_GAP } from '../elk-common.mjs'

// anchor : 'direct' = un bloc racine n'est ancré que si sa PROPRE chaîne a un enfant externe (beaux-parents) ;
//          'any'    = ancré dès qu'un descendant quelconque a un enfant externe (peut tirer une grande lignée)
function run(graphData, { familyGap = FAMILY_GAP, spacing = NODE_SPACING, centerUnions = false, owner = 'first', anchor = 'direct' } = {}) {
  const base = baseModel(graphData)
  const chainOf = new Map()
  const chains = []
  for (const [, comps] of base.chainsPerGen) for (const c of comps) { chains.push(c); for (const id of c) chainOf.set(id, c) }
  const genOf = (chain) => base.byId.get(chain[0])._generation

  const childrenOfUnion = new Map()
  const parentUnionOf = new Map()
  for (const e of base.edges) {
    const u = e.sources[0], c = e.targets[0]
    if (!childrenOfUnion.has(u)) childrenOfUnion.set(u, [])
    childrenOfUnion.get(u).push(c)
    if (!parentUnionOf.has(c)) parentUnionOf.set(c, u)
  }
  const hasParents = (chain) => chain.some(id => parentUnionOf.has(id))

  // Taille de descendance par chaîne
  const descCount = new Map()
  function countDesc(chain, seen = new Set()) {
    if (descCount.has(chain)) return descCount.get(chain)
    if (seen.has(chain)) return 0
    seen.add(chain)
    let n = 0
    for (const id of chain) for (const k of (childrenOfUnion.get(id) || [])) { n += 1 + countDesc(chainOf.get(k), seen) }
    descCount.set(chain, n)
    return n
  }

  // ----------------------------------------------------------
  // Appartenance : quelle union parente "possède" une chaîne qui a plusieurs parents dans l'arbre ?
  //   first           : la première lignée construite la revendique (dynamique)
  //   fewestSiblings  : l'union qui a le moins d'enfants (un enfant unique reste chez ses parents)
  //   largestParent   : l'union dont la chaîne a la plus grande descendance
  // ----------------------------------------------------------
  const ownerOf = new Map()
  if (owner !== 'first') {
    for (const chain of chains) {
      const candidates = [...new Set(chain.map(id => parentUnionOf.get(id)).filter(Boolean))]
      if (candidates.length < 2) { if (candidates.length === 1) ownerOf.set(chain, candidates[0]); continue }
      const score = (u) => owner === 'fewestSiblings'
        ? -(childrenOfUnion.get(u) || []).length
        : countDesc(chainOf.get(u))
      candidates.sort((a, b) => score(b) - score(a) || String(a).localeCompare(String(b)))
      ownerOf.set(chain, candidates[0])
    }
  }
  const owns = (unionId, kidChain) => {
    const o = ownerOf.get(kidChain)
    return o === undefined ? !placed.has(kidChain) : o === unionId
  }

  const pos = new Map()
  const placed = new Set()

  // Contours : Map gen → [left, right] relatifs à l'origine du bloc.
  function packBlocks(blocks, gap) {
    const acc = new Map()
    const xs = []
    for (const b of blocks) {
      let off = 0
      for (const [g, [l]] of b.rows) {
        const a = acc.get(g)
        if (a) off = Math.max(off, a[1] + gap - l)
      }
      xs.push(off)
      for (const [g, [l, r]] of b.rows) {
        const a = acc.get(g)
        acc.set(g, a ? [Math.min(a[0], l + off), Math.max(a[1], r + off)] : [l + off, r + off])
      }
    }
    return { xs, rows: acc }
  }

  // Construit un bloc : { rows, members, external, gen, rel(id), place(x0) }
  function buildBlock(chain) {
    placed.add(chain)
    const gen = genOf(chain)
    const rowW = chainWidth(base, chain, spacing)
    const offsets = chainOffsets(base, chain, spacing)
    const groups = []
    const external = [] // { kid, unionId } enfants placés sous une autre lignée
    for (const id of chain) {
      const n = base.byId.get(id)
      if (n._type !== 'union') continue
      const blocks = []
      for (const k of (childrenOfUnion.get(id) || [])) {
        const kc = chainOf.get(k)
        if (owns(id, kc)) blocks.push(buildBlock(kc))
        else external.push({ kid: k, unionId: id })
      }
      groups.push({ unionId: id, blocks })
    }
    const allBlocks = groups.flatMap(g => g.blocks)
    const packed = packBlocks(allBlocks, familyGap)

    let rowX = 0
    if (allBlocks.length) {
      const kidRowL = Math.min(...allBlocks.map((b, i) => packed.xs[i] + b.rows.get(b.gen)[0]))
      const kidRowR = Math.max(...allBlocks.map((b, i) => packed.xs[i] + b.rows.get(b.gen)[1]))
      let anchorOff = rowW / 2
      let target = (kidRowL + kidRowR) / 2
      if (centerUnions && groups.length > 1) {
        const first = groups.findIndex(g => g.blocks.length)
        if (first >= 0) {
          const g = groups[first]
          const idx = allBlocks.indexOf(g.blocks[0])
          const gl = Math.min(...g.blocks.map((b, j) => packed.xs[idx + j] + b.rows.get(b.gen)[0]))
          const gr = Math.max(...g.blocks.map((b, j) => packed.xs[idx + j] + b.rows.get(b.gen)[1]))
          const u = base.byId.get(g.unionId)
          anchorOff = offsets.get(g.unionId) + u.width / 2
          target = (gl + gr) / 2
        }
      }
      rowX = target - anchorOff
    }

    const rows = new Map()
    rows.set(gen, [rowX, rowX + rowW])
    for (const [g, [l, r]] of packed.rows) {
      const a = rows.get(g)
      rows.set(g, a ? [Math.min(a[0], l), Math.max(a[1], r)] : [l, r])
    }
    const minL = Math.min(...[...rows.values()].map(v => v[0]))
    for (const [g, v] of rows) rows.set(g, [v[0] - minL, v[1] - minL])
    rowX -= minL
    const kidXs = packed.xs.map(x => x - minL)

    const members = new Set(chain)
    for (const b of allBlocks) { for (const m of b.members) members.add(m); external.push(...b.external) }
    // position relative d'un nœud dans le bloc
    const rel = (id) => {
      if (offsets.has(id)) return rowX + offsets.get(id)
      for (let i = 0; i < allBlocks.length; i++) if (allBlocks[i].members.has(id)) return kidXs[i] + allBlocks[i].rel(id)
      return null
    }
    return {
      rows, members, external, gen, rel,
      get width() { return Math.max(...[...rows.values()].map(v => v[1])) },
      place(x0) {
        for (const id of chain) pos.set(id, { x: x0 + rowX + offsets.get(id) })
        allBlocks.forEach((b, i) => b.place(x0 + kidXs[i]))
      },
    }
  }

  // 1) Racines (chaînes sans parents), grandes lignées d'abord
  const roots = chains.filter(c => !hasParents(c)).sort((a, b) => countDesc(b) - countDesc(a) || genOf(a) - genOf(b))
  const free = [], anchored = []
  for (const r of roots) {
    if (placed.has(r)) continue
    const block = buildBlock(r)
    const ownExternal = block.external.filter(({ unionId }) => r.includes(unionId))
    if (anchor === 'any' ? block.external.length : ownExternal.length) anchored.push(block)
    else free.push(block)
  }
  const forest = packBlocks(free, familyGap * 2)
  free.forEach((b, i) => b.place(forest.xs[i]))
  let cursor = Math.max(0, ...[...forest.rows.values()].map(v => v[1])) + familyGap * 2

  // 2) Blocs ancrés : l'union concernée centrée sur son enfant externe, générations profondes d'abord
  const occupied = (exclude) => {
    const byGen = new Map()
    for (const n of base.nodes) {
      const p = pos.get(n.id); if (!p || exclude.has(n.id)) continue
      if (!byGen.has(n._generation)) byGen.set(n._generation, [])
      byGen.get(n._generation).push([p.x, p.x + n.width])
    }
    return byGen
  }
  anchored.sort((a, b) => b.gen - a.gen)
  for (const block of anchored) {
    const occ = occupied(block.members)
    // cible : moyenne, sur les enfants externes déjà placés, de (centre enfant − position relative de son union)
    const targets = block.external
      .filter(({ kid }) => pos.has(kid))
      .map(({ kid, unionId }) => {
        const kn = base.byId.get(kid); const un = base.byId.get(unionId)
        return pos.get(kid).x + kn.width / 2 - (block.rel(unionId) + un.width / 2)
      })
    if (!targets.length) { block.place(cursor); cursor += block.width + familyGap * 2; continue }
    const ideal = targets.reduce((s, v) => s + v, 0) / targets.length
    const fits = (x0) => {
      block.place(x0)
      for (const id of block.members) {
        const n = base.byId.get(id); const p = pos.get(id)
        for (const [s, e] of (occ.get(n._generation) || [])) if (p.x < e + familyGap && p.x + n.width > s - familyGap) return false
      }
      return true
    }
    let found = false
    for (let d = 0; d < 40000 && !found; d += 20) {
      if (fits(ideal + d)) found = true
      else if (d > 0 && fits(ideal - d)) found = true
    }
    if (!found) { block.place(cursor); cursor += block.width + familyGap * 2 }
  }

  return finalize(base, pos)
}

export const variants = [
  { name: 'M5a blocs familiaux, 1re lignée, ancrage direct', layout: (g) => run(g, { owner: 'first', anchor: 'direct' }) },
  { name: 'M5b blocs familiaux, 1re lignée, ancrage profond', layout: (g) => run(g, { owner: 'first', anchor: 'any' }) },
  { name: 'M5c blocs familiaux, moins de fratrie, direct', layout: (g) => run(g, { owner: 'fewestSiblings', anchor: 'direct' }) },
  { name: 'M5d blocs familiaux, plus grande lignée, direct', layout: (g) => run(g, { owner: 'largestParent', anchor: 'direct' }) },
]
