import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// « vers 1920 » et « mars 1950 » tapés dans la fiche (cas limites du 20/11/2026), sur une vraie base.
// Lancé seulement avec TEST_DATABASE_URL (base jetable, migrée) :
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/dates-approchees.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
let env: { ALLOW_REGISTRATION: boolean }
let ip = 0
const nextIp = () => `10.3.${Math.floor(++ip / 250)}.${ip % 250 + 1}`
const run = Date.now().toString(36)

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

describe.skipIf(!TEST_DB)('dates approchées tapées dans la fiche (vraie base)', () => {
  let token: string
  let treeId: string

  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    ;({ env } = await import('../src/config/env.js'))
    const { createApp } = await import('../src/app.js')
    app = createApp()
    env.ALLOW_REGISTRATION = true
    const account = await call('POST', '/auth/register', undefined, { email: `dates-${run}@exemple.fr`, password: 'mot-de-passe-solide', firstName: 'Lucie' })
    expect(account.status).toBe(201)
    token = account.body.token
    const tree = await call('POST', '/trees', token, { name: 'Dates', slug: `dates-${run}`, visitorPassword: 'partage-dates-1', contributorPassword: 'partage-dates-1' })
    expect(tree.status).toBe(201)
    treeId = tree.body.tree?.id ?? tree.body.id
  })

  afterAll(async () => {
    await app?.close()
  })

  const graphPerson = async (id: string) => {
    const graph = await call('GET', `/trees/${treeId}/graph`, token)
    return graph.body.graph.persons.find((p: { id: string }) => p.id === id)
  }

  it('crée, corrige et exporte « vers 1920 » et « mars 1950 »', async () => {
    const created = await call('POST', `/trees/${treeId}/persons`, token, {
      firstName: 'Rose', lastName: 'Martin',
      birthDate: '1920-01-01', birthDatePrecision: 'about',
      deathDate: '1990-03-01', deathDatePrecision: 'month',
    })
    expect(created.status).toBe(201)
    const id = created.body.person.id
    expect(await graphPerson(id)).toMatchObject({ birthDatePrecision: 'about', deathDatePrecision: 'month' })

    const gedcom = String((await call('GET', `/trees/${treeId}/export/gedcom`, token)).body)
    const rose = gedcom.split(/\r?\n(?=0 )/).find((block) => block.includes('Rose /Martin/'))!
    expect(rose).toMatch(/1 BIRT\r?\n2 DATE ABT 1920/)
    expect(rose).toMatch(/1 DEAT\r?\n2 DATE MAR 1990/)

    // La date redevient exacte : la précision part
    expect((await call('PATCH', `/trees/${treeId}/persons/${id}`, token, { birthDate: '1921-06-12', birthDatePrecision: null })).status).toBe(200)
    expect(await graphPerson(id)).toMatchObject({ birthDate: '1921-06-12', birthDatePrecision: null, deathDatePrecision: 'month' })

    // Précision refusée si ce n'est ni « about » ni « month »
    expect((await call('PATCH', `/trees/${treeId}/persons/${id}`, token, { birthDatePrecision: 'between' })).status).toBe(400)
  })

  it('une proposition de la famille garde la précision', async () => {
    const unlock = await call('POST', `/trees/${treeId}/access/unlock`, undefined, { password: 'partage-dates-1' })
    expect(unlock.status).toBe(200)
    const sent = await call('POST', `/trees/${treeId}/contributions/sessions`, unlock.body.token, {
      title: 'Proposition de la famille',
      submittedByLabel: 'Cousin Paul',
      changes: [{ entityType: 'person', action: 'create', after: { firstName: 'Lucien', lastName: 'Martin', birthDate: '1898-01-01', birthDatePrecision: 'about' } }],
    })
    expect(sent.status).toBe(201)
    const review = await call('POST', `/trees/${treeId}/contributions/sessions/${sent.body.session.id}/review`, token, { decision: 'approved' })
    expect(review.status).toBe(200)
    const graph = await call('GET', `/trees/${treeId}/graph`, token)
    expect(graph.body.graph.persons.find((p: { firstName: string }) => p.firstName === 'Lucien')).toMatchObject({ birthDatePrecision: 'about' })
  })
})
