import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import type { MembershipRole } from '../types/auth.js'

const treeIdParamSchema = z.object({
  id: z.string().min(1),
})

const annotationParamsSchema = z.object({
  id: z.string().min(1),
  annotationId: z.string().min(1),
})

const createAnnotationSchema = z.object({
  type: z.enum(['drawing', 'sticker', 'text', 'photo']),
  x: z.number(),
  y: z.number(),
  content: z.string().min(1).max(50000),
  style: z.record(z.string(), z.unknown()).optional(),
  zIndex: z.number().int().optional(),
})

const patchAnnotationSchema = z
  .object({
    x: z.number().optional(),
    y: z.number().optional(),
    content: z.string().min(1).max(50000).optional(),
    style: z.record(z.string(), z.unknown()).optional(),
    zIndex: z.number().int().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at_least_one_field_required',
  })

const batchAnnotationSchema = z.object({
  create: z.array(createAnnotationSchema).optional().default([]),
  update: z.array(z.object({
    id: z.string().min(1),
    x: z.number().optional(),
    y: z.number().optional(),
    content: z.string().min(1).max(50000).optional(),
    style: z.record(z.string(), z.unknown()).optional(),
    zIndex: z.number().int().optional(),
  })).optional().default([]),
  delete: z.array(z.string().min(1)).optional().default([]),
})

function requireUser(request: FastifyRequest, reply: FastifyReply): { userId: string; email: string } | null {
  if (!request.actor || request.actor.kind !== 'user') {
    reply.code(401).send({ error: 'authentication_required' })
    return null
  }

  return {
    userId: request.actor.userId,
    email: request.actor.email,
  }
}

function hasAdminRight(role: MembershipRole): boolean {
  return role === 'owner' || role === 'admin'
}

async function getAdminMembership(app: FastifyInstance, userId: string, treeId: string) {
  const membership = await app.prisma.treeMembership.findUnique({
    where: {
      treeId_userId: { treeId, userId },
    },
    include: {
      tree: {
        select: { deletedAt: true },
      },
    },
  })

  return membership
}

function hasActiveAdminMembership(membership: Awaited<ReturnType<typeof getAdminMembership>>): boolean {
  return Boolean(membership && !membership.tree.deletedAt && hasAdminRight(membership.role))
}

export const annotationRoutes: FastifyPluginAsync = async (app) => {
  // CREATE annotation
  app.post('/trees/:id/annotations', async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return

    const params = treeIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_tree_id' })

    const payload = createAnnotationSchema.safeParse(request.body)
    if (!payload.success) return reply.code(400).send({ error: 'invalid_payload', details: payload.error.flatten() })

    const membership = await getAdminMembership(app, user.userId, params.data.id)
    if (!hasActiveAdminMembership(membership)) return reply.code(403).send({ error: 'forbidden' })

    const annotation = await app.prisma.annotation.create({
      data: {
        treeId: params.data.id,
        type: payload.data.type,
        x: payload.data.x,
        y: payload.data.y,
        content: payload.data.content,
        style: (payload.data.style ?? {}) as Prisma.InputJsonValue,
        zIndex: payload.data.zIndex ?? 0,
        createdBy: user.userId,
      },
    })

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        actorType: 'user',
        actorId: user.userId,
        action: 'annotation_created',
        entityType: 'annotation',
        entityId: annotation.id,
        payloadJson: { type: annotation.type },
      },
    })

    return reply.code(201).send({ annotation })
  })

  // LIST annotations
  app.get('/trees/:id/annotations', async (request, reply) => {
    const params = treeIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_tree_id' })

    if (!request.actor) return reply.code(401).send({ error: 'authentication_required' })

    const annotations = await app.prisma.annotation.findMany({
      where: {
        treeId: params.data.id,
        deletedAt: null,
      },
      orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })

    return reply.send({ annotations })
  })

  // UPDATE annotation
  app.patch('/trees/:id/annotations/:annotationId', async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return

    const params = annotationParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const payload = patchAnnotationSchema.safeParse(request.body)
    if (!payload.success) return reply.code(400).send({ error: 'invalid_payload', details: payload.error.flatten() })

    const membership = await getAdminMembership(app, user.userId, params.data.id)
    if (!hasActiveAdminMembership(membership)) return reply.code(403).send({ error: 'forbidden' })

    const data: Record<string, unknown> = {}
    if (payload.data.x !== undefined) data.x = payload.data.x
    if (payload.data.y !== undefined) data.y = payload.data.y
    if (payload.data.content !== undefined) data.content = payload.data.content
    if (payload.data.style !== undefined) data.style = payload.data.style
    if (payload.data.zIndex !== undefined) data.zIndex = payload.data.zIndex

    const updated = await app.prisma.annotation.updateMany({
      where: {
        id: params.data.annotationId,
        treeId: params.data.id,
        deletedAt: null,
      },
      data,
    })

    if (updated.count === 0) return reply.code(404).send({ error: 'annotation_not_found' })

    const annotation = await app.prisma.annotation.findUnique({
      where: { id: params.data.annotationId },
    })

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        actorType: 'user',
        actorId: user.userId,
        action: 'annotation_updated',
        entityType: 'annotation',
        entityId: params.data.annotationId,
        payloadJson: { changedFields: Object.keys(payload.data) },
      },
    })

    return reply.send({ annotation })
  })

  // DELETE annotation (soft delete)
  app.delete('/trees/:id/annotations/:annotationId', async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return

    const params = annotationParamsSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' })

    const membership = await getAdminMembership(app, user.userId, params.data.id)
    if (!hasActiveAdminMembership(membership)) return reply.code(403).send({ error: 'forbidden' })

    const deleted = await app.prisma.annotation.updateMany({
      where: {
        id: params.data.annotationId,
        treeId: params.data.id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    if (deleted.count === 0) return reply.code(404).send({ error: 'annotation_not_found' })

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        actorType: 'user',
        actorId: user.userId,
        action: 'annotation_deleted',
        entityType: 'annotation',
        entityId: params.data.annotationId,
      },
    })

    return reply.send({ ok: true })
  })

  // BATCH annotations (create + update + delete in one request)
  app.post('/trees/:id/annotations/batch', async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return

    const params = treeIdParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_tree_id' })

    const payload = batchAnnotationSchema.safeParse(request.body)
    if (!payload.success) return reply.code(400).send({ error: 'invalid_payload', details: payload.error.flatten() })

    const membership = await getAdminMembership(app, user.userId, params.data.id)
    if (!hasActiveAdminMembership(membership)) return reply.code(403).send({ error: 'forbidden' })

    const treeId = params.data.id
    const results = { created: 0, updated: 0, deleted: 0 }

    // Creates
    for (const item of payload.data.create) {
      await app.prisma.annotation.create({
        data: {
          treeId,
          type: item.type,
          x: item.x,
          y: item.y,
          content: item.content,
          style: (item.style ?? {}) as Prisma.InputJsonValue,
          zIndex: item.zIndex ?? 0,
          createdBy: user.userId,
        },
      })
      results.created++
    }

    // Updates
    for (const item of payload.data.update) {
      const data: Record<string, unknown> = {}
      if (item.x !== undefined) data.x = item.x
      if (item.y !== undefined) data.y = item.y
      if (item.content !== undefined) data.content = item.content
      if (item.style !== undefined) data.style = item.style
      if (item.zIndex !== undefined) data.zIndex = item.zIndex

      if (Object.keys(data).length > 0) {
        const updated = await app.prisma.annotation.updateMany({
          where: { id: item.id, treeId, deletedAt: null },
          data,
        })
        if (updated.count > 0) results.updated++
      }
    }

    // Deletes
    if (payload.data.delete.length > 0) {
      const deleted = await app.prisma.annotation.updateMany({
        where: {
          id: { in: payload.data.delete },
          treeId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      })
      results.deleted = deleted.count
    }

    await app.prisma.auditLog.create({
      data: {
        treeId,
        actorType: 'user',
        actorId: user.userId,
        action: 'annotations_batch',
        entityType: 'annotation',
        entityId: treeId,
        payloadJson: results,
      },
    })

    return reply.send({ ok: true, ...results })
  })
}
