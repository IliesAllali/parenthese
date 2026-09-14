// Usage : node --import ./register.mjs run.mjs [filtre ...]   (sans arg = tous les modèles)
import { readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { loadFixture } from './load.mjs'
import { computeMetrics } from './metrics.mjs'
import { renderSvg } from './svg.mjs'
import { svgToPng } from './png.mjs'

const graphData = await loadFixture()
const wanted = process.argv.slice(2)
const files = readdirSync(new URL('./models/', import.meta.url)).filter(f => f.endsWith('.mjs')).sort()

const rows = []
for (const f of files) {
  const mod = await import(new URL(`./models/${f}`, import.meta.url))
  const variants = mod.variants || [{ name: mod.name, layout: mod.layout }]
  for (const v of variants) {
    if (wanted.length && !wanted.some(w => v.name.toLowerCase().includes(w.toLowerCase()) || f.includes(w))) continue
    let best = Infinity, out
    try {
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now()
        out = await v.layout(graphData)
        best = Math.min(best, performance.now() - t0)
      }
    } catch (err) {
      rows.push({ model: v.name, error: String(err.message || err).slice(0, 80) })
      continue
    }
    const m = computeMetrics(out.result, out.coupleBarMeta, best)
    rows.push({ model: v.name, ...m })
    const slug = v.name.split(' ')[0].toLowerCase()
    const svgFile = fileURLToPath(new URL(`./out/${slug}.svg`, import.meta.url))
    renderSvg(out.result, out.coupleBarMeta, svgFile, v.name)
    writeFileSync(svgFile.replace('.svg', '.json'), JSON.stringify(out.result.children.map(n => ({ id: n.id, x: n.x, y: n.y, w: n.width, h: n.height, t: n._type, g: n._generation, name: n._data?.firstName }))))
    svgToPng(svgFile, svgFile.replace('.svg', '.png'), { width: 2400 })
  }
}
console.table(rows)
writeFileSync(new URL('./out/metrics.json', import.meta.url), JSON.stringify(rows, null, 2))
