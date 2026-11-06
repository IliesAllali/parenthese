// Onglets de familles par nom (Patch, 06/11 : « si un gonz a un nom de famille il fait partie de la famille au
// même nom », puis « tout ce système faut le revisualiser de 0 et le simplifier, c'est un peu trop aléatoire »).
//
// Un onglet = les porteurs d'un même nom reliés entre eux par la filiation, dès qu'ils sont au moins `minCount`.
// Le nom est le nom de naissance s'il est connu, sinon le nom d'usage : une femme mariée reste dans la famille où
// elle est née. Deux branches homonymes sans lien font deux onglets distincts (prénom de leur ancêtre en plus).
// Dans un onglet : les porteurs et leurs conjoints ; en plus clair (`faded`), les parents et les enfants d'un
// porteur qui ne portent pas le nom (une mère d'une autre famille, les enfants d'une fille mariée).
// Le premier onglet est l'arbre entier. Rien ne dépend du placement : la liste se lit dans les noms.
import { persons as globalPersons, unions as globalUnions, filiations as globalFiliations } from '../../data/mockData'

const nameKey = (p) => (p?.birthName || p?.lastName || '').trim().toLocaleLowerCase('fr')
const birthYear = (p) => { const y = parseInt(String(p?.birthDate || '').slice(0, 4), 10); return Number.isFinite(y) ? y : Infinity }

export function nameTabsOf(graphData = null, minCount = 8) {
  const persons = graphData?.persons || globalPersons
  const unions = graphData?.unions || globalUnions
  const filiations = graphData?.filiations || globalFiliations
  const byId = new Map(persons.map((p) => [String(p.id), p]))
  const unionById = new Map(unions.map((u) => [String(u.id), u]))
  const add = (map, k, v) => { if (!map.has(k)) map.set(k, new Set()); map.get(k).add(v) }
  const partnersOf = new Map(), parentsOf = new Map(), childrenOf = new Map()
  for (const u of unions) { const a = String(u.partner1Id), b = String(u.partner2Id); add(partnersOf, a, b); add(partnersOf, b, a) }
  for (const f of filiations) {
    const child = String(f.childId)
    const u = f.unionId ? unionById.get(String(f.unionId)) : null
    const parents = u ? [String(u.partner1Id), String(u.partner2Id)] : f.parentId != null ? [String(f.parentId)] : []
    for (const p of parents) { add(parentsOf, child, p); add(childrenOf, p, child) }
  }

  // Branches : un porteur rejoint son parent au même nom, et ses frères et sœurs au même nom (l'ancêtre porteur
  // peut manquer à l'arbre)
  const up = new Map()
  const find = (x) => { while (up.get(x) !== x) { up.set(x, up.get(up.get(x))); x = up.get(x) } return x }
  const join = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) up.set(ra, rb) }
  const key = new Map()
  for (const [id, p] of byId) { const k = nameKey(p); if (k) { key.set(id, k); up.set(id, id) } }
  for (const [id, k] of key) {
    for (const p of parentsOf.get(id) || []) {
      if (key.get(p) === k) join(id, p)
      for (const s of childrenOf.get(p) || []) if (s !== id && key.get(s) === k) join(id, s)
    }
  }
  const groups = new Map()
  for (const id of key.keys()) add(groups, find(id), id)

  const tabs = []
  for (const bearers of groups.values()) {
    if (bearers.size < minCount) continue
    const members = new Set(bearers)
    for (const b of bearers) for (const p of partnersOf.get(b) || []) members.add(p)
    const faded = new Set()
    for (const b of bearers) {
      for (const p of parentsOf.get(b) || []) if (!members.has(p)) faded.add(p)
      for (const c of childrenOf.get(b) || []) if (!members.has(c)) faded.add(c)
    }
    // Ancêtre de la branche : le porteur sans parent porteur le plus ancien ; il ouvre l'onglet et le nomme
    const roots = [...bearers].filter((b) => ![...(parentsOf.get(b) || [])].some((p) => bearers.has(p)))
    const root = roots.sort((a, b) => birthYear(byId.get(a)) - birthYear(byId.get(b)))[0]
    // Graphie la plus portée (« Martin » plutôt que « MARTIN »)
    const spell = new Map()
    for (const b of bearers) { const p = byId.get(b); const s = (p.birthName || p.lastName).trim(); spell.set(s, (spell.get(s) || 0) + 1) }
    const label = [...spell].sort((x, y) => y[1] - x[1])[0][0]
    tabs.push({ key: root, referenceId: root, personIds: members, faded, label, count: members.size, nameKey: key.get(root) })
  }
  tabs.sort((a, b) => b.count - a.count)
  // Homonymes : chaque branche sauf la plus grande prend le prénom de son ancêtre
  const seen = new Set()
  for (const tb of tabs) {
    if (seen.has(tb.nameKey)) { const first = byId.get(tb.referenceId)?.firstName; if (first) tb.label = `${tb.label} · ${first}` }
    seen.add(tb.nameKey)
  }
  return [{ key: 'all', referenceId: null, personIds: null, all: true, label: '', count: persons.length }, ...tabs]
}
