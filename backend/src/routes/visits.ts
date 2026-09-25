import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { VISIT_RETENTION_DAYS } from '../lib/tree-visits.js'

const treeIdParamSchema = z.object({
  id: z.string().min(1),
})

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_LIMIT = 60

function summarize(visits: { visitorKey: string }[]) {
  return { visits: visits.length, visitors: new Set(visits.map(v => v.visitorKey)).size }
}

// Journal des visites, réservé aux administrateurs de l'arbre (propriétaire compris).
// Les visites de l'administrateur qui consulte sont marquées isYou et hors des totaux.
export const visitRoutes: FastifyPluginAsync = async (app) => {
  app.get('/trees/:id/visits', async (request, reply) => {
    const actor = request.actor
    if (!actor || actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const params = treeIdParamSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_tree_id' })
    }
    const treeId = params.data.id

    const membership = await app.prisma.treeMembership.findUnique({
      where: { treeId_userId: { treeId, userId: actor.userId } },
      include: { tree: { select: { deletedAt: true } } },
    })
    if (!membership || membership.tree.deletedAt || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const now = Date.now()
    await app.prisma.treeVisit.deleteMany({
      where: { treeId, createdAt: { lt: new Date(now - VISIT_RETENTION_DAYS * DAY_MS) } },
    })

    const since30 = new Date(now - 30 * DAY_MS)
    const [last30, recent] = await Promise.all([
      app.prisma.treeVisit.findMany({
        // OR explicite : un NOT sur userId écarterait aussi les visites anonymes (userId NULL)
        where: { treeId, createdAt: { gte: since30 }, OR: [{ userId: null }, { userId: { not: actor.userId } }] },
        select: { visitorKey: true, createdAt: true },
      }),
      app.prisma.treeVisit.findMany({
        where: { treeId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: RECENT_LIMIT,
        select: {
          id: true,
          createdAt: true,
          accessKind: true,
          visitorName: true,
          device: true,
          userId: true,
          user: { select: { email: true } },
        },
      }),
    ])

    const since7 = now - 7 * DAY_MS
    return reply.send({
      summary: {
        last7: summarize(last30.filter(v => v.createdAt.getTime() >= since7)),
        last30: summarize(last30),
      },
      recent: recent.map(v => ({
        id: v.id,
        createdAt: v.createdAt,
        accessKind: v.accessKind,
        name: v.visitorName,
        email: v.user?.email ?? null,
        device: v.device,
        isYou: v.userId === actor.userId,
      })),
    })
  })
}
