// Génère les modèles PDF A4 et leurs aperçus WebP pour /arbre-genealogique-a-remplir/.
//
//   node modeles/generer.mjs            (depuis landing/)
//
// Playwright n'est pas une dépendance de la landing : le script le cherche dans node_modules,
// puis dans le dossier indiqué par PLAYWRIGHT_DIR (ex. D:/Commercial/tools/web-qa/node_modules).
// Chromium est lancé via le canal « chrome » (Chrome installé sur la machine).
// Les polices (Newsreader, DM Sans) viennent de Google Fonts et sont embarquées dans le PDF.

import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MODELES } from './gabarits.mjs'

const require = createRequire(import.meta.url)
function chargerPlaywright() {
  const dirs = [process.env.PLAYWRIGHT_DIR, 'D:/Commercial/tools/web-qa/node_modules'].filter(Boolean)
  try { return require('playwright') } catch {}
  for (const dir of dirs) {
    try { return require(require.resolve('playwright', { paths: [dir] })) } catch {}
  }
  throw new Error('Playwright introuvable. Définir PLAYWRIGHT_DIR vers un node_modules qui le contient.')
}

const OUT = fileURLToPath(new URL('../public/arbre-genealogique-a-remplir/', import.meta.url))
const APERCU_LARGEUR = 720

// Recale chaque trait d'écriture juste après son libellé, une fois les polices chargées
function ajusterTraits() {
  document.querySelectorAll('g.f').forEach((g) => {
    const t = g.querySelector('text')
    const l = g.querySelector('line')
    const b = t.getBBox()
    l.setAttribute('x1', String(Math.round((b.x + b.width + 1.2) * 100) / 100))
  })
}

async function main() {
  const { chromium } = chargerPlaywright()
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({ deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const convert = await ctx.newPage()
  const seul = process.argv[2]

  for (const m of MODELES) {
    if (seul && !m.slug.includes(seul)) continue
    const html = m.build()
    const [wmm, hmm] = m.portrait ? [210, 297] : [297, 210]
    await page.setViewportSize({ width: Math.ceil(wmm * 96 / 25.4), height: Math.ceil(hmm * 96 / 25.4) })
    await page.setContent(html, { waitUntil: 'networkidle' })
    const ok = await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('400 12px "DM Sans"'),
        document.fonts.load('500 12px "DM Sans"'),
        document.fonts.load('400 12px "Newsreader"'),
        document.fonts.load('italic 400 12px "Newsreader"'),
      ])
      await document.fonts.ready
      return document.fonts.check('400 12px "DM Sans"') && document.fonts.check('400 12px "Newsreader"')
    })
    if (!ok) throw new Error(`Polices non chargées pour ${m.slug}`)
    await page.evaluate(ajusterTraits)

    const pdf = `${OUT}${m.slug}.pdf`
    await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true })

    // Aperçu : capture de la feuille, réduite et encodée en WebP par le canvas de Chromium
    const png = await page.locator('.sheet').screenshot({ type: 'png' })
    const dataUrl = await convert.evaluate(async ({ b64, largeur }) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = largeur
      c.height = Math.round(img.height * largeur / img.width)
      const g = c.getContext('2d')
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, 0, 0, c.width, c.height)
      return { url: c.toDataURL('image/webp', 0.86), w: c.width, h: c.height }
    }, { b64: png.toString('base64'), largeur: APERCU_LARGEUR })
    const webp = Buffer.from(dataUrl.url.split(',')[1], 'base64')
    writeFileSync(`${OUT}${m.slug}.webp`, webp)
    console.log(`${m.slug}  pdf ok  apercu ${dataUrl.w}x${dataUrl.h} ${Math.round(webp.length / 1024)} Ko`)
  }
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
