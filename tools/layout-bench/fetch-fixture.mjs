// Récupère un arbre par le chemin visiteur (slug → unlock → graph) et l'enregistre comme fixture.
// Usage : TREE_PASSWORD='...' node fetch-fixture.mjs <slug> [nomFixture]
import { writeFileSync } from 'node:fs'

const BASE = process.env.PARENTHESE_BASE || 'https://app.parenthese.io'
const [slug, fixtureName = 'famille'] = process.argv.slice(2)
const PASSWORD = process.env.TREE_PASSWORD
if (!slug || !PASSWORD) { console.error("Usage : TREE_PASSWORD='...' node fetch-fixture.mjs <slug> [nomFixture]"); process.exit(1) }

async function j(path, opts = {}) {
  const r = await fetch(BASE + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } })
  const text = await r.text()
  let body; try { body = JSON.parse(text) } catch { body = text }
  if (!r.ok) throw new Error(`${r.status} ${path} ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`)
  return body
}

const resolved = await j(`/api/arbre/${encodeURIComponent(slug)}`)
const treeId = resolved.tree.id
const unlock = await j(`/trees/${treeId}/access/unlock`, { method: 'POST', body: JSON.stringify({ password: PASSWORD }) })
const token = unlock.token || unlock.accessToken
const g = await j(`/trees/${treeId}/graph?t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` } })
const graph = g.graph
console.log(resolved.tree.name, '·', graph.persons.length, 'personnes,', graph.unions.length, 'unions,', graph.filiations.length, 'filiations,', graph.medias.length, 'médias')
writeFileSync(new URL(`./fixtures/${fixtureName}-graph.json`, import.meta.url), JSON.stringify({ treeId, rootPersonId: g.rootPersonId, graph }, null, 1))
