import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tree: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    treeMembership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    treeSettings: {
      create: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    treeAccessPasswords: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userTreeAccess: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    union: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    parentChildLink: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    mediaItem: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    annotation: {
      findMany: vi.fn(),
    },
    contributionSession: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    contributionChange: {
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

vi.mock('../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}))

let createApp: () => FastifyInstance

function applyTestEnv(): void {
  process.env.NODE_ENV = 'test'
  process.env.PORT = '4000'
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/genealogy'
  process.env.JWT_SECRET = 'test-secret-with-sufficient-length'
  process.env.JWT_EXPIRES_IN = '7d'
  process.env.JWT_TREE_ACCESS_EXPIRES_IN = '24h'
  process.env.CORS_ORIGIN = 'http://localhost:5173'
}

async function createUserToken(app: FastifyInstance, userId = 'user-1'): Promise<string> {
  await app.ready()
  return (app as any).jwt.sign(
    {
      kind: 'user',
      sub: userId,
      jti: randomUUID(),
      userId,
      email: 'user@example.com',
    },
    {
      expiresIn: '1h',
    },
  )
}

beforeAll(async () => {
  applyTestEnv()
  const module = await import('../src/app.js')
  createApp = module.createApp
})

beforeEach(() => {
  vi.clearAllMocks()

  prismaMock.user.findUnique.mockResolvedValue(null)
  prismaMock.user.create.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })
  prismaMock.user.update.mockResolvedValue({ id: 'user-1' })

  prismaMock.tree.findFirst.mockResolvedValue({ id: 'tree-1', rootPersonId: null })
  prismaMock.tree.findUnique.mockResolvedValue({ id: 'tree-1', slug: 'tree-1', name: 'Tree' })
  prismaMock.tree.create.mockResolvedValue({ id: 'tree-1', slug: 'tree-1', name: 'Tree' })
  prismaMock.tree.updateMany.mockResolvedValue({ count: 1 })

  prismaMock.treeMembership.findMany.mockResolvedValue([])
  prismaMock.treeMembership.findUnique.mockResolvedValue({
    treeId: 'tree-1',
    userId: 'user-1',
    role: 'owner',
    tree: { deletedAt: null, rootPersonId: null },
  })

  prismaMock.treeAccessPasswords.findUnique.mockResolvedValue({
    treeId: 'tree-1',
    visitorHash: 'hash',
    contributorHash: 'hash',
    updatedAt: new Date('2026-02-11T10:00:00.000Z'),
    tree: { deletedAt: null },
  })
  prismaMock.userTreeAccess.findMany.mockResolvedValue([])
  prismaMock.userTreeAccess.findUnique.mockResolvedValue(null)
  prismaMock.userTreeAccess.upsert.mockResolvedValue({
    id: 'share-1',
    treeId: 'tree-1',
    userId: 'user-1',
    role: 'visitor',
  })
  prismaMock.userTreeAccess.updateMany.mockResolvedValue({ count: 0 })
  prismaMock.treeAccessPasswords.update.mockResolvedValue({ treeId: 'tree-1' })
  prismaMock.treeSettings.findUnique.mockResolvedValue({
    treeId: 'tree-1',
    memberContributionPolicy: 'pending',
    visitorPolicy: 'read_only',
    contributorPolicy: 'pending',
  })
  prismaMock.treeSettings.upsert.mockResolvedValue({
    treeId: 'tree-1',
    memberContributionPolicy: 'direct',
    visitorPolicy: 'read_only',
    contributorPolicy: 'pending',
  })

  prismaMock.person.findMany.mockResolvedValue([])
  prismaMock.person.findFirst.mockImplementation(async (args: any) => ({
    id: args?.where?.id || 'person-1',
    treeId: 'tree-1',
    deletedAt: null,
  }))
  prismaMock.person.create.mockResolvedValue({ id: 'person-1' })
  prismaMock.person.count.mockResolvedValue(2)
  prismaMock.person.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.union.findMany.mockResolvedValue([
    {
      id: 'union-1',
      partner1PersonId: 'person-1',
      partner2PersonId: null,
      treeId: 'tree-1',
      deletedAt: null,
    },
  ])
  prismaMock.union.findFirst.mockResolvedValue({
    id: 'union-1',
    partner1PersonId: 'person-1',
    partner2PersonId: null,
    treeId: 'tree-1',
    deletedAt: null,
  })
  prismaMock.union.create.mockResolvedValue({ id: 'union-1' })
  prismaMock.union.count.mockResolvedValue(1)
  prismaMock.union.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.parentChildLink.findMany.mockResolvedValue([])
  prismaMock.parentChildLink.findFirst.mockResolvedValue({
    id: 'link-1',
    treeId: 'tree-1',
    parentPersonId: 'person-1',
    childPersonId: 'person-2',
    viaUnionId: 'union-1',
    deletedAt: null,
  })
  prismaMock.parentChildLink.create.mockResolvedValue({ id: 'link-1' })
  prismaMock.parentChildLink.count.mockResolvedValue(1)
  prismaMock.parentChildLink.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.mediaItem.count.mockResolvedValue(0)
  prismaMock.mediaItem.create.mockResolvedValue({ id: 'media-1' })
  prismaMock.mediaItem.findMany.mockResolvedValue([])
  prismaMock.mediaItem.findFirst.mockResolvedValue({ id: 'media-1', filePath: 'tree-1/person-1/media-1.jpg', mimeType: 'image/jpeg' })
  prismaMock.mediaItem.update.mockResolvedValue({ id: 'media-1' })
  prismaMock.mediaItem.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.annotation.findMany.mockResolvedValue([])
  prismaMock.contributionSession.create.mockResolvedValue({
    id: 'session-1',
    treeId: 'tree-1',
    status: 'pending',
  })
  prismaMock.contributionSession.findMany.mockResolvedValue([])
  prismaMock.contributionSession.findFirst.mockResolvedValue({
    id: 'session-1',
    treeId: 'tree-1',
    status: 'pending',
    changes: [],
  })
  prismaMock.contributionSession.update.mockResolvedValue({
    id: 'session-1',
    treeId: 'tree-1',
    status: 'approved',
  })
  prismaMock.contributionSession.count.mockResolvedValue(0)
  prismaMock.contributionChange.create.mockResolvedValue({ id: 'change-1' })
  prismaMock.contributionChange.update.mockResolvedValue({ id: 'change-1' })
  prismaMock.auditLog.create.mockResolvedValue({ id: 'audit-1' })
  prismaMock.auditLog.findMany.mockResolvedValue([])
  prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock))
  prismaMock.$disconnect.mockResolvedValue(undefined)
})

describe('API security and authz', () => {
  it('rate-limits login endpoint', async () => {
    const app = createApp()

    for (let i = 0; i < 10; i += 1) {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'user@example.com', password: 'password123' },
      })
    }

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@example.com', password: 'password123' },
    })

    expect(response.statusCode).toBe(429)
    await app.close()
  })

  it('rate-limits register endpoint', async () => {
    const app = createApp()
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing-user' })

    for (let i = 0; i < 20; i += 1) {
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { email: `user${i}@example.com`, password: 'password123' },
      })
    }

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'overflow@example.com', password: 'password123' },
    })

    expect(response.statusCode).toBe(429)
    await app.close()
  }, 15000)

  it('revokes user token on logout', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(logoutResponse.statusCode).toBe(200)

    const treesResponse = await app.inject({
      method: 'GET',
      url: '/trees',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(treesResponse.statusCode).toBe(401)
    await app.close()
  })

  it('rejects stale tree access tokens after access secret changes', async () => {
    const app = createApp()
    await app.ready()

    prismaMock.treeAccessPasswords.findUnique.mockResolvedValue({
      treeId: 'tree-1',
      visitorHash: 'hash',
      contributorHash: 'hash',
      updatedAt: new Date('2026-02-12T10:00:00.000Z'),
      tree: { deletedAt: null },
    })

    const staleTreeAccessToken = (app as any).jwt.sign({
      kind: 'tree_access',
      sub: 'tree:tree-1:visitor',
      treeId: 'tree-1',
      role: 'visitor',
      accessVersion: new Date('2026-02-11T10:00:00.000Z').getTime(),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/trees/tree-1/graph',
      headers: { authorization: `Bearer ${staleTreeAccessToken}` },
    })

    expect(response.statusCode).toBe(401)
    await app.close()
  })

  it('does not update soft-deleted tree metadata', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.tree.updateMany.mockResolvedValue({ count: 0 })

    const response = await app.inject({
      method: 'PATCH',
      url: '/trees/tree-1',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Updated Name' },
    })

    expect(response.statusCode).toBe(404)
    await app.close()
  })

  it('validates rootPersonId belongs to tree before patching tree metadata', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.person.findFirst.mockResolvedValue(null)

    const response = await app.inject({
      method: 'PATCH',
      url: '/trees/tree-1',
      headers: { authorization: `Bearer ${token}` },
      payload: { rootPersonId: 'missing-person' },
    })

    expect(response.statusCode).toBe(400)
    await app.close()
  })

  it('allows owner to create persons, unions and links', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const personResponse = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons',
      headers: { authorization: `Bearer ${token}` },
      payload: { firstName: 'Alice', lastName: 'Martin' },
    })

    const unionResponse = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/unions',
      headers: { authorization: `Bearer ${token}` },
      payload: { partner1PersonId: 'person-1', partner2PersonId: 'person-2' },
    })

    const linkResponse = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/links',
      headers: { authorization: `Bearer ${token}` },
      payload: { parentPersonId: 'person-1', childPersonId: 'person-2', viaUnionId: 'union-1' },
    })

    expect(personResponse.statusCode).toBe(201)
    expect(unionResponse.statusCode).toBe(201)
    expect(linkResponse.statusCode).toBe(201)
    await app.close()
  })

  it('forbids member from creating persons', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.treeMembership.findUnique.mockResolvedValue({
      treeId: 'tree-1',
      userId: 'user-1',
      role: 'member',
      tree: { deletedAt: null, rootPersonId: null },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons',
      headers: { authorization: `Bearer ${token}` },
      payload: { firstName: 'Alice', lastName: 'Martin' },
    })

    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('allows owner to patch and soft-delete a person', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: '/trees/tree-1/persons/person-1',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        firstName: 'Alice',
        notes: 'Mise a jour',
      },
    })

    expect(patchResponse.statusCode).toBe(200)
    expect(prismaMock.person.updateMany).toHaveBeenCalled()

    prismaMock.union.updateMany.mockResolvedValueOnce({ count: 2 })
    prismaMock.parentChildLink.updateMany.mockResolvedValueOnce({ count: 3 })
    prismaMock.mediaItem.updateMany.mockResolvedValueOnce({ count: 1 })

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: '/trees/tree-1/persons/person-1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(deleteResponse.statusCode).toBe(200)
    expect(deleteResponse.json()).toEqual({
      ok: true,
      cascaded: {
        unions: 2,
        links: 3,
        medias: 1,
      },
    })
    await app.close()
  })

  it('allows owner to patch union and link entities', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const patchUnionResponse = await app.inject({
      method: 'PATCH',
      url: '/trees/tree-1/unions/union-1',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        unionType: 'mariage',
      },
    })

    expect(patchUnionResponse.statusCode).toBe(200)
    expect(prismaMock.union.updateMany).toHaveBeenCalled()

    const patchLinkResponse = await app.inject({
      method: 'PATCH',
      url: '/trees/tree-1/links/link-1',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        parentageType: 'adoption',
      },
    })

    expect(patchLinkResponse.statusCode).toBe(200)
    expect(prismaMock.parentChildLink.updateMany).toHaveBeenCalled()
    await app.close()
  })

  it('forbids member from patching person records', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.treeMembership.findUnique.mockResolvedValue({
      treeId: 'tree-1',
      userId: 'user-1',
      role: 'member',
      tree: { deletedAt: null, rootPersonId: null },
    })

    const response = await app.inject({
      method: 'PATCH',
      url: '/trees/tree-1/persons/person-1',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        firstName: 'Alice',
      },
    })

    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('allows contributor access token to submit a pending contribution session', async () => {
    const app = createApp()
    await app.ready()

    const contributorToken = (app as any).jwt.sign({
      kind: 'tree_access',
      sub: 'tree:tree-1:contributor',
      treeId: 'tree-1',
      role: 'contributor',
      accessVersion: new Date('2026-02-11T10:00:00.000Z').getTime(),
    })

    prismaMock.tree.findFirst.mockResolvedValue({
      id: 'tree-1',
      rootPersonId: null,
      settings: {
        contributorPolicy: 'pending',
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/contributions/sessions',
      headers: { authorization: `Bearer ${contributorToken}` },
      payload: {
        title: 'Ajout photo branche maternelle',
        changes: [
          {
            entityType: 'person',
            action: 'create',
            after: { firstName: 'Alice', lastName: 'Martin' },
          },
        ],
      },
    })

    expect(response.statusCode).toBe(201)
    expect(prismaMock.contributionSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'pending',
          mode: 'tree_access',
        }),
      }),
    )
    await app.close()
  })

  it('allows admin to list pending contribution sessions', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.contributionSession.findMany.mockResolvedValue([
      {
        id: 'session-1',
        treeId: 'tree-1',
        status: 'pending',
        title: 'Session pending',
        changes: [],
      },
    ])

    const response = await app.inject({
      method: 'GET',
      url: '/trees/tree-1/contributions/sessions?status=pending',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      sessions: [
        {
          id: 'session-1',
          treeId: 'tree-1',
          status: 'pending',
          title: 'Session pending',
          changes: [],
        },
      ],
    })
    await app.close()
  })

  it('forbids non-admin user from listing contribution sessions', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.treeMembership.findUnique.mockResolvedValue({
      treeId: 'tree-1',
      userId: 'user-1',
      role: 'member',
      tree: { deletedAt: null, rootPersonId: null },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/trees/tree-1/contributions/sessions',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('allows admin to review a contribution session', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    prismaMock.contributionSession.findFirst.mockResolvedValue({
      id: 'session-1',
      treeId: 'tree-1',
      status: 'pending',
      changes: [
        {
          id: 'change-1',
          entityType: 'person',
          action: 'create',
          entityId: null,
          beforeJson: null,
          afterJson: { firstName: 'Alice', lastName: 'Martin' },
          conflictState: 'none',
        },
      ],
    })

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/contributions/sessions/session-1/review',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        decision: 'approved',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.contributionSession.update).toHaveBeenCalled()
    expect(prismaMock.contributionChange.update).toHaveBeenCalled()
    await app.close()
  })

  it('allows owner to upload media below image limit', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons/person-1/media',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'photo',
        fileName: 'portrait.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 5,
        dataBase64: Buffer.from('hello').toString('base64'),
        caption: 'Portrait famille',
      },
    })

    expect(response.statusCode).toBe(201)
    await app.close()
  })

  it('rejects image upload above 5MB', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const tooBig = Buffer.alloc((5 * 1024 * 1024) + 1, 1)

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons/person-1/media',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'photo',
        fileName: 'big.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: tooBig.length,
        dataBase64: tooBig.toString('base64'),
      },
    })

    expect(response.statusCode).toBe(400)
    await app.close()
  })

  it('forbids non-admin from uploading media', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.treeMembership.findUnique.mockResolvedValue({
      treeId: 'tree-1',
      userId: 'user-1',
      role: 'member',
      tree: { deletedAt: null, rootPersonId: null },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons/person-1/media',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'photo',
        fileName: 'portrait.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 5,
        dataBase64: Buffer.from('hello').toString('base64'),
      },
    })

    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('allows owner to upload citation without file payload', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons/person-1/media',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'citation',
        caption: 'Le passe guide l avenir',
        source: 'Journal familial',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(prismaMock.mediaItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'citation',
          mimeType: 'text/plain',
          caption: 'Le passe guide l avenir',
          source: 'Journal familial',
        }),
      }),
    )
    await app.close()
  })

  it('allows owner to upload geojson media', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    const geojsonText = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.35, 48.85] },
          properties: { label: 'Paris' },
        },
      ],
    })

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons/person-1/media',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'geojson',
        fileName: 'migration.geojson',
        mimeType: 'application/geo+json',
        sizeBytes: Buffer.byteLength(geojsonText),
        dataBase64: Buffer.from(geojsonText).toString('base64'),
        caption: 'Migration',
      },
    })

    expect(response.statusCode).toBe(201)
    await app.close()
  })

  it('rejects mismatched mime type for gpx media', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    const fakePayload = '<gpx version=\"1.1\"></gpx>'

    const response = await app.inject({
      method: 'POST',
      url: '/trees/tree-1/persons/person-1/media',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        type: 'gpx',
        fileName: 'trace.gpx',
        mimeType: 'image/png',
        sizeBytes: Buffer.byteLength(fakePayload),
        dataBase64: Buffer.from(fakePayload).toString('base64'),
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toBe('invalid_media_mime_type')
    await app.close()
  })

  it('allows owner to read tree stats', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    prismaMock.mediaItem.count.mockResolvedValue(3)
    prismaMock.contributionSession.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(9)

    const response = await app.inject({
      method: 'GET',
      url: '/trees/tree-1/stats',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      stats: {
        persons: 2,
        unions: 1,
        filiations: 1,
        medias: 3,
        pendingContributions: 4,
        totalContributions: 9,
      },
    })
    await app.close()
  })

  it('forbids non-admin from reading tree stats', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.treeMembership.findUnique.mockResolvedValue({
      treeId: 'tree-1',
      userId: 'user-1',
      role: 'member',
      tree: { deletedAt: null, rootPersonId: null },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/trees/tree-1/stats',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(403)
    await app.close()
  })

  it('allows owner to update tree settings policy', async () => {
    const app = createApp()
    const token = await createUserToken(app)

    const response = await app.inject({
      method: 'PATCH',
      url: '/trees/tree-1/settings',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        memberContributionPolicy: 'direct',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(prismaMock.treeSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { treeId: 'tree-1' },
        update: expect.objectContaining({
          memberContributionPolicy: 'direct',
        }),
      }),
    )
    expect(prismaMock.auditLog.create).toHaveBeenCalled()
    await app.close()
  })

  it('lists audit logs for admin with pagination cursor', async () => {
    const app = createApp()
    const token = await createUserToken(app)
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: 'audit-2',
        treeId: 'tree-1',
        actorType: 'user',
        actorId: 'user-1',
        action: 'tree_settings_updated',
        entityType: 'tree_settings',
        entityId: 'tree-1',
        payloadJson: { memberContributionPolicy: 'direct' },
        createdAt: new Date('2026-02-11T12:00:00.000Z'),
      },
    ])

    const response = await app.inject({
      method: 'GET',
      url: '/trees/tree-1/audit?limit=20&offset=0',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      logs: [
        {
          id: 'audit-2',
          treeId: 'tree-1',
          actorType: 'user',
          actorId: 'user-1',
          action: 'tree_settings_updated',
          entityType: 'tree_settings',
          entityId: 'tree-1',
          payloadJson: { memberContributionPolicy: 'direct' },
          createdAt: '2026-02-11T12:00:00.000Z',
        },
      ],
      nextOffset: null,
    })
    await app.close()
  })
})
