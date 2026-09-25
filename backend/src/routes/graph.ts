import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { buildGraphPayload } from '../utils/graph-payload.js'

const treeIdParamSchema = z.object({
  id: z.string().min(1),
})

export const graphRoutes: FastifyPluginAsync = async (app) => {
  app.get('/trees/:id/graph', async (request, reply) => {
    const params = treeIdParamSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_tree_id' })
    }

    const treeId = params.data.id
    const actor = request.actor
    let rootPersonId: string | null = null

    if (!actor) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    if (actor.kind === 'tree_access') {
      if (actor.treeId !== treeId) {
        return reply.code(403).send({ error: 'forbidden' })
      }

      const tree = await app.prisma.tree.findFirst({
        where: {
          id: treeId,
          deletedAt: null,
        },
        select: {
          id: true,
          rootPersonId: true,
        },
      })

      if (!tree) {
        return reply.code(404).send({ error: 'tree_not_found' })
      }

      rootPersonId = tree.rootPersonId
    }

    if (actor.kind === 'user') {
      const membership = await app.prisma.treeMembership.findUnique({
        where: {
          treeId_userId: {
            treeId,
            userId: actor.userId,
          },
        },
        include: {
          tree: {
            select: {
              deletedAt: true,
              rootPersonId: true,
            },
          },
        },
      })

      if (membership && !membership.tree.deletedAt) {
        rootPersonId = membership.tree.rootPersonId
      } else {
        const shared = await app.prisma.userTreeAccess.findUnique({
          where: {
            treeId_userId: {
              treeId,
              userId: actor.userId,
            },
          },
          include: {
            tree: {
              select: {
                deletedAt: true,
                rootPersonId: true,
              },
            },
          },
        })

        if (!shared || shared.tree.deletedAt) {
          return reply.code(403).send({ error: 'forbidden' })
        }

        rootPersonId = shared.tree.rootPersonId
      }
    }

    const [persons, unions, links, medias, annotations] = await Promise.all([
      app.prisma.person.findMany({
        where: {
          treeId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      app.prisma.union.findMany({
        where: {
          treeId,
          deletedAt: null,
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      app.prisma.parentChildLink.findMany({
        where: {
          treeId,
          deletedAt: null,
        },
        orderBy: [{ parentPersonId: 'asc' }, { viaUnionId: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      app.prisma.mediaItem.findMany({
        where: {
          treeId,
          status: 'approved',
          deletedAt: null,
        },
        orderBy: [{ personId: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      app.prisma.annotation.findMany({
        where: {
          treeId,
          deletedAt: null,
        },
        orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
    ])

    const graph = buildGraphPayload(treeId, persons, unions, links, medias, annotations)

    return reply.send({
      treeId,
      rootPersonId,
      graph,
    })
  })
}
