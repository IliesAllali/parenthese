import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Photo de l'arbre, sur une vraie base : un seul visuel à la fois (photo, icône ou lettre), réservée aux
// gestionnaires, comptée dans la place de l'arbre, jamais montrée par la porte publique. Lancé seulement avec
// TEST_DATABASE_URL (base jetable, migrée, en UTF-8) :
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/photo-arbre.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
let env: { ALLOW_REGISTRATION: boolean; MEDIA_STORAGE_PATH: string; MEDIA_QUOTA_PER_TREE_MB: number }
let ip = 0
const nextIp = () => `10.4.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
const run = Date.now().toString(36)
const mail = (name: string) => `${name}-${run}@exemple.fr`
// PNG d'un pixel
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const storage = mkdtempSync(path.join(tmpdir(), 'pth-photo-arbre-'))

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
  return { status: res.statusCode, body, headers: res.headers }
}

async function account(name: string) {
  const res = await call('POST', '/auth/register', undefined, { email: mail(name), password: 'mot-de-passe-solide', firstName: name })
  expect(res.status).toBe(201)
  return { token: res.body.token as string, id: res.body.user.id as string }
}

describe.skipIf(!TEST_DB)("photo de l'arbre, vraie base", () => {
  let owner: { token: string; id: string }
  let reader: { token: string; id: string }
  let treeId: string
  const slug = `photo-arbre-${run}`

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
    const tree = await call('POST', '/trees', owner.token, { name: 'Famille Martin', slug, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })
    expect(tree.status).toBe(201)
    treeId = tree.body.tree?.id ?? tree.body.id
    // Un compte de la famille, rattaché par le mot de passe de partage : il lit l'arbre, il ne le gère pas
    reader = await account('lecteur')
    expect((await call('POST', `/trees/${treeId}/access/unlock`, reader.token, { password: 'partage-demo-1' })).status).toBe(200)
  })

  afterAll(async () => {
    await app?.close()
  })

  const upload = (token: string, crop?: unknown) => call('POST', `/trees/${treeId}/image`, token, {
    fileName: 'famille.png', mimeType: 'image/png', sizeBytes: Buffer.from(PIXEL, 'base64').length, dataBase64: PIXEL,
    ...(crop !== undefined ? { crop } : {}),
  })
  const treeOf = async () => (await call('GET', `/trees/${treeId}`, owner.token)).body.tree
  const imageFiles = () => (existsSync(path.join(storage, treeId)) ? readdirSync(path.join(storage, treeId)) : [])
    .filter((name) => name.startsWith('arbre-'))
  const mediaToken = async (token: string) => (await call('GET', `/trees/${treeId}/graph`, token)).body?.mediaToken as string

  it("le gestionnaire met une photo : elle remplace l'icône, avec son cadrage", async () => {
    expect((await call('PATCH', `/trees/${treeId}`, owner.token, { icon: '🌳' })).status).toBe(200)
    const sent = await upload(owner.token, { x: 0.4, y: 0.6, zoom: 1.5 })
    expect(sent.status).toBe(201)
    expect(sent.body.image.urlPath).toMatch(new RegExp(`^/trees/${treeId}/image\\?v=\\d+$`))
    expect(sent.body.image.crop).toEqual({ x: 0.4, y: 0.6, zoom: 1.5 })

    const tree = await treeOf()
    expect(tree.icon).toBeNull()
    expect(tree.image.urlPath).toBe(sent.body.image.urlPath)
    // Le chemin sur le disque ne sort pas
    expect(tree.imagePath).toBeUndefined()
    expect(imageFiles()).toHaveLength(1)
  })

  it('une nouvelle photo remplace la précédente sur le disque', async () => {
    expect((await upload(owner.token)).status).toBe(201)
    expect(imageFiles()).toHaveLength(1)
  })

  it('seuls les gestionnaires mettent ou recadrent la photo', async () => {
    expect((await upload(reader.token)).status).toBe(403)
    expect((await call('PUT', `/trees/${treeId}/image/crop`, reader.token, { crop: { x: 0.5, y: 0.5, zoom: 2 } })).status).toBe(403)
    expect((await upload('')).status).toBe(401)
  })

  it("recadrer garde l'original et change le cadrage", async () => {
    const before = imageFiles()
    const res = await call('PUT', `/trees/${treeId}/image/crop`, owner.token, { crop: { x: 0.3, y: 0.3, zoom: 2 } })
    expect(res.status).toBe(200)
    expect(res.body.image.crop).toEqual({ x: 0.3, y: 0.3, zoom: 2 })
    expect(imageFiles()).toEqual(before)
  })

  it('la photo se lit comme un portrait : session ou jeton médias, jamais sans', async () => {
    const url = `/trees/${treeId}/image`
    expect((await call('GET', url)).status).toBe(401)
    const byOwner = await call('GET', url, owner.token)
    expect(byOwner.status).toBe(200)
    expect(String(byOwner.headers['content-type'])).toMatch(/^image\//)
    expect((await call('GET', `${url}?token=${await mediaToken(reader.token)}`)).status).toBe(200)
  })

  it('la liste des arbres du compte donne une adresse de la photo qui s’ouvre seule', async () => {
    const me = await call('GET', '/trees', owner.token)
    const listed = (me.body?.trees ?? []).find((tree: { id: string }) => tree.id === treeId)
    expect(listed.image.urlPath).toContain('token=')
    expect(listed.imagePath).toBeUndefined()
    expect((await call('GET', listed.image.urlPath)).status).toBe(200)
  })

  it('la porte publique ne montre jamais la photo, ni l’icône quand il y a une photo', async () => {
    const door = await call('GET', `/arbre/${slug}`)
    expect(door.status).toBe(200)
    expect(door.body.tree.icon).toBeNull()
    expect(JSON.stringify(door.body)).not.toContain('image')
  })

  it("la page d'invitation d'un gestionnaire montre la photo, lue avec le lien", async () => {
    const invited = await call('POST', `/trees/${treeId}/invitations`, owner.token, { email: mail('cogerant') })
    expect(invited.status).toBe(201)
    const page = await call('GET', `/invitations/${invited.body.token}`)
    expect(page.status).toBe(200)
    expect(page.body.treeIcon).toBeNull()
    expect(page.body.treeImage.urlPath).toContain(`/invitations/${invited.body.token}/tree-image`)
    expect((await call('GET', page.body.treeImage.urlPath)).status).toBe(200)
    expect((await call('GET', '/invitations/jeton-inconnu/tree-image')).status).toBe(404)
  })

  it("choisir une icône, ou la lettre, retire la photo et libère sa place", async () => {
    const res = await call('PATCH', `/trees/${treeId}`, owner.token, { icon: '⛵' })
    expect(res.status).toBe(200)
    expect(res.body.tree.icon).toBe('⛵')
    expect(res.body.tree.image).toBeNull()
    expect(imageFiles()).toHaveLength(0)
    expect((await call('GET', `/trees/${treeId}/image`, owner.token)).status).toBe(404)
    // La porte retrouve l'icône
    expect((await call('GET', `/arbre/${slug}`)).body.tree.icon).toBe('⛵')

    expect((await upload(owner.token)).status).toBe(201)
    const letter = await call('PATCH', `/trees/${treeId}`, owner.token, { icon: null })
    expect(letter.body.tree.icon).toBeNull()
    expect(letter.body.tree.image).toBeNull()
    expect(imageFiles()).toHaveLength(0)
  })

  it("changer le nom sans toucher au visuel garde la photo", async () => {
    expect((await upload(owner.token)).status).toBe(201)
    const res = await call('PATCH', `/trees/${treeId}`, owner.token, { name: 'Famille Martin-Roy' })
    expect(res.status).toBe(200)
    expect(res.body.tree.image).not.toBeNull()
    expect(imageFiles()).toHaveLength(1)
  })

  it("la photo compte dans la place de l'arbre", async () => {
    const quota = env.MEDIA_QUOTA_PER_TREE_MB
    env.MEDIA_QUOTA_PER_TREE_MB = 0
    try {
      expect((await upload(owner.token)).status).toBe(413)
    } finally {
      env.MEDIA_QUOTA_PER_TREE_MB = quota
    }
  })
})
