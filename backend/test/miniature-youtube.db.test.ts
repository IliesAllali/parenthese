import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Miniature d'une vidéo YouTube (live du 22/11 : un carré noir sur l'arbre, on ne sait pas ce que c'est), sur une
// vraie base. Le serveur la cherche chez i.ytimg.com (fetch simulé ici), la garde avec les fichiers de l'arbre et la
// sert lui-même. Lancé seulement avec TEST_DATABASE_URL (base jetable, migrée, en UTF-8) :
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/miniature-youtube.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
let env: { ALLOW_REGISTRATION: boolean; MEDIA_STORAGE_PATH: string }
let forgetFailures: () => void
let ip = 0
const nextIp = () => `10.4.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
const run = Date.now().toString(36)
const mail = (name: string) => `${name}-${run}@exemple.fr`
const storage = mkdtempSync(path.join(tmpdir(), 'pth-miniature-db-'))
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00])
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const VIDEO = 'https://www.youtube.com/watch?v=aaaaaaaaaaa'

const youtube = { online: true }
const fetchMock = vi.fn(async (url: string | URL | Request) => {
  if (!youtube.online) throw new TypeError('fetch failed')
  if (!String(url).startsWith('https://i.ytimg.com/vi/')) throw new Error(`appel inattendu : ${String(url)}`)
  return new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } })
})

async function call(method: string, url: string, token?: string, payload?: unknown) {
  const res = await app.inject({
    method: method as 'GET',
    url,
    payload: payload as Record<string, unknown>,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    remoteAddress: nextIp(),
  })
  let body = null
  try { body = res.body ? res.json() : null } catch { body = null }
  return { status: res.statusCode, body, raw: res.rawPayload, headers: res.headers }
}

async function account(name: string) {
  const res = await call('POST', '/auth/register', undefined, { email: mail(name), password: 'mot-de-passe-solide', firstName: name })
  expect(res.status).toBe(201)
  return { token: res.body.token as string, id: res.body.user.id as string }
}

describe.skipIf(!TEST_DB)('miniature d’une vidéo YouTube, vraie base', () => {
  let owner: { token: string; id: string }
  let member: { token: string; id: string }
  let reader: { token: string; id: string }
  let treeId: string
  let personId: string

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.MEDIA_STORAGE_PATH = storage
    vi.stubGlobal('fetch', fetchMock)
    ;({ env } = await import('../src/config/env.js'))
    ;({ forgetYoutubeThumbnailFailures: forgetFailures } = await import('../src/lib/youtube-thumbnail.js'))
    const { createApp } = await import('../src/app.js')
    app = createApp()
    env.ALLOW_REGISTRATION = true
    env.MEDIA_STORAGE_PATH = storage
    owner = await account('proprio')
    const tree = await call('POST', '/trees', owner.token, { name: 'Arbre de démo', slug: `miniature-${run}`, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })
    expect(tree.status).toBe(201)
    treeId = tree.body.tree?.id ?? tree.body.id
    const person = await call('POST', `/trees/${treeId}/persons`, owner.token, { firstName: 'Odette', lastName: 'Duval' })
    expect(person.status).toBe(201)
    personId = person.body.person?.id ?? person.body.id
    member = await account('membre')
    reader = await account('lecteur')
    for (const who of [member, reader]) {
      expect((await call('POST', `/trees/${treeId}/access/unlock`, who.token, { password: 'partage-demo-1' })).status).toBe(200)
    }
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    await app?.close()
  })

  beforeEach(() => {
    youtube.online = true
    fetchMock.mockClear()
    forgetFailures()
  })

  const addVideo = (token: string) => call('POST', `/trees/${treeId}/persons/${personId}/media`, token, {
    type: 'video', mimeType: 'video/youtube', youtubeUrl: VIDEO, caption: 'Le mariage',
  })
  const thumbnail = (mediaId: string, token?: string) => call('GET', `/trees/${treeId}/media/${mediaId}/thumbnail`, token)
  const stored = async (mediaId: string) => app.prisma.mediaItem.findUnique({ where: { id: mediaId }, select: { thumbPath: true } })

  it("une vidéo ajoutée reçoit sa miniature, servie par Parenthèse et annoncée dans le graphe", async () => {
    const added = await addVideo(owner.token)
    expect(added.status).toBe(201)
    const mediaId = added.body.media.id as string

    const res = await thumbnail(mediaId, reader.token)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('image/jpeg')
    expect(Buffer.from(res.raw)).toEqual(JPEG)
    // Un seul appel chez YouTube : celui de l'ajout, que la première demande a rejoint
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg')
    expect((await stored(mediaId))?.thumbPath).toBe(`${treeId}/${personId}/${mediaId}-miniature.jpg`)

    // Déjà gardée : plus aucun appel
    expect((await thumbnail(mediaId, reader.token)).status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const graph = await call('GET', `/trees/${treeId}/graph`, reader.token)
    const entry = graph.body.graph.medias.find((m: { id: string }) => m.id === mediaId)
    expect(entry.urlPath).toBe(VIDEO)
    expect(entry.thumbUrlPath).toBe(`/trees/${treeId}/media/${mediaId}/thumbnail`)
  })

  it("hors ligne, l'ajout passe sans erreur et la miniature répond 404 ; elle arrive plus tard, à la demande", async () => {
    youtube.online = false
    const added = await addVideo(owner.token)
    expect(added.status).toBe(201)
    const mediaId = added.body.media.id as string
    expect((await thumbnail(mediaId, owner.token)).status).toBe(404)
    expect((await stored(mediaId))?.thumbPath).toBeNull()

    // Souvenir d'avant la miniature : la première demande, une fois YouTube joignable, la va chercher
    youtube.online = true
    forgetFailures()
    const res = await thumbnail(mediaId, owner.token)
    expect(res.status).toBe(200)
    expect((await stored(mediaId))?.thumbPath).toBeTruthy()
  })

  it("pas de miniature pour une photo, et rien n'est demandé à YouTube", async () => {
    const sent = await call('POST', `/trees/${treeId}/persons/${personId}/media`, owner.token, {
      type: 'photo', fileName: 'photo.png', mimeType: 'image/png', sizeBytes: Buffer.from(PIXEL, 'base64').length, dataBase64: PIXEL,
    })
    expect(sent.status).toBe(201)
    expect((await thumbnail(sent.body.media.id, owner.token)).status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("la miniature d'une vidéo en attente de relecture ne se lit que par qui gère l'arbre et qui l'a envoyée", async () => {
    const added = await addVideo(member.token)
    expect(added.status).toBe(201)
    const mediaId = added.body.media.id as string
    expect(added.body.media.status).toBe('pending')
    expect((await thumbnail(mediaId, reader.token)).status).toBe(404)
    expect((await thumbnail(mediaId)).status).toBe(401)
    expect((await thumbnail(mediaId, member.token)).status).toBe(200)
    expect((await thumbnail(mediaId, owner.token)).status).toBe(200)
  })

  it('supprimer la vidéo efface sa miniature du disque', async () => {
    const added = await addVideo(owner.token)
    const mediaId = added.body.media.id as string
    expect((await thumbnail(mediaId, owner.token)).status).toBe(200)
    const thumbPath = (await stored(mediaId))?.thumbPath as string
    expect(existsSync(path.join(storage, thumbPath))).toBe(true)
    expect((await call('DELETE', `/trees/${treeId}/persons/${personId}/media/${mediaId}`, owner.token)).status).toBe(200)
    expect(existsSync(path.join(storage, thumbPath))).toBe(false)
    expect((await thumbnail(mediaId, owner.token)).status).toBe(404)
  })
})
