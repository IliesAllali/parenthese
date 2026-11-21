import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { readAvatarCrop, type AvatarCrop } from './avatar-crop.js'

// Aperçu d'un lien /arbre/… dans WhatsApp, Messenger, iMessage : une image 1200 × 630, « le cadre » choisi par
// Patch (21/11). Le visuel de l'arbre (photo, icône ou lettre) posé comme une photo sur une table, son nom à côté.
// Jamais de noms de personnes ni de nombre. L'image se lit sans mot de passe, la photo comprise : Patch l'a accepté.

const WIDTH = 1200
const HEIGHT = 630
// Couleurs de pz.css
const BG = '#fbfaf7'
const INK = '#2a2622'
const LINE = '#ebe6df'
const A50 = '#fcf3ef'
const A100 = '#f8e4db'
const A700 = '#93402a'
const FONT_FAMILY = 'Newsreader Apercu'

// Version du dessin : la changer refait les aperçus déjà en cache
const RENDER_VERSION = 1

const ASSETS = path.resolve(process.cwd(), 'assets/apercu')
const FONT_FILE = path.join(ASSETS, 'newsreader-apercu.ttf')

export type PreviewTree = {
  id: string
  name: string
  icon: string | null
  imagePath: string | null
  imageCrop: unknown
  imageUpdatedAt: Date | null
}

const escapeMarkup = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Première lettre affichée du nom (premier graphème, en majuscule), comme la pastille de l'app
function initialOf(name: string): string {
  const value = name.trim()
  if (!value) return '?'
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const first = segmenter.segment(value)[Symbol.iterator]().next().value?.segment ?? value[0]
  return first.toUpperCase()
}

// Fichier Twemoji d'une icône : ses points de code en hexadécimal, sans le sélecteur de variante (fe0f)
export function twemojiFileOf(icon: string): string {
  const codes = Array.from(icon).map((char) => char.codePointAt(0)!.toString(16)).filter((code) => code !== 'fe0f')
  return path.join(ASSETS, 'twemoji', `${codes.join('-')}.svg`)
}

// Zone carrée de la photo, comme le cadrage des portraits (frontend, portraitCrop.js, cropViewport)
function squareViewport(width: number, height: number, crop: Omit<AvatarCrop, 'shape'> | null) {
  const c = crop ?? { x: 0.5, y: 0.5, zoom: 1 }
  const side = Math.min(width, height) / c.zoom
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
  const cx = clamp(c.x * width, side / 2, width - side / 2)
  const cy = clamp(c.y * height, side / 2, height - side / 2)
  return {
    left: Math.max(0, Math.round(cx - side / 2)),
    top: Math.max(0, Math.round(cy - side / 2)),
    width: Math.max(1, Math.min(width, Math.round(side))),
    height: Math.max(1, Math.min(height, Math.round(side))),
  }
}

async function textImage(markup: string, options: { size: number; width?: number; color: string; align?: 'left' | 'centre' }) {
  return sharp({
    text: {
      text: `<span foreground="${options.color}">${markup}</span>`,
      font: `${FONT_FAMILY} ${options.size}`,
      fontfile: FONT_FILE,
      rgba: true,
      dpi: 72,
      ...(options.width ? { width: options.width, wrap: 'word' as const } : {}),
      align: options.align ?? 'left',
    },
  }).png().toBuffer({ resolveWithObject: true })
}

// Le visuel en carré : la photo recadrée, sinon l'icône sur fond clair, sinon la lettre sur la pastille terracotta
async function visualSquare(tree: PreviewTree, side: number, storageRoot: string): Promise<Buffer> {
  if (tree.imagePath) {
    const absolute = path.resolve(storageRoot, tree.imagePath)
    if (absolute.startsWith(storageRoot + path.sep)) {
      try {
        const source = sharp(await readFile(absolute), { limitInputPixels: 50_000_000, failOn: 'error' }).rotate()
        const meta = await source.metadata()
        const width = meta.autoOrient?.width ?? meta.width ?? 0
        const height = meta.autoOrient?.height ?? meta.height ?? 0
        if (width && height) {
          const crop = readAvatarCrop(tree.imageCrop)
          return await sharp(await source.toBuffer())
            .extract(squareViewport(width, height, crop ? { x: crop.x, y: crop.y, zoom: crop.zoom } : null))
            .resize(side, side)
            .png()
            .toBuffer()
        }
      } catch {
        // Photo illisible : l'icône ou la lettre à la place
      }
    }
  }

  const plain = (color: string) => sharp({ create: { width: side, height: side, channels: 4, background: color } })
  if (tree.icon) {
    try {
      const glyph = await sharp(await readFile(twemojiFileOf(tree.icon)), { density: 600 }).resize(Math.round(side * 0.56)).png().toBuffer()
      const meta = await sharp(glyph).metadata()
      return await plain(A50)
        .composite([{ input: glyph, left: Math.round((side - (meta.width ?? 0)) / 2), top: Math.round((side - (meta.height ?? 0)) / 2) }])
        .png()
        .toBuffer()
    } catch {
      // Icône hors de la liste proposée : la lettre
    }
  }
  const letter = await textImage(escapeMarkup(initialOf(tree.name)), { size: Math.round(side * 0.56), color: A700 })
  return plain(A100)
    .composite([{
      input: letter.data,
      left: Math.round((side - letter.info.width) / 2),
      top: Math.round((side - letter.info.height) / 2 - side * 0.02),
    }])
    .png()
    .toBuffer()
}

// Le nom, sur trois lignes au plus : la taille baisse avec la longueur
function nameSize(name: string): number {
  if (name.length <= 16) return 92
  if (name.length <= 28) return 76
  if (name.length <= 48) return 62
  return 52
}

export async function renderLinkPreview(tree: PreviewTree, storageRoot: string): Promise<Buffer> {
  // Le cadre : une photo posée, bord blanc plus large en bas, légèrement tournée
  const visualSide = 340
  const pad = 22
  const frameW = visualSide + pad * 2
  const frameH = visualSide + pad + 78
  const visual = await visualSquare(tree, visualSide, storageRoot)
  const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frameW}" height="${frameH}"><rect x="1" y="1" width="${frameW - 2}" height="${frameH - 2}" fill="#fff" stroke="${LINE}" stroke-width="2"/></svg>`
  const frame = await sharp(Buffer.from(frameSvg))
    .composite([{ input: visual, left: pad, top: pad }])
    .png()
    .toBuffer()
  const tilted = await sharp(frame).rotate(-3, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer({ resolveWithObject: true })

  const name = tree.name.trim().slice(0, 80) || 'Arbre de famille'
  const textX = 600
  const textW = WIDTH - textX - 90
  const title = await textImage(escapeMarkup(name), { size: nameSize(name), width: textW, color: INK })
  const titleH = Math.min(title.info.height, 330)
  const titleTop = Math.round(HEIGHT / 2 - titleH / 2 - 30)
  const titleImage = title.info.height > 330 ? await sharp(title.data).extract({ left: 0, top: 0, width: title.info.width, height: 330 }).png().toBuffer() : title.data

  const logo = await sharp(await readFile(path.join(ASSETS, 'parenthese-logo.svg'))).resize({ height: 30 }).png().toBuffer()

  return sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: BG } })
    .composite([
      { input: tilted.data, left: Math.round(300 - tilted.info.width / 2), top: Math.round(HEIGHT / 2 - tilted.info.height / 2) },
      { input: titleImage, left: textX, top: Math.max(60, titleTop) },
      { input: logo, left: textX, top: HEIGHT - 96 },
    ])
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// Clé du cache : tout ce qui change l'image. Un autre nom, une autre icône, une autre photo ou un autre cadrage
// donnent une autre clé, donc une autre image et une autre adresse (les applis gardent l'ancienne en mémoire).
export function previewKey(tree: PreviewTree): string {
  const crop = readAvatarCrop(tree.imageCrop)
  return createHash('sha256')
    .update(JSON.stringify([RENDER_VERSION, tree.name, tree.imagePath ? null : tree.icon, tree.imagePath, crop, tree.imageUpdatedAt?.getTime() ?? null]))
    .digest('hex')
    .slice(0, 16)
}

// L'image en cache dans le dossier de l'arbre (supprimée avec lui), refaite quand la clé change
export async function cachedLinkPreview(tree: PreviewTree, storageRoot: string): Promise<Buffer> {
  const key = previewKey(tree)
  const directory = path.resolve(storageRoot, tree.id)
  if (!directory.startsWith(storageRoot + path.sep)) throw new Error('invalid_tree_directory')
  const file = path.join(directory, `apercu-${key}.png`)
  try {
    return await readFile(file)
  } catch {
    // Pas encore fait
  }
  const image = await renderLinkPreview(tree, storageRoot)
  await mkdir(directory, { recursive: true })
  // Les anciens aperçus de cet arbre ne servent plus
  const previous = await readdir(directory).catch(() => [] as string[])
  await Promise.all(previous.filter((entry) => entry.startsWith('apercu-') && entry.endsWith('.png')).map((entry) => rm(path.join(directory, entry), { force: true })))
  await writeFile(file, image)
  return image
}
