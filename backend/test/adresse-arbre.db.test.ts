import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// L'adresse d'un arbre prend un suffixe quand elle est déjà prise (#251), sur une vraie base :
//   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/genealogy_test npx vitest run test/adresse-arbre.db.test.ts
const TEST_DB = process.env.TEST_DATABASE_URL

let app: FastifyInstance
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
  return { status: res.statusCode, body: res.body ? res.json() : null }
}

async function account(name: string) {
  const res = await call('POST', '/auth/register', undefined, { email: `${name}-${run}@exemple.fr`, password: 'mot-de-passe-solide', firstName: name })
  expect(res.status).toBe(201)
  return res.body.token as string
}

const createTree = (token: string, slug: string) =>
  call('POST', '/trees', token, { name: 'Famille Martin', slug, visitorPassword: 'partage-demo-1', contributorPassword: 'partage-demo-1' })

describe.skipIf(!TEST_DB)('adresse d’un arbre, vraie base', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = TEST_DB
    process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
    process.env.CORS_ORIGIN = 'http://localhost:5173'
    const { env } = await import('../src/config/env.js')
    const { createApp } = await import('../src/app.js')
    app = createApp()
    env.ALLOW_REGISTRATION = true
  })

  afterAll(async () => {
    await app?.close()
  })

  it('deux familles Martin reçoivent deux adresses, sans erreur', async () => {
    const base = `famille-martin-${run}`
    const first = await createTree(await account('lucie'), base)
    const second = await createTree(await account('paul'), base)
    const third = await createTree(await account('anne'), base)
    expect([first.status, second.status, third.status]).toEqual([201, 201, 201])
    expect(first.body.tree.slug).toBe(base)
    expect(second.body.tree.slug).toBe(`${base}-2`)
    expect(third.body.tree.slug).toBe(`${base}-3`)
    expect((await call('GET', `/arbre/${base}-2`)).status).toBe(200)
  })

  it('un renommage vers une adresse prise prend aussi un suffixe, et garde la sienne sinon', async () => {
    const taken = `famille-durand-${run}`
    expect((await createTree(await account('marc'), taken)).status).toBe(201)
    const token = await account('jeanne')
    const mine = await createTree(token, `famille-petit-${run}`)
    const id = mine.body.tree.id as string

    const renamed = await call('PATCH', `/trees/${id}`, token, { name: 'Famille Durand', slug: taken })
    expect(renamed.status).toBe(200)
    expect(renamed.body.tree.slug).toBe(`${taken}-2`)

    // Réenregistrer sa propre adresse ne la change pas
    const same = await call('PATCH', `/trees/${id}`, token, { slug: `${taken}-2` })
    expect(same.body.tree.slug).toBe(`${taken}-2`)
  })
})
