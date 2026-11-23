import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import type { PrismaClient } from '../generated/prisma/client.js'
import { removeStoredFile, sniffMimeType, VIDEO_FILE_MIME_TYPES } from './media-files.js'

// Miniature d'une vidéo, gardée avec les fichiers de la personne (`<mediaId>-miniature.jpg`, notée dans thumbPath) et
// servie sur /trees/:id/media/:mediaId/thumbnail. Celle d'une vidéo YouTube vient d'i.ytimg.com
// (youtube-thumbnail.ts) ; celle d'un fichier vidéo, du navigateur qui l'envoie : le serveur n'a pas de quoi décoder
// une vidéo, le navigateur si.

const THUMBNAIL_MAX_SIDE = 640
// Une image de 640 px en JPEG pèse quelques dizaines de Ko ; au-delà, ce n'est pas une miniature
const MAX_THUMBNAIL_BASE64_LENGTH = 1_000_000
const ACCEPTED_SOURCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function isVideoFileMime(mimeType: string | null | undefined): boolean {
  return (VIDEO_FILE_MIME_TYPES as readonly string[]).includes(String(mimeType ?? ''))
}

// Image envoyée par le navigateur (base64, avec ou sans « data:… , »), ou null si ce n'en est pas une
export function decodeThumbnailBase64(value: unknown): Buffer | null {
  if (typeof value !== 'string' || !value || value.length > MAX_THUMBNAIL_BASE64_LENGTH) return null
  const comma = value.indexOf(',')
  const raw = value.startsWith('data:') && comma >= 0 ? value.slice(comma + 1) : value
  const buffer = Buffer.from(raw, 'base64')
  return buffer.length ? buffer : null
}

// Réencodée en JPEG, sans métadonnées, 640 px au plus de côté. null si l'image est illisible : la vidéo passe sans.
export async function sanitizeVideoThumbnail(buffer: Buffer | null): Promise<Buffer | null> {
  if (!buffer) return null
  const mimeType = sniffMimeType(buffer, 'photo')
  if (!mimeType || !ACCEPTED_SOURCE_TYPES.has(mimeType)) return null
  try {
    return await sharp(buffer, { limitInputPixels: 16_000_000, failOn: 'error' })
      .resize({ width: THUMBNAIL_MAX_SIDE, height: THUMBNAIL_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#000000' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()
  } catch {
    return null
  }
}

type ThumbnailMedia = { id: string; treeId: string; personId: string }

// Écrit la miniature à côté des fichiers de la personne et note son chemin. Renvoie le chemin relatif, ou null si le
// souvenir a disparu entre-temps (le fichier ne reste alors pas sur le disque).
export async function storeMediaThumbnail(
  prisma: PrismaClient,
  storageRoot: string,
  media: ThumbnailMedia,
  buffer: Buffer,
): Promise<string | null> {
  const relativePath = path.posix.join(media.treeId, media.personId, `${media.id}-miniature.jpg`)
  const absolutePath = path.resolve(storageRoot, relativePath)
  if (!absolutePath.startsWith(storageRoot + path.sep)) return null
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, buffer)
  const updated = await prisma.mediaItem.updateMany({ where: { id: media.id, deletedAt: null }, data: { thumbPath: relativePath } })
  if (updated.count === 0) {
    await removeStoredFile(storageRoot, relativePath)
    return null
  }
  return relativePath
}
