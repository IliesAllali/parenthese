import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Miniature d'un fichier vidéo (mp4, mov, webm), sur une vraie base. Le serveur n'a pas de quoi décoder une vidéo :
// le navigateur prend l'image à l'envoi, ou plus tard chez qui gère l'arbre ; le serveur la vérifie et la réencode.
// Lancé seulement avec TEST_DATABASE_URL (base jetable, migrée, en UTF-8) :
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/miniature-video.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
let env: { ALLOW_REGISTRATION: boolean; MEDIA_STORAGE_PATH: string }
let ip = 0
const nextIp = () => `10.5.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
const run = Date.now().toString(36)
const mail = (name: string) => `${name}-${run}@exemple.fr`
const storage = mkdtempSync(path.join(tmpdir(), 'pth-miniature-video-db-'))
// Début d'un MP4 : une boîte ftyp suffit à le reconnaître
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42', 'latin1'), Buffer.alloc(12), Buffer.from([0, 0, 0, 8]), Buffer.from('mdat', 'latin1')])
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(28)])

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

describe.skipIf(!TEST_DB)("miniature d'un fichier vidéo, vraie base", () => {
  let owner: { token: string; id: string }
  let manager: { token: string; id: string }
  let member: { token: string; id: string }
  let reader: { token: string; id: string }
  let treeId: string
  let personId: string
  let frame: string

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.MEDIA_STORAGE_PATH = storage
    ;({ env } = await import('../src/config/env.js'))
    const { createApp } = await import('../src/app.js')
    app = createApp()
    env.ALLOW_REGISTRATION = true
    env.MEDIA_STORAGE_PATH = storage
    owner = await account('proprio')
    const tree = await call('POST', '/trees', owner.token, { name: 'Arbre de démo', slug: `miniature-video-${run}`, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })
    expect(tree.status).toBe(201)
    treeId = tree.body.tree?.id ?? tree.body.id
    const person = await call('POST', `/trees/${treeId}/persons`, owner.token, { firstName: 'Odette', lastName: 'Duval' })
    expect(person.status).toBe(201)
    personId = person.body.person?.id ?? person.body.id
    manager = await account('cogestion')
    await app.prisma.treeMembership.create({ data: { treeId, userId: manager.id, role: 'admin' } })
    member = await account('membre')
    reader = await account('lecteur')
    for (const who of [member, reader]) {
      expect((await call('POST', `/trees/${treeId}/access/unlock`, who.token, { password: 'partage-demo-1' })).status).toBe(200)
    }
    // Image prise par le navigateur : un PNG large, avec une métadonnée, que le serveur doit réduire et nettoyer
    frame = (await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#3e5c7a' } })
      .withMetadata({ exif: { IFD0: { Copyright: 'appareil' } } })
      .png()
      .toBuffer()).toString('base64')
  })

  afterAll(async () => {
    await app?.close()
  })

  const upload = (token: string, extra: Record<string, unknown> = {}, file = MP4, mimeType = 'video/mp4') =>
    call('POST', `/trees/${treeId}/persons/${personId}/media`, token, {
      type: 'video', fileName: 'film.mp4', mimeType, sizeBytes: file.length, dataBase64: file.toString('base64'), ...extra,
    })
  const thumbnail = (mediaId: string, token?: string) => call('GET', `/trees/${treeId}/media/${mediaId}/thumbnail`, token)
  const backfill = (mediaId: string, token: string | undefined, thumbnailBase64: unknown = frame) =>
    call('PUT', `/trees/${treeId}/media/${mediaId}/thumbnail`, token, { thumbnailBase64 })
  const stored = async (mediaId: string) => (await app.prisma.mediaItem.findUnique({ where: { id: mediaId }, select: { thumbPath: true } }))?.thumbPath
  const graphEntry = async (mediaId: string) => {
    const graph = await call('GET', `/trees/${treeId}/graph`, owner.token)
    return graph.body.graph.medias.find((m: { id: string }) => m.id === mediaId)
  }

  it("une vidéo envoyée avec son image la garde, réencodée en JPEG de 640 px sans métadonnées, annoncée dans le graphe", async () => {
    const sent = await upload(owner.token, { thumbnailBase64: `data:image/png;base64,${frame}` })
    expect(sent.status).toBe(201)
    const mediaId = sent.body.media.id as string
    expect(await stored(mediaId)).toBe(`${treeId}/${personId}/${mediaId}-miniature.jpg`)

    const res = await thumbnail(mediaId, reader.token)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('image/jpeg')
    const meta = await sharp(Buffer.from(res.raw)).metadata()
    expect(meta.format).toBe('jpeg')
    expect([meta.width, meta.height]).toEqual([640, 360])
    expect(meta.exif).toBeUndefined()
    expect((await graphEntry(mediaId)).thumbUrlPath).toBe(`/trees/${treeId}/media/${mediaId}/thumbnail`)
  })

  it("une image illisible, un SVG ou un nombre à la place : la vidéo passe quand même, sans miniature", async () => {
    for (const bad of ['pas-une-image', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'), 42, 'A'.repeat(1_200_000)]) {
      const sent = await upload(owner.token, { thumbnailBase64: bad })
      expect(sent.status).toBe(201)
      const mediaId = sent.body.media.id as string
      expect(await stored(mediaId)).toBeNull()
      expect((await thumbnail(mediaId, owner.token)).status).toBe(404)
      expect((await graphEntry(mediaId)).thumbUrlPath).toBeNull()
    }
  })

  it("une image jointe à autre chose qu'une vidéo est ignorée", async () => {
    const pdf = Buffer.from('%PDF-1.4\n%%EOF')
    const sent = await call('POST', `/trees/${treeId}/persons/${personId}/media`, owner.token, {
      type: 'document', fileName: 'acte.pdf', mimeType: 'application/pdf', sizeBytes: pdf.length, dataBase64: pdf.toString('base64'), thumbnailBase64: frame,
    })
    expect(sent.status).toBe(201)
    expect(await stored(sent.body.media.id)).toBeNull()
    expect((await thumbnail(sent.body.media.id, owner.token)).status).toBe(404)
  })

  it("la famille envoie une vidéo webm avec son image : la miniature suit les droits du souvenir en attente", async () => {
    const sent = await upload(member.token, { thumbnailBase64: frame }, WEBM, 'video/webm')
    expect(sent.status).toBe(201)
    expect(sent.body.media.status).toBe('pending')
    const mediaId = sent.body.media.id as string
    expect(await stored(mediaId)).toBeTruthy()
    expect((await thumbnail(mediaId, reader.token)).status).toBe(404)
    expect((await thumbnail(mediaId)).status).toBe(401)
    expect((await thumbnail(mediaId, member.token)).status).toBe(200)
    expect((await thumbnail(mediaId, owner.token)).status).toBe(200)
  })

  it("une vidéo d'avant reçoit sa miniature de qui gère l'arbre, une seule fois ; jamais de la famille ni d'un visiteur", async () => {
    const sent = await upload(owner.token)
    const mediaId = sent.body.media.id as string
    expect(await stored(mediaId)).toBeNull()
    expect((await graphEntry(mediaId)).thumbUrlPath).toBeNull()

    expect((await backfill(mediaId, undefined)).status).toBe(401)
    expect((await backfill(mediaId, member.token)).status).toBe(403)
    expect((await backfill(mediaId, reader.token)).status).toBe(403)
    expect((await backfill(mediaId, owner.token, 'pas-une-image')).status).toBe(400)
    expect(await stored(mediaId)).toBeNull()

    const done = await backfill(mediaId, manager.token)
    expect(done.status).toBe(200)
    expect(done.body.thumbUrlPath).toBe(`/trees/${treeId}/media/${mediaId}/thumbnail`)
    expect((await thumbnail(mediaId, reader.token)).status).toBe(200)
    expect((await graphEntry(mediaId)).thumbUrlPath).toBe(done.body.thumbUrlPath)

    // Déjà là : on ne la remplace pas
    expect((await backfill(mediaId, owner.token)).status).toBe(409)
  })

  it("pas de miniature envoyée pour une photo ni pour une vidéo YouTube", async () => {
    const youtube = await call('POST', `/trees/${treeId}/persons/${personId}/media`, owner.token, {
      type: 'video', mimeType: 'video/youtube', youtubeUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    })
    expect(youtube.status).toBe(201)
    expect((await backfill(youtube.body.media.id, owner.token)).status).toBe(404)
    expect((await backfill('inconnu', owner.token)).status).toBe(404)
  })

  it('supprimer la vidéo, ou refuser la proposition, efface sa miniature du disque', async () => {
    const sent = await upload(owner.token, { thumbnailBase64: frame })
    const mediaId = sent.body.media.id as string
    const thumbPath = await stored(mediaId) as string
    expect(readFileSync(path.join(storage, thumbPath)).length).toBeGreaterThan(0)
    expect((await call('DELETE', `/trees/${treeId}/persons/${personId}/media/${mediaId}`, owner.token)).status).toBe(200)
    expect(existsSync(path.join(storage, thumbPath))).toBe(false)
    expect((await thumbnail(mediaId, owner.token)).status).toBe(404)

    const proposed = await upload(member.token, { thumbnailBase64: frame })
    const proposedId = proposed.body.media.id as string
    const proposedThumb = await stored(proposedId) as string
    expect(existsSync(path.join(storage, proposedThumb))).toBe(true)
    const sessionId = (await app.prisma.mediaItem.findUnique({ where: { id: proposedId }, select: { contributionSessionId: true } }))?.contributionSessionId
    const review = await call('POST', `/trees/${treeId}/contributions/sessions/${sessionId}/review`, owner.token, { decision: 'rejected' })
    expect(review.status).toBe(200)
    expect(existsSync(path.join(storage, proposedThumb))).toBe(false)
  })
})
