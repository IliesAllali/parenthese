import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { PrismaClient } from '../generated/prisma/client.js'
import { removeStoredFile, sniffMimeType } from './media-files.js'

// Miniature d'une vidéo YouTube posée sur une personne. Le serveur la va chercher une fois chez i.ytimg.com et la
// garde avec les autres fichiers de l'arbre : le navigateur de la famille la reçoit de Parenthèse, et ne contacte
// YouTube qu'au moment où quelqu'un lance la vidéo. Sans accès à Internet, rien n'arrive et la bande de film reste.

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/
const YOUTUBE_HOST_RE = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)$/i
const PATH_ID_RE = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/
// hqdefault existe pour presque toutes les vidéos ; mqdefault en secours
const THUMBNAIL_NAMES = ['hqdefault.jpg', 'mqdefault.jpg']
const FETCH_TIMEOUT_MS = 4_000
const MAX_THUMBNAIL_BYTES = 512 * 1024
// Après un échec (instance hors ligne, vidéo retirée), on ne réessaie pas avant une heure
const RETRY_AFTER_MS = 60 * 60 * 1000

export function youtubeVideoIdFromUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (!YOUTUBE_HOST_RE.test(url.hostname)) return null
  const id = url.hostname.toLowerCase().endsWith('youtu.be')
    ? url.pathname.slice(1).split('/')[0]
    : url.searchParams.get('v') ?? url.pathname.match(PATH_ID_RE)?.[1]
  return id && VIDEO_ID_RE.test(id) ? id : null
}

// Octets d'une réponse, abandonnée dès qu'elle dépasse la taille permise
async function readCapped(response: Response, maxBytes: number): Promise<Buffer | null> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => {})
    return null
  }
  if (!response.body) return null
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => {})
      return null
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

// Image JPEG de la vidéo, ou null si YouTube ne répond pas, ou pas avec une image raisonnable
export async function fetchYoutubeThumbnail(videoId: string, fetchImpl: typeof fetch = fetch): Promise<Buffer | null> {
  if (!VIDEO_ID_RE.test(videoId)) return null
  for (const name of THUMBNAIL_NAMES) {
    try {
      const response = await fetchImpl(`https://i.ytimg.com/vi/${videoId}/${name}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: 'error',
      })
      if (!response.ok) {
        await response.body?.cancel().catch(() => {})
        continue
      }
      const buffer = await readCapped(response, MAX_THUMBNAIL_BYTES)
      if (buffer && buffer.length > 0 && sniffMimeType(buffer, 'photo') === 'image/jpeg') return buffer
    } catch {
      // Hors ligne, délai dépassé : la miniature suivante ne passerait pas mieux
      return null
    }
  }
  return null
}

type YoutubeMedia = { id: string; treeId: string; personId: string; filePath: string }

const inFlight = new Map<string, Promise<string | null>>()
const failedAt = new Map<string, number>()

export function forgetYoutubeThumbnailFailures(): void {
  failedAt.clear()
}

// Va chercher la miniature, l'écrit à côté des fichiers de la personne et note son chemin (thumbPath).
// Renvoie le chemin relatif, ou null. Deux demandes simultanées pour la même vidéo partagent le même appel.
export function ensureYoutubeThumbnail(
  prisma: PrismaClient,
  storageRoot: string,
  media: YoutubeMedia,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const running = inFlight.get(media.id)
  if (running) return running
  const failed = failedAt.get(media.id)
  if (failed !== undefined && Date.now() - failed < RETRY_AFTER_MS) return Promise.resolve(null)

  const task = (async () => {
    const videoId = youtubeVideoIdFromUrl(media.filePath)
    const buffer = videoId ? await fetchYoutubeThumbnail(videoId, fetchImpl) : null
    if (!buffer) {
      failedAt.set(media.id, Date.now())
      return null
    }
    const relativePath = path.posix.join(media.treeId, media.personId, `${media.id}-miniature.jpg`)
    const absolutePath = path.resolve(storageRoot, relativePath)
    if (!absolutePath.startsWith(storageRoot + path.sep)) return null
    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, buffer)
    // Souvenir supprimé pendant l'appel : la miniature ne reste pas sur le disque
    const updated = await prisma.mediaItem.updateMany({ where: { id: media.id, deletedAt: null }, data: { thumbPath: relativePath } })
    if (updated.count === 0) {
      await removeStoredFile(storageRoot, relativePath)
      return null
    }
    failedAt.delete(media.id)
    return relativePath
  })()
    .catch(() => {
      failedAt.set(media.id, Date.now())
      return null
    })
    .finally(() => inFlight.delete(media.id))
  inFlight.set(media.id, task)
  return task
}
