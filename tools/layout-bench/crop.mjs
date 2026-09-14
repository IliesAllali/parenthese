// Usage : node crop.mjs <slug> <personId|prénom> [w=2400] [h=1000] [scale=1]
// Recadre le SVG d'un modèle autour d'une personne, à l'échelle 1 (ou scale), pour comparer localement.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { svgCropToPng } from './png.mjs'

const [slug, who, w = 2400, h = 1000, scale = 1] = process.argv.slice(2)
const nodes = JSON.parse(readFileSync(new URL(`./out/${slug}.json`, import.meta.url), 'utf8'))
const target = nodes.find(n => n.t === 'person' && (String(n.id) === `p-${who}` || String(n.id) === who || n.name === who))
if (!target) { console.error('introuvable', who); process.exit(1) }
const cx = target.x + target.w / 2, cy = target.y + target.h / 2
const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2)
const svgFile = fileURLToPath(new URL(`./out/${slug}.svg`, import.meta.url))
const outFile = fileURLToPath(new URL(`./out/${slug}-crop-${who}.png`, import.meta.url))
svgCropToPng(svgFile, outFile, { x, y, w: +w, h: +h, scale: +scale })
console.log(outFile, `centre ${target.name} gen ${target.g} @ (${Math.round(cx)}, ${Math.round(cy)})`)
