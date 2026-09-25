// Gabarits des modèles d'arbre généalogique à imprimer (page /arbre-genealogique-a-remplir/).
// Chaque gabarit renvoie une page HTML contenant un SVG en millimètres (viewBox = format A4).
// Les traits d'écriture sont ajustés dans le navigateur après chargement des polices
// (voir ajusterTraits dans generer.mjs) : chaque trait démarre juste après son libellé.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const C = {
  encre: '#2a2622',
  a300: '#edb6a4',
  a500: '#d2694a',
  a700: '#93402a',
}

// Logo Parenthèse (symbole + nom), repris tel quel de public/logo.svg
const LOGO_SRC = readFileSync(fileURLToPath(new URL('../public/logo.svg', import.meta.url)), 'utf8')
const LOGO_VIEWBOX = LOGO_SRC.match(/viewBox="([^"]+)"/)[1]
const LOGO_INNER = LOGO_SRC.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
const LOGO_RATIO = 7.541

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const n = (v) => Math.round(v * 100) / 100

const STYLE = `
  .titre { font-family: 'Newsreader', serif; font-size: 9px; fill: ${C.encre}; }
  .titre-i { font-family: 'Newsreader', serif; font-style: italic; font-size: 9px; fill: ${C.a700}; }
  .sous { font-family: 'DM Sans', sans-serif; font-size: 3.1px; fill: ${C.encre}; fill-opacity: .72; }
  .tag { font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 2.4px; letter-spacing: .35px; fill: ${C.a700}; text-transform: uppercase; }
  .lab { font-family: 'DM Sans', sans-serif; font-size: 2.25px; fill: ${C.encre}; fill-opacity: .68; }
  .role { font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 2.15px; fill: ${C.a700}; }
  .sosa { font-family: 'DM Sans', sans-serif; font-size: 2px; fill: ${C.a500}; }
  .pied { font-family: 'DM Sans', sans-serif; font-size: 2.3px; fill: ${C.encre}; fill-opacity: .6; }
  .photo-lab { font-family: 'DM Sans', sans-serif; font-size: 2.1px; fill: ${C.encre}; fill-opacity: .35; letter-spacing: .3px; text-transform: uppercase; }
  .bx { fill: #fff; stroke: ${C.encre}; stroke-opacity: .55; stroke-width: .3; }
  .wl { stroke: ${C.encre}; stroke-opacity: .34; stroke-width: .2; }
  .dot { stroke: ${C.encre}; stroke-opacity: .3; stroke-width: .2; stroke-dasharray: .35 .9; stroke-linecap: round; fill: none; }
  .cn { stroke: ${C.a500}; stroke-width: .35; fill: none; stroke-linejoin: round; }
  .regle { stroke: ${C.encre}; stroke-opacity: .16; stroke-width: .2; }
  .photo { fill: #fff; stroke: ${C.encre}; stroke-opacity: .28; stroke-width: .2; stroke-dasharray: .8 .8; }
`

function page({ W, H, body, titre = 'modèle' }) {
  const orient = W > H ? 'landscape' : 'portrait'
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${esc(titre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=block" rel="stylesheet">
<style>
  @page { size: A4 ${orient}; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .sheet { width: ${W}mm; height: ${H}mm; overflow: hidden; }
  svg { display: block; }
</style></head>
<body><div class="sheet">
<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
<style>${STYLE}</style>
${body}
</svg></div></body></html>`
}

// Un champ = libellé + trait d'écriture (le trait est recalé en JS après le libellé)
function champ(x, xEnd, y, label) {
  return `<g class="f"><text class="lab" x="${n(x)}" y="${n(y)}">${esc(label)}</text><line class="wl" x1="${n(x + 8)}" y1="${n(y + 0.45)}" x2="${n(xEnd)}" y2="${n(y + 0.45)}"/></g>`
}

function entete({ W, margin, tag, top = 14 }) {
  const y = top + 9
  return `
  <text class="titre" x="${margin}" y="${y}">Arbre <tspan class="titre-i">généalogique</tspan></text>
  <g class="f"><text class="sous" x="${margin}" y="${y + 8}">de la famille</text><line class="wl" x1="${margin + 20}" y1="${y + 8.5}" x2="${margin + 100}" y2="${y + 8.5}"/></g>
  <text class="tag" x="${W - margin}" y="${y}" text-anchor="end">${esc(tag)}</text>
  <line class="regle" x1="${margin}" y1="${y + 13}" x2="${W - margin}" y2="${y + 13}"/>`
}

function pied({ W, H, margin, texte = 'Modèle gratuit à imprimer et à remplir' }) {
  const h = 3.4
  const w = h * LOGO_RATIO
  const y = H - 8
  return `
  <svg x="${margin}" y="${n(y - h + 0.5)}" width="${n(w)}" height="${h}" viewBox="${LOGO_VIEWBOX}">${LOGO_INNER}</svg>
  <text class="pied" x="${W - margin}" y="${y}" text-anchor="end">${esc(texte)}, parenthese.io</text>`
}

const ROLES = [
  ['Moi'],
  ['Père', 'Mère'],
  ['Grand-père paternel', 'Grand-mère paternelle', 'Grand-père maternel', 'Grand-mère maternelle'],
  Array.from({ length: 8 }, (_, i) => (i % 2 ? 'Arrière-grand-mère' : 'Arrière-grand-père')),
]

const CHAMPS = ['Prénom', 'Nom', 'Né(e) le', 'à', 'Décès']

// Boîte de personne : rôle + numéro Sosa en tête, photo optionnelle, puis les champs
function boite({ x, y, w, h, role, sosa, ls, photo }) {
  const pad = 2.4
  let out = `<rect class="bx" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="1.6"/>`
  out += `<text class="role" x="${n(x + pad)}" y="${n(y + 4.3)}">${esc(role)}</text>`
  out += `<text class="sosa" x="${n(x + w - pad)}" y="${n(y + 4.3)}" text-anchor="end">${sosa}</text>`
  let cy = y + 6
  if (photo) {
    const pw = photo.w
    const ph = photo.h
    const px = x + (w - pw) / 2
    out += `<rect class="photo" x="${n(px)}" y="${n(cy + 0.6)}" width="${pw}" height="${ph}" rx="1"/>`
    out += `<text class="photo-lab" x="${n(x + w / 2)}" y="${n(cy + 0.6 + ph / 2 + 0.8)}" text-anchor="middle">Photo</text>`
    cy += ph + 1.6
  }
  CHAMPS.forEach((label, k) => {
    out += champ(x + pad, x + w - pad, cy + (k + 1) * ls - 0.9, label)
  })
  return out
}

function hauteurBoite(ls, photo) {
  return 6 + (photo ? photo.h + 1.6 : 0) + CHAMPS.length * ls + 1.4
}

// Arbre ascendant vertical : « Moi » en bas, les ancêtres au-dessus, côté paternel à gauche
function arbre({ W, H, margin, top, bottom, gens, gap, maxW, ls, photo, tag, texte }) {
  const boxH = hauteurBoite(ls, photo)
  const vgap = (bottom - top - gens * boxH) / (gens - 1)
  const rowY = (g) => bottom - boxH - g * (boxH + vgap)
  const availW = W - 2 * margin
  const cx = (g, i) => margin + (availW / 2 ** g) * (i + 0.5)
  let traits = ''
  let boites = ''
  for (let g = 0; g < gens; g++) {
    const count = 2 ** g
    const slot = availW / count
    const w = Math.min(slot - gap, maxW[g])
    for (let i = 0; i < count; i++) {
      boites += boite({ x: cx(g, i) - w / 2, y: rowY(g), w, h: boxH, role: ROLES[g][i], sosa: count + i, ls, photo })
      if (g < gens - 1) {
        const yb = rowY(g + 1) + boxH
        const yt = rowY(g)
        const bar = (yb + yt) / 2
        const a = cx(g + 1, 2 * i)
        const b = cx(g + 1, 2 * i + 1)
        traits += `<path class="cn" d="M${n(a)} ${n(yb)} V${n(bar)} H${n(b)} V${n(yb)} M${n(cx(g, i))} ${n(bar)} V${n(yt)}"/>`
      }
    }
  }
  return page({ W, H, body: entete({ W, margin, tag }) + traits + boites + pied({ W, H, margin, texte }) })
}

export function troisGenerations() {
  return arbre({
    W: 210, H: 297, margin: 14, top: 50, bottom: 276, gens: 3, gap: 4,
    maxW: [84, 66, 42], ls: 8.2, tag: '3 générations',
  })
}

export function quatreGenerations() {
  return arbre({
    W: 297, H: 210, margin: 12, top: 47, bottom: 193, gens: 4, gap: 2.6,
    maxW: [76, 64, 56, 32], ls: 5.3, tag: '4 générations',
  })
}

export function troisGenerationsPhotos() {
  return arbre({
    W: 210, H: 297, margin: 14, top: 46, bottom: 280, gens: 3, gap: 4,
    maxW: [84, 66, 42], ls: 6.2, photo: { w: 23, h: 28 }, tag: '3 générations avec photos',
  })
}

// ─── Éventail 5 générations ─────────────────────────────────────────────────

const pol = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)]
}

function secteur(cx, cy, r0, r1, d0, d1) {
  const [x0, y0] = pol(cx, cy, r1, d0)
  const [x1, y1] = pol(cx, cy, r1, d1)
  const [x2, y2] = pol(cx, cy, r0, d1)
  const [x3, y3] = pol(cx, cy, r0, d0)
  return `M${n(x0)} ${n(y0)} A${r1} ${r1} 0 0 1 ${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)} A${r0} ${r0} 0 0 0 ${n(x3)} ${n(y3)} Z`
}

function arc(cx, cy, r, d0, d1) {
  const [x0, y0] = pol(cx, cy, r, d0)
  const [x1, y1] = pol(cx, cy, r, d1)
  return `M${n(x0)} ${n(y0)} A${r} ${r} 0 0 1 ${n(x1)} ${n(y1)}`
}

export function cinqGenerationsEventail() {
  const W = 297
  const H = 210
  const margin = 12
  const cx = W / 2
  const cy = 188
  const R = [0, 26, 55, 82, 108, 134]
  const LEGENDES = [['Moi'], ['Parents'], ['Grands-', 'parents'], ['Arrière-grands-', 'parents'], ['Trisaïeuls']]
  let body = ''
  // anneaux de la génération 2 à 5 (Sosa 2 à 31), du père (gauche) à la mère (droite)
  for (let g = 1; g <= 4; g++) {
    const count = 2 ** g
    const step = 180 / count
    for (let i = 0; i < count; i++) {
      const d0 = 180 - i * step
      const d1 = 180 - (i + 1) * step
      const fill = g % 2 ? `fill="${C.a300}" fill-opacity=".14"` : 'fill="#fff"'
      body += `<path d="${secteur(cx, cy, R[g], R[g + 1], d0, d1)}" ${fill} stroke="${C.encre}" stroke-opacity=".55" stroke-width=".3" stroke-linejoin="round"/>`
      const depth = R[g + 1] - R[g]
      if (g < 4) {
        // lignes d'écriture en arcs
        const lines = g === 1 ? 3 : 2
        for (let k = 1; k <= lines; k++) {
          const r = R[g] + (depth * k) / (lines + 1)
          const inset = (2.2 / r) * (180 / Math.PI)
          body += `<path class="dot" d="${arc(cx, cy, r, d0 - inset, d1 + inset)}"/>`
        }
      } else {
        // dernière couronne : écriture dans le sens du rayon
        for (let k = 1; k <= 2; k++) {
          const d = d0 - (step * k) / 3
          const [x0, y0] = pol(cx, cy, R[g] + 2.2, d)
          const [x1, y1] = pol(cx, cy, R[g + 1] - 5.5, d)
          body += `<line class="dot" x1="${n(x0)}" y1="${n(y0)}" x2="${n(x1)}" y2="${n(y1)}"/>`
        }
      }
      // numéro Sosa près du bord extérieur
      const [sx, sy] = pol(cx, cy, R[g + 1] - 2.6, (d0 + d1) / 2)
      body += `<text class="sosa" x="${n(sx)}" y="${n(sy + 0.7)}" text-anchor="middle">${count + i}</text>`
    }
  }
  // demi-disque central (Moi)
  body += `<path d="M${n(cx - R[1])} ${cy} A${R[1]} ${R[1]} 0 0 1 ${n(cx + R[1])} ${cy} Z" fill="#fff" stroke="${C.encre}" stroke-opacity=".55" stroke-width=".3"/>`
  ;[cy - 15, cy - 9.5, cy - 4].forEach((y) => {
    const half = Math.sqrt(R[1] ** 2 - (cy - y) ** 2) - 2.5
    body += `<line class="dot" x1="${n(cx - half)}" y1="${y}" x2="${n(cx + half)}" y2="${y}"/>`
  })
  body += `<text class="sosa" x="${cx}" y="${cy - 19.5}" text-anchor="middle">1</text>`
  // légende des couronnes sous la ligne de base, des deux côtés
  LEGENDES.forEach((lines, g) => {
    const mid = g === 0 ? 0 : (R[g] + R[g + 1]) / 2
    const xs = g === 0 ? [cx] : [cx - mid, cx + mid]
    xs.forEach((x) => {
      lines.forEach((t, k) => {
        body += `<text class="role" x="${n(x)}" y="${n(cy + 4.4 + k * 2.7)}" text-anchor="middle">${esc(t)}</text>`
      })
    })
  })
  body += `<text class="lab" x="${W - margin}" y="${31}" text-anchor="end">Numérotation Sosa. Le père d'une personne porte le double de son numéro, la mère le double plus un.</text>`
  return page({ W, H, body: entete({ W, margin, tag: '5 générations en éventail' }) + body + pied({ W, H, margin }) })
}

// ─── Arbre dessiné, 3 générations ───────────────────────────────────────────

// Branche effilée : on échantillonne une courbe de Bézier cubique et on décale ses normales
function branche(p0, p1, p2, p3, w0, w1) {
  const N = 28
  const L = []
  const Rr = []
  for (let k = 0; k <= N; k++) {
    const t = k / N
    const u = 1 - t
    const x = u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0]
    const y = u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
    const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0])
    const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
    const len = Math.hypot(dx, dy) || 1
    const hw = (w0 + (w1 - w0) * t) / 2
    L.push([x - (dy / len) * hw, y + (dx / len) * hw])
    Rr.push([x + (dy / len) * hw, y - (dx / len) * hw])
  }
  const pts = [...L, ...Rr.reverse()]
  return `<path d="M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} Z"/>`
}

function feuille(x, y, angle, s) {
  return `<path d="M0 0 C${n(s * 0.35)} ${n(-s * 0.32)} ${n(s * 0.75)} ${n(-s * 0.3)} ${s} 0 C${n(s * 0.75)} ${n(s * 0.3)} ${n(s * 0.35)} ${n(s * 0.32)} 0 0 Z" transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)})"/>`
}

export function arbreDessine() {
  const W = 210
  const H = 297
  const margin = 14
  const ls = 7
  const bh = hauteurBoite(ls)
  // positions des boîtes (centre x, haut y, largeur)
  const moi = { x: 105, y: 238, w: 76 }
  const parents = [{ x: 58, y: 150, w: 60 }, { x: 152, y: 150, w: 60 }]
  const gps = [{ x: 35, y: 64, w: 42 }, { x: 81, y: 64, w: 42 }, { x: 129, y: 64, w: 42 }, { x: 175, y: 64, w: 42 }]
  let dessin = ''
  // tronc et branches, derrière les boîtes
  // tronc = deux branches qui partent du pied et se séparent en douceur (pas de jonction visible)
  dessin += branche([103, 266], [103, 200], [86, 194], [58, 172], 12, 5.5)
  dessin += branche([107, 266], [107, 200], [124, 194], [152, 172], 12, 5.5)
  const sous = [
    [[58, 170], [52, 140], [36, 132], [35, 100]],
    [[58, 170], [64, 140], [80, 132], [81, 100]],
    [[152, 170], [146, 140], [130, 132], [129, 100]],
    [[152, 170], [158, 140], [174, 132], [175, 100]],
  ]
  sous.forEach(([a, b, c, d]) => {
    dessin += branche(a, b, c, d, 5, 2.6)
  })
  // rameaux secondaires qui sortent du cadre des boîtes
  const rameaux = [
    [[35, 66], [30, 56], [22, 52], [16, 48]],
    [[81, 66], [84, 56], [92, 52], [98, 47]],
    [[129, 66], [126, 56], [118, 52], [112, 47]],
    [[175, 66], [180, 56], [188, 52], [194, 48]],
    [[58, 152], [50, 142], [30, 146], [22, 140]],
    [[152, 152], [160, 142], [180, 146], [188, 140]],
  ]
  rameaux.forEach(([a, b, c, d]) => {
    dessin += branche(a, b, c, d, 2.4, 0.6)
  })
  const feuilles = [
    [16, 48, -150, 5], [18, 51, 160, 4.2], [22, 45, -120, 4.4], [98, 47, -40, 5], [95, 44, -80, 4.2], [100, 51, 10, 4],
    [112, 47, -140, 5], [115, 44, -100, 4.2], [110, 51, 170, 4], [194, 48, -30, 5], [192, 51, 20, 4.2], [188, 45, -60, 4.4],
    [22, 140, -160, 5], [25, 136, -110, 4.2], [20, 144, 150, 4], [188, 140, -20, 5], [185, 136, -70, 4.2], [190, 144, 30, 4],
  ]
  let feuillage = ''
  feuilles.forEach(([x, y, a, s]) => { feuillage += feuille(x, y, a, s) })
  // sol
  dessin += `<path d="M62 283 C88 280 122 280 148 283" stroke="${C.a500}" stroke-width=".35" fill="none" stroke-linecap="round"/>`
  let boites = ''
  const roles = [ROLES[0], ROLES[1], ROLES[2]]
  ;[[moi], parents, gps].forEach((row, g) => {
    row.forEach((b, i) => {
      boites += boite({ x: b.x - b.w / 2, y: b.y, w: b.w, h: bh, role: roles[g][i], sosa: 2 ** g + i, ls })
    })
  })
  // teintes opaques (a300 à 55 % et a500 à 50 % sur blanc) pour éviter les surimpressions aux jonctions
  const body = entete({ W, margin, tag: '3 générations, arbre dessiné' })
    + `<g fill="#f5d7cd">${dessin}</g><g fill="#e9b4a5">${feuillage}</g>`
    + boites + pied({ W, H, margin })
  return page({ W, H, body })
}

export const MODELES = [
  { slug: 'arbre-genealogique-3-generations', build: troisGenerations, portrait: true },
  { slug: 'arbre-genealogique-4-generations', build: quatreGenerations, portrait: false },
  { slug: 'arbre-genealogique-5-generations-eventail', build: cinqGenerationsEventail, portrait: false },
  { slug: 'arbre-genealogique-avec-photos', build: troisGenerationsPhotos, portrait: true },
  { slug: 'arbre-genealogique-dessine', build: arbreDessine, portrait: true },
]
