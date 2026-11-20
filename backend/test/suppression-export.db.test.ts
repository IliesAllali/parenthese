import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Supprimer un parent et exporter en GEDCOM, sur une vraie base (cas limites du 20/11/2026).
// Lancé seulement avec TEST_DATABASE_URL (base jetable, migrée) :
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/suppression-export.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
let env: { ALLOW_REGISTRATION: boolean }
let ip = 0
const nextIp = () => `10.2.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
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
  let body: any = null
  try { body = res.body ? res.json() : null } catch { body = res.body }
  return { status: res.statusCode, body }
}

async function account(name: string) {
  const res = await call('POST', '/auth/register', undefined, { email: mail(name), password: 'mot-de-passe-solide', firstName: name })
  expect(res.status).toBe(201)
  return { token: res.body.token as string, id: res.body.user.id as string, email: mail(name) }
}

const SHARE = 'partage-famille-1'

async function newTree(token: string, name: string) {
  const res = await call('POST', '/trees', token, { name, slug: `${name.toLowerCase().replace(/[^a-z]+/g, '-')}-${run}`, visitorPassword: SHARE, contributorPassword: SHARE })
  expect(res.status).toBe(201)
  return (res.body.tree?.id ?? res.body.id) as string
}

async function person(token: string, treeId: string, firstName: string, lastName = 'Martin') {
  const res = await call('POST', `/trees/${treeId}/persons`, token, { firstName, lastName })
  expect(res.status).toBe(201)
  return res.body.person.id as string
}

async function graph(token: string, treeId: string) {
  const res = await call('GET', `/trees/${treeId}/graph`, token)
  expect(res.status).toBe(200)
  return res.body.graph as { persons: Array<{ id: string; firstName: string }>; filiations: Array<{ parentPersonId: string; childPersonId: string; viaUnionId: string | null }> }
}

// Les FAM d'un export : { parents, children } par prénom
function families(gedcom: string) {
  const names = new Map<string, string>()
  for (const block of gedcom.split(/\r?\n(?=0 )/)) {
    const head = block.match(/^0 @(I[^@]+)@ INDI/)
    if (head) names.set(head[1], block.match(/1 NAME ([^/\r\n]*)/)?.[1]?.trim() ?? '')
  }
  return gedcom.split(/\r?\n(?=0 )/).filter((block) => /^0 @F[^@]+@ FAM/.test(block)).map((block) => ({
    parents: [...block.matchAll(/1 (?:HUSB|WIFE) @([^@]+)@/g)].map((m) => names.get(m[1])).sort(),
    children: [...block.matchAll(/1 CHIL @([^@]+)@/g)].map((m) => names.get(m[1])).sort(),
  }))
}

describe.skipIf(!TEST_DB)('supprimer un parent, exporter en GEDCOM (vraie base)', () => {
  let owner: { token: string; id: string; email: string }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    ;({ env } = await import('../src/config/env.js'))
    const { createApp } = await import('../src/app.js')
    app = createApp()
    env.ALLOW_REGISTRATION = true
    owner = await account('proprio')
  })

  afterAll(async () => {
    await app?.close()
  })

  it('supprimer la mère laisse les enfants à leur père (arbre importé, liens « via l’union »)', async () => {
    const treeId = await newTree(owner.token, 'Import Martin')
    const content = [
      '0 HEAD', '1 CHAR UTF-8',
      '0 @I1@ INDI', '1 NAME Pierre /Martin/', '1 SEX M', '1 FAMS @F1@',
      '0 @I2@ INDI', '1 NAME Marie /Durand/', '1 SEX F', '1 FAMS @F1@',
      '0 @I3@ INDI', '1 NAME Jean /Martin/', '1 FAMC @F1@',
      '0 @I4@ INDI', '1 NAME Luc /Martin/', '1 FAMC @F1@',
      '0 @F1@ FAM', '1 HUSB @I1@', '1 WIFE @I2@', '1 CHIL @I3@', '1 CHIL @I4@',
      '0 TRLR',
    ].join('\n')
    expect((await call('POST', `/trees/${treeId}/import/gedcom`, owner.token, { content })).status).toBe(200)

    const before = await graph(owner.token, treeId)
    const id = (name: string) => before.persons.find((p) => p.firstName === name)!.id
    expect(before.filiations.filter((f) => f.viaUnionId)).toHaveLength(4)

    expect((await call('DELETE', `/trees/${treeId}/persons/${id('Marie')}`, owner.token)).status).toBe(200)

    const after = await graph(owner.token, treeId)
    const parentsOf = (name: string) => after.filiations.filter((f) => f.childPersonId === id(name)).map((f) => f.parentPersonId)
    expect(parentsOf('Jean')).toEqual([id('Pierre')])
    expect(parentsOf('Luc')).toEqual([id('Pierre')])
    // L'union n'existe plus : le lien du père ne pointe plus vers elle
    expect(after.filiations.every((f) => f.viaUnionId === null)).toBe(true)
  })

  it('exporte un parent seul et un enfant de remariage sans inventer de parent', async () => {
    const treeId = await newTree(owner.token, 'Export Martin')
    const [mere, zoe, pere, belleMere, paul, lea] = [
      await person(owner.token, treeId, 'Sophie'),
      await person(owner.token, treeId, 'Zoe'),
      await person(owner.token, treeId, 'Henri'),
      await person(owner.token, treeId, 'Claire'),
      await person(owner.token, treeId, 'Paul'),
      await person(owner.token, treeId, 'Lea'),
    ]
    const link = (parentPersonId: string, childPersonId: string) => call('POST', `/trees/${treeId}/links`, owner.token, { parentPersonId, childPersonId })
    // Mère seule, sans union : le lien partait du fichier
    expect((await link(mere, zoe)).status).toBe(201)
    // Henri a une union avec Claire, mais Paul n'est l'enfant que d'Henri (mère inconnue)
    expect((await call('POST', `/trees/${treeId}/unions`, owner.token, { partner1PersonId: pere, partner2PersonId: belleMere })).status).toBe(201)
    expect((await link(pere, paul)).status).toBe(201)
    // Léa est l'enfant du couple
    expect((await link(pere, lea)).status).toBe(201)
    expect((await link(belleMere, lea)).status).toBe(201)

    const res = await call('GET', `/trees/${treeId}/export/gedcom`, owner.token)
    expect(res.status).toBe(200)
    const fams = families(String(res.body))
    expect(fams).toContainEqual({ parents: ['Sophie'], children: ['Zoe'] })
    expect(fams).toContainEqual({ parents: ['Henri'], children: ['Paul'] })
    expect(fams).toContainEqual({ parents: ['Claire', 'Henri'], children: ['Lea'] })
    // Paul n'est jamais rangé sous le couple Henri et Claire
    expect(fams.filter((f) => f.children.includes('Paul'))).toHaveLength(1)
  })

  it("l'export est réservé à ceux qui gèrent l'arbre", async () => {
    const treeId = await newTree(owner.token, 'Export reserve')
    await person(owner.token, treeId, 'Anne')

    // Famille par le mot de passe de partage : jeton d'arbre, puis compte qui a rattaché l'accès
    const unlock = await call('POST', `/trees/${treeId}/access/unlock`, undefined, { password: SHARE })
    expect(unlock.status).toBe(200)
    expect((await call('GET', `/trees/${treeId}/export/gedcom`, unlock.body.token)).status).toBe(403)

    const cousin = await account('cousin')
    expect((await call('POST', `/trees/${treeId}/access/unlock`, cousin.token, { password: SHARE })).status).toBe(200)
    expect((await call('GET', `/trees/${treeId}/export/gedcom`, cousin.token)).status).toBe(403)

    // Co-gestionnaire : oui
    const co = await account('cogerant')
    const invitation = await call('POST', `/trees/${treeId}/invitations`, owner.token, { email: co.email })
    expect((await call('POST', `/invitations/${invitation.body.token}/accept`, co.token)).status).toBe(200)
    expect((await call('GET', `/trees/${treeId}/export/gedcom`, co.token)).status).toBe(200)
    expect((await call('GET', `/trees/${treeId}/export/gedcom`, owner.token)).status).toBe(200)
  })
})
