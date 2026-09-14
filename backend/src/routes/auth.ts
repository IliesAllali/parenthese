import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { env } from '../config/env.js'
import { hashPassword, verifyPassword } from '../lib/auth.js'
import { revokeUserToken } from '../lib/token-revocation.js'
import type { AnyJwtPayload } from '../types/auth.js'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

const updateLastTreeSchema = z.object({
  treeId: z.string().min(1),
  accessMode: z.enum(['member', 'share']),
})

async function resolveAccessibleLastTree(
  app: FastifyInstance,
  userId: string,
  treeId: string,
  accessMode: 'member' | 'share',
): Promise<{ role: string } | null> {
  if (accessMode === 'member') {
    const membership = await app.prisma.treeMembership.findUnique({
      where: {
        treeId_userId: {
          treeId,
          userId,
        },
      },
      include: {
        tree: {
          select: {
            deletedAt: true,
          },
        },
      },
    })

    if (!membership || membership.tree.deletedAt) {
      return null
    }

    return { role: membership.role }
  }

  const shared = await app.prisma.userTreeAccess.findUnique({
    where: {
      treeId_userId: {
        treeId,
        userId,
      },
    },
    include: {
      tree: {
        select: {
          deletedAt: true,
        },
      },
    },
  })

  if (!shared || shared.tree.deletedAt) {
    return null
  }

  return { role: shared.role }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parsed = credentialsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() })
      }

      const email = parsed.data.email.trim().toLowerCase()
      const existing = await app.prisma.user.findUnique({ where: { email } })
      if (existing) {
        return reply.code(409).send({ error: 'email_already_exists' })
      }

      const passwordHash = await hashPassword(parsed.data.password)
      const user = await app.prisma.user.create({
        data: {
          email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
        },
      })

      const token = app.jwt.sign(
        {
          kind: 'user',
          sub: user.id,
          jti: randomUUID(),
          userId: user.id,
          email: user.email,
        },
        { expiresIn: env.JWT_EXPIRES_IN },
      )

      return reply.code(201).send({ token, user })
    },
  )

  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parsed = credentialsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() })
      }

      const email = parsed.data.email.trim().toLowerCase()
      const user = await app.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      })

      if (!user) {
        return reply.code(401).send({ error: 'invalid_credentials' })
      }

      const isValid = await verifyPassword(parsed.data.password, user.passwordHash)
      if (!isValid) {
        return reply.code(401).send({ error: 'invalid_credentials' })
      }

      const token = app.jwt.sign(
        {
          kind: 'user',
          sub: user.id,
          jti: randomUUID(),
          userId: user.id,
          email: user.email,
        },
        { expiresIn: env.JWT_EXPIRES_IN },
      )

      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      })
    },
  )

  app.get('/me/last-tree', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const user = await app.prisma.user.findUnique({
      where: {
        id: request.actor.userId,
      },
      select: {
        lastOpenedTreeId: true,
        lastOpenedAccessMode: true,
        lastOpenedRole: true,
        lastOpenedAt: true,
      },
    })

    if (
      !user ||
      !user.lastOpenedTreeId ||
      !user.lastOpenedAccessMode ||
      (user.lastOpenedAccessMode !== 'member' && user.lastOpenedAccessMode !== 'share')
    ) {
      return reply.send({ lastTree: null })
    }

    const access = await resolveAccessibleLastTree(
      app,
      request.actor.userId,
      user.lastOpenedTreeId,
      user.lastOpenedAccessMode,
    )

    if (!access) {
      return reply.send({ lastTree: null })
    }

    return reply.send({
      lastTree: {
        treeId: user.lastOpenedTreeId,
        accessMode: user.lastOpenedAccessMode,
        role: user.lastOpenedRole || access.role,
        lastOpenedAt: user.lastOpenedAt,
      },
    })
  })

  app.put('/me/last-tree', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const parsed = updateLastTreeSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() })
    }

    const access = await resolveAccessibleLastTree(
      app,
      request.actor.userId,
      parsed.data.treeId,
      parsed.data.accessMode,
    )

    if (!access) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const now = new Date()
    await app.prisma.user.update({
      where: {
        id: request.actor.userId,
      },
      data: {
        lastOpenedTreeId: parsed.data.treeId,
        lastOpenedAccessMode: parsed.data.accessMode,
        lastOpenedRole: access.role,
        lastOpenedAt: now,
      },
    })

    if (parsed.data.accessMode === 'share') {
      await app.prisma.userTreeAccess.updateMany({
        where: {
          treeId: parsed.data.treeId,
          userId: request.actor.userId,
        },
        data: {
          updatedAt: now,
        },
      })
    }

    return reply.send({
      lastTree: {
        treeId: parsed.data.treeId,
        accessMode: parsed.data.accessMode,
        role: access.role,
        lastOpenedAt: now,
      },
    })
  })

  app.post('/logout', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const payload = await request.jwtVerify<AnyJwtPayload & { exp?: number }>()
    if (payload.kind !== 'user') {
      return reply.code(401).send({ error: 'invalid_token_kind' })
    }

    if (typeof payload.exp === 'number') {
      revokeUserToken(payload.jti, payload.exp)
    }

    return reply.send({ ok: true })
  })
}
