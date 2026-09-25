import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { Prisma } from '@prisma/client'

import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { isUserTokenRevoked } from './lib/token-revocation.js'
import { authRoutes } from './routes/auth.js'
import { contributionRoutes } from './routes/contributions.js'
import { graphRoutes } from './routes/graph.js'
import { mediaRoutes } from './routes/media.js'
import { publicRoutes } from './routes/public.js'
import { annotationRoutes } from './routes/annotations.js'
import { gedcomRoutes } from './routes/gedcom.js'
import { treeRoutes } from './routes/trees.js'
import { visitRoutes } from './routes/visits.js'
import type { AnyJwtPayload } from './types/auth.js'

export function createApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    bodyLimit: 12 * 1024 * 1024,
    // Accept both `/path` et `/path/` to avoid 301 → 400 issues via nginx
    routerOptions: { ignoreTrailingSlash: true },
    // Trust X-Forwarded-For from Nginx proxy so rate limiting uses real client IPs
    trustProxy: true,
  })

  app.decorate('prisma', prisma)
  app.decorateRequest('actor', null)

  app.register(cors, {
    origin: env.CORS_ORIGIN.length === 1 ? env.CORS_ORIGIN[0] : env.CORS_ORIGIN,
  })

  app.register(rateLimit, {
    global: false,
  })

  app.register(jwt, {
    secret: env.JWT_SECRET,
  })

  app.addHook('preHandler', async (request) => {
    request.actor = null

    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return
    }

    try {
      const payload = await request.jwtVerify<AnyJwtPayload>()

      if (payload.kind === 'user') {
        if (isUserTokenRevoked(payload.jti)) {
          return
        }

        // Un compte supprimé invalide aussi les sessions ouvertes sur d'autres appareils
        const accountCount = await app.prisma.user.count({ where: { id: payload.userId } })
        if (accountCount === 0) {
          return
        }

        request.actor = {
          kind: 'user',
          userId: payload.userId,
          email: payload.email,
        }
      }

      if (payload.kind === 'tree_access') {
        const accessState = await app.prisma.treeAccessPasswords.findUnique({
          where: {
            treeId: payload.treeId,
          },
          select: {
            updatedAt: true,
            tree: {
              select: {
                deletedAt: true,
              },
            },
          },
        })

        if (!accessState || accessState.tree.deletedAt) {
          return
        }

        if (accessState.updatedAt.getTime() !== payload.accessVersion) {
          return
        }

        request.actor = {
          kind: 'tree_access',
          treeId: payload.treeId,
          role: payload.role,
        }
      }
    } catch {
      request.actor = null
    }
  })

  app.get('/health', async () => ({ ok: true }))

  app.register(authRoutes, { prefix: '/auth' })
  app.register(publicRoutes)
  app.register(treeRoutes)
  app.register(mediaRoutes)
  app.register(graphRoutes)
  app.register(contributionRoutes)
  app.register(annotationRoutes)
  app.register(gedcomRoutes)
  app.register(visitRoutes)

  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return reply.code(503).send({
        error: 'database_unavailable',
        message: 'Database server unreachable. Start PostgreSQL and retry.',
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = error as Prisma.PrismaClientKnownRequestError
      if (prismaError.code === 'P2002') {
        return reply.code(409).send({
          error: 'unique_constraint_violation',
          message: 'A record with this value already exists.',
        })
      }

      if (prismaError.code === 'P2025') {
        return reply.code(404).send({
          error: 'record_not_found',
          message: 'The requested record does not exist.',
        })
      }

      request.log.error({ err: error, prismaCode: prismaError.code }, 'Prisma known request error')
      return reply.code(500).send({
        error: 'database_error',
        message: 'A database error occurred.',
      })
    }

    const statusCode = 'statusCode' in error ? (error as FastifyError).statusCode : undefined
    const errorCode = 'code' in error ? (error as FastifyError).code : undefined

    if (statusCode && statusCode < 500) {
      return reply.code(statusCode).send({
        error: errorCode ?? 'request_error',
        message: error.message,
      })
    }

    request.log.error({ err: error }, 'Unhandled error')
    return reply.code(statusCode ?? 500).send({
      error: 'internal_error',
      message: env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : error.message,
    })
  })

  app.addHook('onClose', async () => {
    await app.prisma.$disconnect()
  })

  return app
}
