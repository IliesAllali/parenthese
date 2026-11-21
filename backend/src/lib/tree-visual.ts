import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { FastifyReply } from 'fastify'

import { env } from '../config/env.js'
import { readAvatarCrop, type AvatarCrop } from './avatar-crop.js'
import { applyMediaResponseHeaders } from './media-files.js'

// Visuel d'un arbre, un seul à la fois : la photo, sinon l'icône (un emoji), sinon la première lettre du nom.
// La photo se lit comme les portraits : l'original reste en place, le cadrage est appliqué à l'affichage.

export const TREE_VISUAL_SELECT = { icon: true, imagePath: true, imageCrop: true, imageUpdatedAt: true } as const

type TreeVisualRow = {
  id: string
  icon: string | null
  imagePath?: string | null
  imageCrop?: unknown
  imageUpdatedAt?: Date | null
}

export type TreeImage = { urlPath: string; crop: Omit<AvatarCrop, 'shape'> | null }

// Adresse de la photo, avec sa date pour que le navigateur reprenne la nouvelle après un changement.
// `basePath` : la route qui la sert (par défaut celle de l'arbre, lue avec le jeton médias).
export function treeImageOf(tree: TreeVisualRow, basePath = `/trees/${encodeURIComponent(tree.id)}/image`): TreeImage | null {
  if (!tree.imagePath) return null
  const crop = readAvatarCrop(tree.imageCrop)
  const version = tree.imageUpdatedAt ? tree.imageUpdatedAt.getTime() : 0
  return {
    urlPath: `${basePath}?v=${version}`,
    crop: crop ? { x: crop.x, y: crop.y, zoom: crop.zoom } : null,
  }
}

// Ce que les réponses de l'API disent du visuel. Les colonnes de la photo (chemin sur le disque) ne sortent pas.
const IMAGE_COLUMNS = ['imagePath', 'imageMimeType', 'imageCrop', 'imageUpdatedAt'] as const

export function withTreeVisual<T extends TreeVisualRow>(tree: T, basePath?: string) {
  const rest: Record<string, unknown> = { ...tree }
  for (const column of IMAGE_COLUMNS) delete rest[column]
  return {
    ...(rest as Omit<T, (typeof IMAGE_COLUMNS)[number]>),
    icon: tree.imagePath ? null : tree.icon,
    image: treeImageOf(tree, basePath),
  }
}

// Envoie le fichier de la photo. Le chemin vient de la base, jamais de la requête : vérifié quand même.
export async function sendTreeImage(
  reply: FastifyReply,
  image: { imagePath: string | null; imageMimeType: string | null },
): Promise<FastifyReply> {
  if (!image.imagePath) return reply.code(404).send({ error: 'tree_image_not_found' })
  const storageRoot = path.resolve(env.MEDIA_STORAGE_PATH)
  const absolutePath = path.resolve(storageRoot, image.imagePath)
  if (!absolutePath.startsWith(storageRoot + path.sep)) {
    return reply.code(400).send({ error: 'invalid_media_path' })
  }
  let buffer: Buffer
  try {
    buffer = await readFile(absolutePath)
  } catch {
    return reply.code(404).send({ error: 'media_file_missing' })
  }
  applyMediaResponseHeaders(reply, image.imageMimeType, 'arbre')
  return reply.send(buffer)
}
