import { copyFileSync, existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { FastifyInstance } from 'fastify'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Aperçu d'un lien /arbre/… (WhatsApp, Messenger), sur une vraie base : le titre est le nom de l'arbre, l'image
// son cadre en 1200 × 630, gardée tant que le nom et le visuel ne changent pas. Un arbre inconnu ou supprimé garde
// l'aperçu générique. Lancé seulement avec TEST_DATABASE_URL (base jetable, migrée, en UTF-8) :
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/apercu-lien.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
let env: { ALLOW_REGISTRATION: boolean; MEDIA_STORAGE_PATH: string; FRONTEND_INDEX_PATH: string }
let ip = 0
const nextIp = () => `10.5.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
const run = Date.now().toString(36)
const storage = mkdtempSync(path.join(tmpdir(), 'pth-apercu-'))
const frontend = mkdtempSync(path.join(tmpdir(), 'pth-apercu-front-'))
// PNG d'un pixel
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function call(method: string, url: string, token?: string, payload?: unknown) {
  const res = await app.inject({
    method: method as 'GET',
    url,
    payload: payload as Record<string, unknown>,
    headers: { host: 'app.exemple.fr', 'x-forwarded-proto': 'https', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    remoteAddress: nextIp(),
  })
  return res
}

const meta = (html: string, key: string) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1]

describe.skipIf(!TEST_DB)("aperçu d'un lien partagé, vraie base", () => {
  let token: string
  let treeId: string
  const slug = `apercu-${run}`

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.MEDIA_STORAGE_PATH = storage
    copyFileSync(path.resolve('../frontend/index.html'), path.join(frontend, 'index.html'))
    ;({ env } = await import('../src/config/env.js'))
    const { createApp } = await import('../src/app.js')
    app = createApp()
    env.ALLOW_REGISTRATION = true
    env.MEDIA_STORAGE_PATH = storage
    env.FRONTEND_INDEX_PATH = path.join(frontend, 'index.html')
    const account = await call('POST', '/auth/register', undefined, { email: `apercu-${run}@exemple.fr`, password: 'mot-de-passe-solide', firstName: 'Camille' })
    token = account.json().token
    const tree = await call('POST', '/trees', token, { name: 'Famille Martin', slug, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })
    treeId = tree.json().tree?.id ?? tree.json().id
    await call('POST', `/trees/${treeId}/persons`, token, { firstName: 'Odette', lastName: 'Duval' })
  })

  afterAll(async () => {
    await app?.close()
  })

  const previews = () => (existsSync(path.join(storage, treeId)) ? readdirSync(path.join(storage, treeId)) : []).filter((name) => name.startsWith('apercu-'))

  it("la page de l'arbre porte son nom en titre et l'adresse de son image, sans personne ni nombre", async () => {
    const page = await call('GET', `/page-arbre/${slug}`)
    expect(page.statusCode).toBe(200)
    expect(page.headers['content-type']).toMatch(/text\/html/)
    const html = page.body
    expect(meta(html, 'og:title')).toBe('Famille Martin')
    expect(meta(html, 'og:url')).toBe(`https://app.exemple.fr/arbre/${slug}`)
    expect(meta(html, 'og:image')).toMatch(new RegExp(`^https://app\\.exemple\\.fr/api/arbre/${slug}/apercu\\.png\\?v=[0-9a-f]{16}$`))
    expect(meta(html, 'twitter:image')).toBe(meta(html, 'og:image'))
    expect(html).toContain('<title>Famille Martin · Parenthèse</title>')
    expect(html).not.toContain('Odette')
    expect(html).not.toMatch(/personnes?/)
    // La page de l'app reste la même : le script de l'app est là
    expect(html).toContain('<div id="root"></div>')
  })

  it("un arbre inconnu, ou supprimé, garde l'aperçu générique", async () => {
    const unknown = await call('GET', '/page-arbre/aucun-arbre-ici')
    expect(unknown.statusCode).toBe(200)
    expect(meta(unknown.body, 'og:title')).toBe('Un arbre de famille à parcourir')
    expect(meta(unknown.body, 'og:image')).toBe('https://app.parenthese.io/og-image.png')
    expect((await call('GET', '/arbre/aucun-arbre-ici/apercu.png')).statusCode).toBe(404)
  })

  it("l'image fait 1200 × 630, et elle est gardée en cache", async () => {
    const first = await call('GET', `/arbre/${slug}/apercu.png`)
    expect(first.statusCode).toBe(200)
    expect(first.headers['content-type']).toBe('image/png')
    const info = await sharp(first.rawPayload).metadata()
    expect([info.width, info.height]).toEqual([1200, 630])
    expect(previews()).toHaveLength(1)
    const again = await call('GET', `/arbre/${slug}/apercu.png`)
    expect(Buffer.compare(again.rawPayload, first.rawPayload)).toBe(0)
    expect(previews()).toHaveLength(1)
  })

  it("changer le nom, l'icône ou la photo change l'image et son adresse ; l'ancienne image part", async () => {
    const before = meta((await call('GET', `/page-arbre/${slug}`)).body, 'og:image')
    const old = previews()

    await call('PATCH', `/trees/${treeId}`, token, { name: 'Famille Martin-Roy' })
    const renamed = meta((await call('GET', `/page-arbre/${slug}`)).body, 'og:image')
    expect(renamed).not.toBe(before)
    expect((await call('GET', `/arbre/${slug}/apercu.png`)).statusCode).toBe(200)
    expect(previews()).toHaveLength(1)
    expect(previews()).not.toEqual(old)

    await call('PATCH', `/trees/${treeId}`, token, { icon: '⛵' })
    const withIcon = meta((await call('GET', `/page-arbre/${slug}`)).body, 'og:image')
    expect(withIcon).not.toBe(renamed)

    const photo = await call('POST', `/trees/${treeId}/image`, token, { fileName: 'famille.png', mimeType: 'image/png', sizeBytes: Buffer.from(PIXEL, 'base64').length, dataBase64: PIXEL })
    expect(photo.statusCode).toBe(201)
    const withPhoto = meta((await call('GET', `/page-arbre/${slug}`)).body, 'og:image')
    expect(withPhoto).not.toBe(withIcon)
    const image = await call('GET', `/arbre/${slug}/apercu.png`)
    expect(image.statusCode).toBe(200)
    expect(previews()).toHaveLength(1)
  })

  it('un nom avec des guillemets ou des chevrons reste du texte', async () => {
    await call('PATCH', `/trees/${treeId}`, token, { name: 'Les "O\'Brien" <b>' })
    const html = (await call('GET', `/page-arbre/${slug}`)).body
    expect(html).toContain('content="Les &quot;O\'Brien&quot; &lt;b&gt;"')
    expect(html).not.toContain('<b>')
    expect((await call('GET', `/arbre/${slug}/apercu.png`)).statusCode).toBe(200)
  })

  it("une ancienne adresse d'un arbre renommé mène au même aperçu, sous l'adresse actuelle", async () => {
    const renamed = await call('PATCH', `/trees/${treeId}`, token, { name: 'Famille Roy', slug: `roy-${run}` })
    expect(renamed.statusCode).toBe(200)
    const html = (await call('GET', `/page-arbre/${slug}`)).body
    expect(meta(html, 'og:title')).toBe('Famille Roy')
    expect(meta(html, 'og:image')).toContain(`/api/arbre/roy-${run}/apercu.png`)
  })

  it("sans la page de l'app sur le disque, la route répond 503 et nginx sert la page telle quelle", async () => {
    const saved = env.FRONTEND_INDEX_PATH
    env.FRONTEND_INDEX_PATH = path.join(frontend, 'absente.html')
    try {
      expect((await call('GET', `/page-arbre/roy-${run}`)).statusCode).toBe(503)
    } finally {
      env.FRONTEND_INDEX_PATH = saved
    }
  })
})
