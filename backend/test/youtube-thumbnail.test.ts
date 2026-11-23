import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ensureYoutubeThumbnail,
  fetchYoutubeThumbnail,
  forgetYoutubeThumbnailFailures,
  youtubeVideoIdFromUrl,
} from '../src/lib/youtube-thumbnail.js'

// Miniature d'une vidéo YouTube, cherchée par le serveur chez i.ytimg.com (live du 22/11 : un carré noir sur l'arbre)
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
const VIDEO_ID = 'aaaaaaaaaaa'
const jpegResponse = (body: Buffer = JPEG) => new Response(body, { status: 200, headers: { 'content-type': 'image/jpeg' } })

describe("l'identifiant d'une vidéo dans le lien enregistré", () => {
  it('se lit sous toutes les formes de lien YouTube', () => {
    expect(youtubeVideoIdFromUrl(`https://www.youtube.com/watch?v=${VIDEO_ID}`)).toBe(VIDEO_ID)
    expect(youtubeVideoIdFromUrl(`https://youtu.be/${VIDEO_ID}?t=4`)).toBe(VIDEO_ID)
    expect(youtubeVideoIdFromUrl(`https://www.youtube.com/embed/${VIDEO_ID}`)).toBe(VIDEO_ID)
    expect(youtubeVideoIdFromUrl(`https://www.youtube.com/shorts/${VIDEO_ID}`)).toBe(VIDEO_ID)
  })

  it("refuse ce qui n'est pas une vidéo YouTube", () => {
    expect(youtubeVideoIdFromUrl('https://exemple.fr/watch?v=aaaaaaaaaaa')).toBeNull()
    expect(youtubeVideoIdFromUrl('https://www.youtube.com/watch?v=court')).toBeNull()
    expect(youtubeVideoIdFromUrl('tree/person/fichier.mp4')).toBeNull()
    expect(youtubeVideoIdFromUrl(null)).toBeNull()
  })
})

describe('fetchYoutubeThumbnail', () => {
  it('demande hqdefault chez i.ytimg.com, sans suivre de redirection', async () => {
    const fetchMock = vi.fn(async () => jpegResponse())
    expect(await fetchYoutubeThumbnail(VIDEO_ID, fetchMock as unknown as typeof fetch)).toEqual(JPEG)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`)
    expect(init.redirect).toBe('error')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('se rabat sur mqdefault quand hqdefault manque', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('absent', { status: 404 }))
      .mockResolvedValueOnce(jpegResponse())
    expect(await fetchYoutubeThumbnail(VIDEO_ID, fetchMock as unknown as typeof fetch)).toEqual(JPEG)
    expect(fetchMock.mock.calls[1][0]).toBe(`https://i.ytimg.com/vi/${VIDEO_ID}/mqdefault.jpg`)
  })

  it("renonce sans erreur hors ligne, sans retenter l'autre taille", async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError('fetch failed') })
    expect(await fetchYoutubeThumbnail(VIDEO_ID, fetchMock as unknown as typeof fetch)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("refuse une réponse trop lourde ou qui n'est pas un JPEG", async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(600 * 1024)])
    expect(await fetchYoutubeThumbnail(VIDEO_ID, (async () => jpegResponse(big)) as unknown as typeof fetch)).toBeNull()
    expect(await fetchYoutubeThumbnail(VIDEO_ID, (async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch)).toBeNull()
  })

  it("ne contacte rien pour un identifiant mal formé", async () => {
    const fetchMock = vi.fn()
    expect(await fetchYoutubeThumbnail('../../etc', fetchMock as unknown as typeof fetch)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('ensureYoutubeThumbnail', () => {
  let storage: string
  let updateMany: ReturnType<typeof vi.fn>
  let prisma: Parameters<typeof ensureYoutubeThumbnail>[0]
  let n = 0
  const media = () => ({ id: `media-${++n}`, treeId: 'tree-1', personId: 'person-1', filePath: `https://www.youtube.com/watch?v=${VIDEO_ID}` })

  beforeEach(() => {
    storage = mkdtempSync(path.join(tmpdir(), 'pth-miniature-'))
    updateMany = vi.fn(async () => ({ count: 1 }))
    prisma = { mediaItem: { updateMany } } as unknown as Parameters<typeof ensureYoutubeThumbnail>[0]
    forgetYoutubeThumbnailFailures()
  })

  it("écrit la miniature avec les fichiers de la personne et note son chemin", async () => {
    const item = media()
    const thumbPath = await ensureYoutubeThumbnail(prisma, storage, item, (async () => jpegResponse()) as unknown as typeof fetch)
    expect(thumbPath).toBe(`tree-1/person-1/${item.id}-miniature.jpg`)
    expect(readFileSync(path.join(storage, thumbPath as string))).toEqual(JPEG)
    expect(updateMany).toHaveBeenCalledWith({ where: { id: item.id, deletedAt: null }, data: { thumbPath } })
  })

  it('deux demandes simultanées ne font qu’un appel', async () => {
    const item = media()
    const fetchMock = vi.fn(async () => jpegResponse())
    const [a, b] = await Promise.all([
      ensureYoutubeThumbnail(prisma, storage, item, fetchMock as unknown as typeof fetch),
      ensureYoutubeThumbnail(prisma, storage, item, fetchMock as unknown as typeof fetch),
    ])
    expect(a).toBe(b)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("après un échec, ne réessaie pas à chaque ouverture de l'arbre", async () => {
    const item = media()
    const fetchMock = vi.fn(async () => { throw new TypeError('fetch failed') })
    expect(await ensureYoutubeThumbnail(prisma, storage, item, fetchMock as unknown as typeof fetch)).toBeNull()
    expect(await ensureYoutubeThumbnail(prisma, storage, item, fetchMock as unknown as typeof fetch)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('un souvenir supprimé pendant l’appel ne laisse pas sa miniature sur le disque', async () => {
    const item = media()
    updateMany.mockResolvedValueOnce({ count: 0 })
    expect(await ensureYoutubeThumbnail(prisma, storage, item, (async () => jpegResponse()) as unknown as typeof fetch)).toBeNull()
    expect(existsSync(path.join(storage, `tree-1/person-1/${item.id}-miniature.jpg`))).toBe(false)
  })
})
