// SVG → PNG : vue d'ensemble (largeur fixe) + crop (fenêtre du viewBox à l'échelle 1)
import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

export function svgToPng(svgFile, pngFile, { width = 2400 } = {}) {
  const svg = readFileSync(svgFile, 'utf8')
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: '#FDF8EC' })
  writeFileSync(pngFile, r.render().asPng())
}

// crop : remplace le viewBox par la fenêtre demandée (coordonnées layout)
export function svgCropToPng(svgFile, pngFile, { x, y, w, h, scale = 1 }) {
  const svg = readFileSync(svgFile, 'utf8')
    .replace(/viewBox="[^"]+"/, `viewBox="${x} ${y} ${w} ${h}"`)
    .replace(/ width="[^"]+" height="[^"]+"/, ` width="${w}" height="${h}"`)
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: Math.round(w * scale) }, background: '#FDF8EC' })
  writeFileSync(pngFile, r.render().asPng())
}
