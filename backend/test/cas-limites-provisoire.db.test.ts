import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Cas limites de l'arbre provisoire et de l'adresse, sur une vraie base : la session reprise depuis le cookie (Safari
// vide le stockage de la page après 7 jours), les 30 jours comptés depuis la dernière visite, l'invitation à
// co-gérer refusée, les anciennes adresses gardées, l'adresse coupée à 64 caractères, la limite d'arbres par compte.
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/cas-limites-provisoire.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
let prisma: typeof import('../src/lib/prisma.js')['prisma']
let ip = 0
const nextIp = () => `10.7.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
const run = Date.now().toString(36)
const DAY = 86_400_000

type Call = { status: number; body: any; cookie: string | null; retryAfter: number | null }
async function call(method: string, url: string, options: { token?: string; payload?: unknown; cookie?: string; from?: string } = {}): Promise<Call> {
  const res = await app.inject({
    method: method as 'GET',
    url,
    payload: options.payload as Record<string, unknown>,
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    remoteAddress: options.from ?? nextIp(),
  })
  const setCookie = res.headers['set-cookie']
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie
  const retryAfter = res.headers['retry-after']
  return { status: res.statusCode, body: res.body ? res.json() : null, cookie: raw ? String(raw).split(';')[0] : null, retryAfter: retryAfter === undefined ? null : Number(retryAfter) }
}

const treeBody = (name: string, slug = name) => ({ name, slug, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })

async function provisional(firstName: string) {
  const started = await call('POST', '/auth/provisional', { payload: { firstName } })
  expect(started.status).toBe(201)
  return { token: started.body.token as string, userId: started.body.user.id as string, cookie: started.cookie as string }
}

describe.skipIf(!TEST_DB)('cas limites du compte provisoire et de l’adresse, vraie base', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.ALLOW_REGISTRATION = 'true'
    ;({ prisma } = await import('../src/lib/prisma.js'))
    const { createApp } = await import('../src/app.js')
    app = createApp()
  })

  afterAll(async () => {
    await app?.close()
  })

  describe('session provisoire', () => {
    it('le cookie posé à la création rend la session quand le stockage de la page est vide', async () => {
      const { userId, cookie } = await provisional('safari')
      expect(cookie).toMatch(/^parenthese_provisoire=/)
      const resumed = await call('POST', '/auth/provisional/resume', { cookie })
      expect(resumed.status).toBe(200)
      expect(resumed.body.user.id).toBe(userId)
      expect(resumed.body.user.provisional).toBe(true)
      expect(resumed.cookie).toMatch(/^parenthese_provisoire=/)
      expect((await call('GET', '/auth/me', { token: resumed.body.token })).body.user.id).toBe(userId)
    })

    it('sans session ni cookie, rien à reprendre', async () => {
      expect((await call('POST', '/auth/provisional/resume')).status).toBe(401)
      expect((await call('POST', '/auth/provisional/resume', { cookie: 'parenthese_provisoire=abime' })).status).toBe(401)
    })

    it('chaque visite fait repartir les 30 jours et dit la visite d’avant', async () => {
      const { token, userId } = await provisional('retour')
      const before = new Date(Date.now() - 25 * DAY)
      await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: before } })
      const resumed = await call('POST', '/auth/provisional/resume', { token })
      expect(resumed.status).toBe(200)
      expect(new Date(resumed.body.lastVisitAt).getTime()).toBe(before.getTime())
      const until = new Date(resumed.body.user.provisionalUntil).getTime()
      expect(Math.abs(until - (Date.now() + 30 * DAY))).toBeLessThan(60_000)
      const row = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { lastSeenAt: true } })
      expect(Date.now() - (row.lastSeenAt?.getTime() ?? 0)).toBeLessThan(60_000)
    })

    it('un arbre gardé ne se reprend plus par son ancien cookie', async () => {
      const { token, cookie } = await provisional('garde')
      const kept = await call('POST', '/auth/keep', { token, cookie, payload: { email: `garde-${run}@exemple.fr`, password: 'mot-de-passe-solide' } })
      expect(kept.status).toBe(200)
      expect(kept.cookie).toBe('parenthese_provisoire=')
      expect((await call('POST', '/auth/provisional/resume', { cookie })).status).toBe(401)
    })

    it('effacé après 30 jours sans visite, même créé il y a longtemps s’il est revenu', async () => {
      const { purgeExpiredProvisionalAccounts } = await import('../src/lib/provisional-account.js')
      const away = await provisional('absent')
      const back = await provisional('fidele')
      await prisma.user.update({ where: { id: away.userId }, data: { createdAt: new Date(Date.now() - 40 * DAY), lastSeenAt: new Date(Date.now() - 31 * DAY) } })
      await prisma.user.update({ where: { id: back.userId }, data: { createdAt: new Date(Date.now() - 90 * DAY), lastSeenAt: new Date(Date.now() - DAY) } })
      const logger = { warn: vi.fn(), error: vi.fn() }
      await purgeExpiredProvisionalAccounts(prisma, logger)
      expect(await prisma.user.findUnique({ where: { id: away.userId } })).toBeNull()
      expect(await prisma.user.findUnique({ where: { id: back.userId } })).not.toBeNull()
    })
  })

  it('un arbre provisoire n’invite pas de co-gérant', async () => {
    const { token } = await provisional('gestion')
    const tree = await call('POST', '/trees', { token, payload: treeBody(`Famille Gestion ${run}`) })
    expect(tree.status).toBe(201)
    const invited = await call('POST', `/trees/${tree.body.tree.id}/invitations`, { token, payload: { email: `cogerant-${run}@exemple.fr` } })
    expect(invited.status).toBe(403)
    expect(invited.body.error).toBe('keep_required')
  })

  describe('adresse', () => {
    it('renommé, l’arbre garde son ancienne adresse ; un autre arbre ne la prend pas ; on peut y revenir', async () => {
      const owner = await call('POST', '/auth/register', { payload: { email: `renomme-${run}@exemple.fr`, password: 'mot-de-passe-solide', firstName: 'Lou' } })
      const token = owner.body.token as string
      const base = `famille-ancienne-${run}`
      const tree = (await call('POST', '/trees', { token, payload: treeBody('Famille Ancienne', base) })).body.tree
      expect(tree.slug).toBe(base)

      const renamed = await call('PATCH', `/trees/${tree.id}`, { token, payload: { name: 'Famille Nouvelle', slug: `famille-nouvelle-${run}` } })
      expect(renamed.status).toBe(200)
      expect(renamed.body.tree.slug).toBe(`famille-nouvelle-${run}`)

      const byOld = await call('GET', `/arbre/${base}`)
      expect(byOld.status).toBe(200)
      expect(byOld.body.tree.id).toBe(tree.id)
      expect(byOld.body.tree.slug).toBe(`famille-nouvelle-${run}`)

      const other = (await call('POST', '/trees', { token, payload: treeBody('Famille Ancienne', base) })).body.tree
      expect(other.slug).toBe(`${base}-2`)

      const back = await call('PATCH', `/trees/${tree.id}`, { token, payload: { slug: base } })
      expect(back.body.tree.slug).toBe(base)
      expect(await prisma.treeSlugAlias.findUnique({ where: { slug: base } })).toBeNull()
      expect((await call('GET', `/arbre/famille-nouvelle-${run}`)).body.tree.id).toBe(tree.id)
    })

    it('un nom de famille très long donne une adresse coupée à 64 caractères', async () => {
      const { token } = await provisional('long')
      const name = `Famille ${'de La Tour d’Auvergne-Lauraguais '.repeat(2)}${run}`
      const created = await call('POST', '/trees', { token, payload: treeBody(name.slice(0, 120)) })
      expect(created.status).toBe(201)
      expect(created.body.tree.slug.length).toBeLessThanOrEqual(64)
      expect(created.body.tree.slug).toMatch(/^famille-de-la-tour-d-auvergne/)
    })
  })

  it('dix familles derrière la même box font leur arbre ; le filet par adresse arrête une rafale', async () => {
    const box = '10.99.0.1'
    const results: Call[] = []
    for (let i = 0; i < 31; i += 1) {
      const { token } = await provisional(`box${i}`)
      results.push(await call('POST', '/trees', { token, from: box, payload: treeBody(`Famille Box ${i} ${run}`) }))
    }
    expect(results.slice(0, 30).every((result) => result.status === 201)).toBe(true)
    expect(results[30].status).toBe(429)
    // L'app dit la vraie attente (« Réessayez dans une heure ») à partir de Retry-After
    expect(results[30].retryAfter).toBeGreaterThan(55 * 60)
  }, 60_000)

  it('un même compte : dix arbres par heure, puis 429 avec la vraie attente, d’où qu’il vienne', async () => {
    const owner = await call('POST', '/auth/register', { payload: { email: `rafale-${run}@exemple.fr`, password: 'mot-de-passe-solide', firstName: 'Rafale' } })
    const token = owner.body.token as string
    for (let i = 0; i < 10; i += 1) {
      const created = await call('POST', '/trees', { token, payload: treeBody(`Famille Rafale ${i} ${run}`) })
      expect(created.status).toBe(201)
      // Supprimé aussitôt : on éprouve la limite par heure, pas le plafond de dix arbres par compte
      expect((await call('DELETE', `/trees/${created.body.tree.id}`, { token })).status).toBeLessThan(300)
    }
    const eleventh = await call('POST', '/trees', { token, payload: treeBody(`Famille Rafale 10 ${run}`) })
    expect(eleventh.status).toBe(429)
    expect(eleventh.retryAfter).toBeGreaterThan(55 * 60)
  }, 60_000)
})
