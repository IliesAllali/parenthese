import logoUrl from '../assets/Parenthese logo.svg?url'
import { initialOf } from './initial.js'
import { cropViewport } from './portraitCrop.js'
import { treeImageSrc } from './treeVisual.js'

// Icône de l'onglet et de l'écran d'accueil : le logo de Parenthèse, ou le visuel de l'arbre ouvert.
// « Ajouter à l'écran d'accueil » reprend l'icône du moment : la famille retrouve l'arbre à son visuel.

const SIZE = 180
// Couleurs de la pastille de la lettre (--pz-a100, --pz-a700, --pz-a50 de pz.css)
const LETTER_BG = '#f8e4db'
const LETTER_INK = '#93402a'
const EMOJI_BG = '#fcf3ef'

export function applyFavicon(href) {
  if (typeof document === 'undefined') return
  const upsertLink = (selector, rel, type) => {
    const link = document.querySelector(selector) ?? document.createElement('link')
    link.rel = rel
    if (type) link.type = type
    else link.removeAttribute('type')
    link.href = href
    if (!link.parentNode) document.head.appendChild(link)
  }
  upsertLink('link[rel~="icon"]', 'icon', href === logoUrl ? 'image/svg+xml' : null)
  upsertLink('link[rel="apple-touch-icon"]', 'apple-touch-icon')
}

export function resetFavicon() {
  applyFavicon(logoUrl)
}

function canvasWithRoundedSquare(background) {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return null
  ctx.beginPath()
  ctx.roundRect?.(0, 0, SIZE, SIZE, SIZE * 0.22)
  ctx.closePath()
  ctx.fillStyle = background
  ctx.fill()
  ctx.clip()
  return { canvas, ctx }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Adresse de l'icône pour ce visuel. La lettre et l'emoji sont dessinés ; la photo est recadrée comme dans les
// menus. Sans canvas (ou photo d'une autre origine), la photo part telle quelle et le reste garde le logo.
export async function treeFaviconHref({ name, icon, image }) {
  try {
    const src = treeImageSrc(image)
    if (src) {
      const img = await loadImage(src)
      const drawn = canvasWithRoundedSquare(LETTER_BG)
      if (!drawn) return src
      const { sx, sy, sw, sh } = cropViewport(img.naturalWidth, img.naturalHeight, 1, image?.crop || null)
      drawn.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE)
      try {
        return drawn.canvas.toDataURL('image/png')
      } catch {
        return src
      }
    }
    const drawn = canvasWithRoundedSquare(icon ? EMOJI_BG : LETTER_BG)
    if (!drawn) return logoUrl
    drawn.ctx.textAlign = 'center'
    drawn.ctx.textBaseline = 'middle'
    drawn.ctx.fillStyle = LETTER_INK
    drawn.ctx.font = icon ? `${SIZE * 0.62}px system-ui, sans-serif` : `${SIZE * 0.6}px Newsreader, Georgia, serif`
    drawn.ctx.fillText(icon || initialOf(name), SIZE / 2, SIZE * (icon ? 0.55 : 0.54))
    return drawn.canvas.toDataURL('image/png')
  } catch {
    return logoUrl
  }
}
