import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// L'arbre avant le compte (#251), sur une vraie base : compte provisoire, « Gardez votre arbre » par mot de passe ou
// par le fournisseur, connexion à un compte existant depuis l'arbre provisoire, effacement au bout de 30 jours.
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/compte-provisoire.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

const { oidcMock } = vi.hoisted(() => ({ oidcMock: { startAuthorization: vi.fn(), finishAuthorization: vi.fn() } }))
vi.mock('../src/lib/oidc.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/oidc.js')>()),
  ...oidcMock,
}))

const ISSUER = 'https://accounts.google.com'
let app: FastifyInstance
let env: { ALLOW_REGISTRATION: boolean; PASSWORD_LOGIN: boolean }
let prisma: typeof import('../src/lib/prisma.js')['prisma']
let ip = 0
const nextIp = () => `10.4.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
const run = Date.now().toString(36)
const mail = (name: string) => `${name}-${run}@exemple.fr`

async function call(method: string, url: string, token?: string, payload?: unknown) {
  const res = await app.inject({
    method: method as 'GET',
    url,
    payload: payload as Record<string, unknown>,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    remoteAddress: nextIp(),
  })
  return { status: res.statusCode, body: res.body ? res.json() : null }
}

// « Commencez par vous » sans compte : le compte provisoire, puis son arbre avec une personne
async function provisionalTree(firstName: string) {
  const started = await call('POST', '/auth/provisional', undefined, { firstName })
  expect(started.status).toBe(201)
  const token = started.body.token as string
  const tree = await call('POST', '/trees', token, { name: `Famille ${firstName}`, slug: `famille-${firstName}-${run}`, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })
  expect(tree.status).toBe(201)
  const treeId = tree.body.tree.id as string
  expect((await call('POST', `/trees/${treeId}/persons`, token, { firstName, lastName: 'Martin' })).status).toBe(201)
  return { token, userId: started.body.user.id as string, treeId }
}

describe.skipIf(!TEST_DB)('compte provisoire, vraie base', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    process.env.OIDC_ISSUER = ISSUER
    process.env.OIDC_CLIENT_ID = 'parenthese'
    process.env.OIDC_CLIENT_SECRET = 'secret'
    process.env.OIDC_REDIRECT_URI = 'https://app.example.org/api/auth/oidc/callback'
    process.env.OIDC_PROVIDER_NAME = 'Google'
    ;({ env } = await import('../src/config/env.js'))
    ;({ prisma } = await import('../src/lib/prisma.js'))
    const { createApp } = await import('../src/app.js')
    app = createApp()
  })

  beforeEach(() => {
    env.ALLOW_REGISTRATION = true
    env.PASSWORD_LOGIN = true
  })

  afterAll(async () => {
    await app?.close()
  })

  it('un compte provisoire fait son arbre, sans email, avec une session de 30 jours', async () => {
    const options = await call('GET', '/auth/options')
    expect(options.body.provisional).toBe(true)
    expect(options.body.oidc).toEqual({ name: 'Google' })

    const { token, treeId } = await provisionalTree('lucie')
    const me = await call('GET', '/auth/me', token)
    expect(me.body.user).toMatchObject({ email: null, firstName: 'lucie', provisional: true })
    const until = new Date(me.body.user.provisionalUntil).getTime()
    expect(Math.round((until - Date.now()) / 86_400_000)).toBe(30)

    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(Math.round((payload.exp - payload.iat) / 86_400)).toBe(30)

    // Un seul arbre, celui qu'il gardera
    expect((await call('POST', '/trees', token, { name: 'Autre', slug: `autre-${run}`, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })).status).toBe(403)
    expect((await call('GET', `/trees/${treeId}/graph`, token)).status).toBe(200)
  })

  it('inscription fermée : pas de compte provisoire', async () => {
    env.ALLOW_REGISTRATION = false
    expect((await call('GET', '/auth/options')).body.provisional).toBe(false)
    expect((await call('POST', '/auth/provisional', undefined, {})).status).toBe(403)
  })

  it('« Gardez votre arbre » : même compte, même arbre, et l’ancienne session ne sert plus', async () => {
    const { token, userId, treeId } = await provisionalTree('paul')
    const kept = await call('POST', '/auth/keep', token, { email: mail('paul'), password: 'mot-de-passe-solide' })
    expect(kept.status).toBe(200)
    expect(kept.body.user).toMatchObject({ id: userId, email: mail('paul'), firstName: 'paul', provisional: false })
    expect((await call('GET', '/auth/me', token)).status).toBe(401)

    const fresh = kept.body.token as string
    expect((await call('GET', `/trees/${treeId}/graph`, fresh)).status).toBe(200)
    expect((await call('POST', '/auth/login', undefined, { email: mail('paul'), password: 'mot-de-passe-solide' })).status).toBe(200)
    // Une seconde fois : déjà gardé
    expect((await call('POST', '/auth/keep', fresh, { email: mail('paul-2'), password: 'mot-de-passe-solide' })).body.error).toBe('account_already_kept')
  })

  it('un email qui a déjà un compte est refusé, l’arbre reste provisoire', async () => {
    expect((await call('POST', '/auth/register', undefined, { email: mail('pris'), password: 'mot-de-passe-solide', firstName: 'Pris' })).status).toBe(201)
    const { token } = await provisionalTree('anne')
    const kept = await call('POST', '/auth/keep', token, { email: mail('pris'), password: 'mot-de-passe-solide' })
    expect(kept.status).toBe(409)
    expect(kept.body.error).toBe('email_already_exists')
    expect((await call('GET', '/auth/me', token)).body.user.provisional).toBe(true)
  })

  it('se connecter depuis l’arbre provisoire : l’arbre rejoint le compte retrouvé', async () => {
    const registered = await call('POST', '/auth/register', undefined, { email: mail('ancien'), password: 'mot-de-passe-solide', firstName: 'Ancien' })
    const { token, userId, treeId } = await provisionalTree('marc')

    const login = await call('POST', '/auth/login', token, { email: mail('ancien'), password: 'mot-de-passe-solide' })
    expect(login.status).toBe(200)
    const session = login.body.token as string
    expect((await call('GET', `/trees/${treeId}/graph`, session)).status).toBe(200)
    expect((await prisma.tree.findUnique({ where: { id: treeId }, select: { ownerUserId: true } }))?.ownerUserId).toBe(registered.body.user.id)
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull()
    expect((await call('GET', '/auth/me/last-tree', session)).body.lastTree.treeId).toBe(treeId)
  })

  it('se connecter depuis l’arbre provisoire : les arbres de la famille ouverts par leur lien suivent', async () => {
    const family = await provisionalTree('odile')
    const registered = await call('POST', '/auth/register', undefined, { email: mail('cousin'), password: 'mot-de-passe-solide', firstName: 'Cousin' })
    const { token } = await provisionalTree('paul')
    expect((await call('POST', `/trees/${family.treeId}/access/unlock`, token, { password: 'partage-demo-1' })).status).toBe(200)

    const login = await call('POST', '/auth/login', token, { email: mail('cousin'), password: 'mot-de-passe-solide' })
    expect(login.status).toBe(200)
    const shared = await prisma.userTreeAccess.findMany({ where: { userId: registered.body.user.id }, select: { treeId: true } })
    expect(shared.map((access) => access.treeId)).toContain(family.treeId)
  })

  describe('par le fournisseur (Google)', () => {
    let address = 0
    async function keepWithProvider(token: string, identity: { subject: string; email: string; emailVerified: boolean; firstName?: string | null }) {
      const remoteAddress = `10.8.0.${++address}`
      oidcMock.startAuthorization.mockImplementation(async (returnTo: string) => ({
        url: new URL(`${ISSUER}/o/oauth2/v2/auth?state=s`),
        pending: { state: 's', nonce: 'n', codeVerifier: 'v'.repeat(43), returnTo },
      }))
      oidcMock.finishAuthorization.mockResolvedValue({ issuer: ISSUER, firstName: null, ...identity })
      const ticket = await call('POST', '/auth/oidc/link', token)
      expect(ticket.status).toBe(200)
      const start = await app.inject({ method: 'GET', url: `/auth/oidc/start?link=${encodeURIComponent(ticket.body.ticket)}`, remoteAddress })
      const cookie = String(start.headers['set-cookie']).split(';')[0]
      const back = await app.inject({ method: 'GET', url: '/auth/oidc/callback?code=c&state=s', headers: { cookie }, remoteAddress })
      const fragment = new URLSearchParams(String(back.headers.location).split('#')[1] ?? '')
      if (!fragment.get('oidc')) return { error: fragment.get('oidc_error') }
      const exchanged = await call('POST', '/auth/oidc/exchange', undefined, { code: fragment.get('oidc') })
      return { token: exchanged.body.token as string, user: exchanged.body.user }
    }

    it('nouvelle adresse : le compte provisoire devient le compte, avec l’email et le prénom tapé', async () => {
      const { token, userId, treeId } = await provisionalTree('jeanne')
      const kept = await keepWithProvider(token, { subject: `g-jeanne-${run}`, email: mail('jeanne-g'), emailVerified: true, firstName: 'Jeannette' })
      expect(kept.user).toMatchObject({ id: userId, email: mail('jeanne-g'), firstName: 'jeanne' })
      expect((await call('GET', `/trees/${treeId}/graph`, kept.token)).status).toBe(200)
      expect((await prisma.userIdentity.findMany({ where: { userId } })).map((row) => row.issuer)).toEqual([ISSUER])
    })

    it('compte déjà relié à Google : l’arbre le rejoint', async () => {
      const subject = `g-hugo-${run}`
      const first = await provisionalTree('hugo')
      const owner = await keepWithProvider(first.token, { subject, email: mail('hugo-g'), emailVerified: true })
      const second = await provisionalTree('hugo2')
      const back = await keepWithProvider(second.token, { subject, email: mail('hugo-g'), emailVerified: true })
      expect(back.user?.id).toBe(owner.user.id)
      expect((await prisma.tree.findUnique({ where: { id: second.treeId }, select: { ownerUserId: true } }))?.ownerUserId).toBe(owner.user.id)
    })

    it('email d’un compte à mot de passe : refusé comme avant, l’arbre reste provisoire', async () => {
      expect((await call('POST', '/auth/register', undefined, { email: mail('mdp'), password: 'mot-de-passe-solide', firstName: 'Mdp' })).status).toBe(201)
      const { token } = await provisionalTree('rose')
      const result = await keepWithProvider(token, { subject: `g-rose-${run}`, email: mail('mdp'), emailVerified: true })
      expect(result.error).toBe('oidc_email_taken')
      expect((await call('GET', '/auth/me', token)).body.user.provisional).toBe(true)
    })
  })

  it('effacé avec ses arbres au bout de 30 jours, pas avant ; un compte gardé reste', async () => {
    const { purgeExpiredProvisionalAccounts } = await import('../src/lib/provisional-account.js')
    const old = await provisionalTree('vieux')
    const recent = await provisionalTree('recent')
    const keptOld = await provisionalTree('garde')
    await call('POST', '/auth/keep', keptOld.token, { email: mail('garde'), password: 'mot-de-passe-solide' })
    const longAgo = new Date(Date.now() - 31 * 86_400_000)
    await prisma.user.updateMany({ where: { id: { in: [old.userId, keptOld.userId] } }, data: { createdAt: longAgo } })

    const logger = { warn: vi.fn(), error: vi.fn() }
    expect(await purgeExpiredProvisionalAccounts(prisma, logger)).toBeGreaterThanOrEqual(1)
    expect(await prisma.user.findUnique({ where: { id: old.userId } })).toBeNull()
    expect(await prisma.tree.findUnique({ where: { id: old.treeId } })).toBeNull()
    expect(await prisma.user.findUnique({ where: { id: recent.userId } })).not.toBeNull()
    expect(await prisma.tree.findUnique({ where: { id: keptOld.treeId } })).not.toBeNull()
    expect(logger.error).not.toHaveBeenCalled()
  })
})
