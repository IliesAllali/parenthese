import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '../config/env.js'
import { isUserTokenRevoked } from '../lib/token-revocation.js'
import { syncPersonMediaOrder } from '../lib/media-order.js'
import type { AnyJwtPayload, MembershipRole } from '../types/auth.js'
import { ContributionRouteError, resolveSubmissionContext } from './contributions.js'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_FILE_BYTES = 20 * 1024 * 1024

const treeIdParamSchema = z.object({
  id: z.string().min(1),
})

const treePersonParamsSchema = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
})

const mediaParamsSchema = z.object({
  id: z.string().min(1),
  mediaId: z.string().min(1),
})

const mediaSourceSchema = z.string().max(500).optional().nullable()

const downloadQuerySchema = z.object({
  token: z.string().min(1).optional(),
})

const uploadBinaryMediaSchema = z.object({
  submittedByLabel: z.string().trim().min(1).max(120).optional(),
  type: z.enum(['photo', 'video', 'audio', 'document', 'geojson', 'gpx']),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(MAX_FILE_BYTES),
  dataBase64: z.string().min(1),
  caption: z.string().max(280).optional().nullable(),
  source: mediaSourceSchema,
})

const uploadCitationMediaSchema = z.object({
  submittedByLabel: z.string().trim().min(1).max(120).optional(),
  type: z.literal('citation'),
  caption: z.string().trim().min(1).max(2000),
  source: mediaSourceSchema,
})

const YOUTUBE_URL_RE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//

const uploadYoutubeVideoSchema = z.object({
  submittedByLabel: z.string().trim().min(1).max(120).optional(),
  type: z.literal('video'),
  mimeType: z.literal('video/youtube'),
  youtubeUrl: z.string().regex(YOUTUBE_URL_RE),
  caption: z.string().max(280).optional().nullable(),
  source: mediaSourceSchema,
})

const uploadMediaSchema = z.union([uploadBinaryMediaSchema, uploadCitationMediaSchema, uploadYoutubeVideoSchema])

const uploadAvatarSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive().max(MAX_IMAGE_BYTES),
  dataBase64: z.string().min(1),
})

const reorderMediaSchema = z.object({
  orderedMediaIds: z.array(z.string().min(1)).min(1),
})

function hasAdminRight(role: MembershipRole): boolean {
  return role === 'owner' || role === 'admin'
}

function getStorageRoot(): string {
  return path.resolve(env.MEDIA_STORAGE_PATH)
}

function stripDataUrlPrefix(value: string): string {
  const index = value.indexOf(',')
  if (value.startsWith('data:') && index >= 0) {
    return value.slice(index + 1)
  }

  return value
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function inferFileExtension(fileName: string, mimeType: string): string {
  const rawExt = path.extname(fileName).toLowerCase().replace(/[^.a-z0-9]/g, '')
  if (rawExt.length >= 2 && rawExt.length <= 8) {
    return rawExt
  }

  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'application/pdf': '.pdf',
    'application/geo+json': '.geojson',
    'application/gpx+xml': '.gpx',
    'application/xml': '.xml',
    'text/xml': '.xml',
    'application/json': '.json',
    'text/plain': '.txt',
  }

  return map[mimeType] || '.bin'
}

function isMimeTypeAllowedForMediaType(type: 'photo' | 'video' | 'audio' | 'document' | 'geojson' | 'gpx', mimeType: string): boolean {
  const normalizedMimeType = mimeType.toLowerCase()

  if (type === 'photo') {
    return normalizedMimeType.startsWith('image/')
  }

  if (type === 'video') {
    return normalizedMimeType.startsWith('video/')
  }

  if (type === 'audio') {
    return normalizedMimeType.startsWith('audio/')
  }

  if (type === 'geojson') {
    return (
      normalizedMimeType === 'application/geo+json' ||
      normalizedMimeType === 'application/json' ||
      normalizedMimeType === 'text/geojson' ||
      normalizedMimeType === 'text/plain'
    )
  }

  if (type === 'gpx') {
    return (
      normalizedMimeType === 'application/gpx+xml' ||
      normalizedMimeType === 'application/xml' ||
      normalizedMimeType === 'text/xml' ||
      normalizedMimeType === 'text/plain' ||
      normalizedMimeType === 'application/octet-stream'
    )
  }

  return (
    normalizedMimeType === 'application/pdf' ||
    normalizedMimeType === 'application/msword' ||
    normalizedMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalizedMimeType === 'text/plain' ||
    normalizedMimeType === 'application/octet-stream'
  )
}

async function requireAdminMembership(app: FastifyRequest['server'], userId: string, treeId: string) {
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

  if (!membership || membership.tree.deletedAt || !hasAdminRight(membership.role)) {
    return null
  }

  return membership
}

async function assertTreeReadableByActor(app: FastifyRequest['server'], treeId: string, actor: FastifyRequest['actor']): Promise<boolean> {
  if (!actor) {
    return false
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
          },
        },
      },
    })

    if (membership && !membership.tree.deletedAt) {
      return true
    }

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
          },
        },
      },
    })

    return Boolean(shared && !shared.tree.deletedAt)
  }

  if (actor.treeId !== treeId) {
    return false
  }

  const tree = await app.prisma.tree.findFirst({
    where: {
      id: treeId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  })

  return Boolean(tree)
}

async function assertTreeReadableByQueryToken(app: FastifyRequest['server'], treeId: string, token: string): Promise<boolean> {
  let payload: AnyJwtPayload

  try {
    payload = await app.jwt.verify<AnyJwtPayload>(token)
  } catch {
    return false
  }

  if (payload.kind === 'user') {
    if (isUserTokenRevoked(payload.jti)) {
      return false
    }

    const membership = await app.prisma.treeMembership.findUnique({
      where: {
        treeId_userId: {
          treeId,
          userId: payload.userId,
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

    if (membership && !membership.tree.deletedAt) {
      return true
    }

    const shared = await app.prisma.userTreeAccess.findUnique({
      where: {
        treeId_userId: {
          treeId,
          userId: payload.userId,
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

    return Boolean(shared && !shared.tree.deletedAt)
  }

  if (payload.treeId !== treeId) {
    return false
  }

  const accessState = await app.prisma.treeAccessPasswords.findUnique({
    where: {
      treeId,
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
    return false
  }

  return accessState.updatedAt.getTime() === payload.accessVersion
}

export const mediaRoutes: FastifyPluginAsync = async (app) => {
  app.post('/trees/:id/persons/:personId/media', async (request, reply) => {
    const actor = request.actor
    if (!actor) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const params = treePersonParamsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const payload = uploadMediaSchema.safeParse(request.body)
    if (!payload.success) {
      return reply.code(400).send({ error: 'invalid_payload', details: payload.error.flatten() })
    }

    // Administrateur : le souvenir est visible tout de suite. Famille (lien de partage, membre) :
    // il devient une contribution, visible après relecture sauf si l'arbre applique tout de suite.
    const membership = actor.kind === 'user' ? await requireAdminMembership(app, actor.userId, params.data.id) : null
    let contribution: Awaited<ReturnType<typeof resolveSubmissionContext>> | null = null
    if (!membership) {
      try {
        contribution = await resolveSubmissionContext(app, actor, params.data.id)
      } catch (error) {
        if (error instanceof ContributionRouteError) {
          return reply.code(error.statusCode).send({ error: error.code })
        }
        throw error
      }
    }
    const isPending = contribution?.autoStatus === 'pending'
    const uploaderUserId = actor.kind === 'user' ? actor.userId : null

    const person = await app.prisma.person.findFirst({
      where: {
        id: params.data.personId,
        treeId: params.data.id,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
      },
    })

    if (!person) {
      return reply.code(404).send({ error: 'person_not_found' })
    }

    // Une contribution d'une ligne, créée avant le média pour qu'il la référence
    const now = new Date()
    const contributionSession = contribution
      ? await app.prisma.contributionSession.create({
          data: {
            treeId: params.data.id,
            submittedByUserId: contribution.submittedByUserId,
            submittedByLabel: payload.data.submittedByLabel?.trim() || contribution.submittedByLabel,
            mode: contribution.mode,
            status: contribution.autoStatus,
            title: `Souvenir pour ${person.firstName}`.slice(0, 120),
            reviewedAt: contribution.autoStatus === 'approved' ? now : undefined,
            reviewedBy: contribution.autoStatus === 'approved' ? contribution.submittedByUserId : undefined,
          },
        })
      : null

    const recordContributionChange = async (mediaId: string, after: Record<string, unknown>) => {
      if (!contributionSession || !contribution) {
        return
      }
      await app.prisma.contributionChange.create({
        data: {
          sessionId: contributionSession.id,
          entityType: 'media',
          entityId: mediaId,
          action: 'create',
          afterJson: { personId: params.data.personId, ...after },
          decision: contribution.autoStatus === 'approved' ? 'approved' : undefined,
        },
      })
    }

    const auditActor = contribution
      ? { actorType: contribution.actorType, actorId: contribution.actorId }
      : { actorType: 'user', actorId: uploaderUserId }

    // --- YouTube video (no file upload) ---
    if ('youtubeUrl' in payload.data) {
      const mediaCount = await app.prisma.mediaItem.count({
        where: { treeId: params.data.id, personId: params.data.personId, status: 'approved', deletedAt: null },
      })
      const normalizedSource = normalizeOptionalText(payload.data.source)
      const mediaId = randomUUID()
      const media = await app.prisma.mediaItem.create({
        data: {
          id: mediaId,
          treeId: params.data.id,
          personId: params.data.personId,
          type: 'video',
          mimeType: 'video/youtube',
          filePath: payload.data.youtubeUrl,
          caption: payload.data.caption ?? null,
          source: normalizedSource,
          sizeBytes: 0,
          displayOrder: isPending ? 0 : mediaCount + 1,
          isFeatured: !isPending && mediaCount < 3,
          uploadedBy: uploaderUserId,
          status: isPending ? 'pending' : 'approved',
          contributionSessionId: contributionSession?.id ?? null,
        },
      })
      if (!isPending) {
        await syncPersonMediaOrder(app.prisma, params.data.id, params.data.personId)
      }
      await recordContributionChange(mediaId, { type: 'video', mimeType: 'video/youtube', caption: payload.data.caption ?? null })
      await app.prisma.auditLog.create({
        data: {
          treeId: params.data.id,
          ...auditActor,
          action: 'media_uploaded',
          entityType: 'media_item',
          entityId: mediaId,
          payloadJson: { personId: params.data.personId, type: 'video', youtubeUrl: payload.data.youtubeUrl },
        },
      })
      return reply.code(201).send({ media, status: media.status })
    }

    let fileBuffer: Buffer
    let normalizedMimeType: string
    let normalizedFileName: string
    let normalizedSizeBytes: number
    let normalizedCaption: string | null
    const normalizedSource = normalizeOptionalText(payload.data.source)

    if (payload.data.type === 'citation') {
      const citationText = payload.data.caption.trim()
      if (!citationText) {
        return reply.code(400).send({ error: 'citation_text_required' })
      }

      fileBuffer = Buffer.from(citationText, 'utf8')
      normalizedMimeType = 'text/plain'
      normalizedFileName = 'citation.txt'
      normalizedSizeBytes = fileBuffer.length
      normalizedCaption = citationText
    } else {
      if (!isMimeTypeAllowedForMediaType(payload.data.type, payload.data.mimeType)) {
        return reply.code(400).send({ error: 'invalid_media_mime_type' })
      }

      const encoded = stripDataUrlPrefix(payload.data.dataBase64)
      try {
        fileBuffer = Buffer.from(encoded, 'base64')
      } catch {
        return reply.code(400).send({ error: 'invalid_base64_data' })
      }

      if (!fileBuffer.length) {
        return reply.code(400).send({ error: 'empty_media_file' })
      }

      if (fileBuffer.length !== payload.data.sizeBytes) {
        return reply.code(400).send({ error: 'size_mismatch' })
      }

      if (payload.data.type === 'photo' && fileBuffer.length > MAX_IMAGE_BYTES) {
        return reply.code(400).send({ error: 'image_too_large' })
      }

      normalizedMimeType = payload.data.mimeType
      normalizedFileName = payload.data.fileName
      normalizedSizeBytes = payload.data.sizeBytes
      normalizedCaption = payload.data.caption ?? null
    }

    const extension = inferFileExtension(normalizedFileName, normalizedMimeType)
    const mediaId = randomUUID()
    const relativePath = path.posix.join(params.data.id, params.data.personId, `${mediaId}${extension}`)
    const storageRoot = getStorageRoot()
    const absolutePath = path.resolve(storageRoot, relativePath)

    if (!absolutePath.startsWith(storageRoot)) {
      return reply.code(400).send({ error: 'invalid_media_path' })
    }

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, fileBuffer)

    const mediaCount = await app.prisma.mediaItem.count({
      where: {
        treeId: params.data.id,
        personId: params.data.personId,
        status: 'approved',
        deletedAt: null,
      },
    })

    const media = await app.prisma.mediaItem.create({
      data: {
        id: mediaId,
        treeId: params.data.id,
        personId: params.data.personId,
        type: payload.data.type,
        mimeType: normalizedMimeType,
        filePath: relativePath,
        caption: normalizedCaption,
        source: normalizedSource,
        sizeBytes: normalizedSizeBytes,
        displayOrder: isPending ? 0 : mediaCount + 1,
        isFeatured: !isPending && mediaCount < 3,
        uploadedBy: uploaderUserId,
        status: isPending ? 'pending' : 'approved',
        contributionSessionId: contributionSession?.id ?? null,
      },
    })

    if (!isPending) {
      await syncPersonMediaOrder(app.prisma, params.data.id, params.data.personId)
    }

    await recordContributionChange(mediaId, { type: payload.data.type, mimeType: normalizedMimeType, caption: normalizedCaption })

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        ...auditActor,
        action: 'media_uploaded',
        entityType: 'media_item',
        entityId: mediaId,
        payloadJson: {
          personId: params.data.personId,
          type: payload.data.type,
          fileName: normalizedFileName,
          sizeBytes: normalizedSizeBytes,
        },
      },
    })

    return reply.code(201).send({ media, status: media.status })
  })

  app.post('/trees/:id/persons/:personId/avatar', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const params = treePersonParamsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const payload = uploadAvatarSchema.safeParse(request.body)
    if (!payload.success) {
      return reply.code(400).send({ error: 'invalid_payload', details: payload.error.flatten() })
    }

    const membership = await requireAdminMembership(app, request.actor.userId, params.data.id)
    if (!membership) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const person = await app.prisma.person.findFirst({
      where: {
        id: params.data.personId,
        treeId: params.data.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    if (!person) {
      return reply.code(404).send({ error: 'person_not_found' })
    }

    if (!payload.data.mimeType.startsWith('image/')) {
      return reply.code(400).send({ error: 'invalid_avatar_mime_type' })
    }

    const encoded = stripDataUrlPrefix(payload.data.dataBase64)
    let fileBuffer: Buffer

    try {
      fileBuffer = Buffer.from(encoded, 'base64')
    } catch {
      return reply.code(400).send({ error: 'invalid_base64_data' })
    }

    if (!fileBuffer.length) {
      return reply.code(400).send({ error: 'empty_media_file' })
    }

    if (fileBuffer.length !== payload.data.sizeBytes) {
      return reply.code(400).send({ error: 'size_mismatch' })
    }

    if (fileBuffer.length > MAX_IMAGE_BYTES) {
      return reply.code(400).send({ error: 'image_too_large' })
    }

    const extension = inferFileExtension(payload.data.fileName, payload.data.mimeType)
    const relativePath = path.posix.join(
      params.data.id,
      params.data.personId,
      `avatar-${randomUUID()}${extension}`,
    )
    const storageRoot = getStorageRoot()
    const absolutePath = path.resolve(storageRoot, relativePath)

    if (!absolutePath.startsWith(storageRoot)) {
      return reply.code(400).send({ error: 'invalid_media_path' })
    }

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, fileBuffer)

    await app.prisma.person.updateMany({
      where: {
        id: params.data.personId,
        treeId: params.data.id,
        deletedAt: null,
      },
      data: {
        avatarPath: relativePath,
        avatarMimeType: payload.data.mimeType,
        updatedBy: request.actor.userId,
      },
    })

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        actorType: 'user',
        actorId: request.actor.userId,
        action: 'person_avatar_updated',
        entityType: 'person',
        entityId: params.data.personId,
      },
    })

    return reply.code(201).send({ ok: true })
  })

  app.delete('/trees/:id/persons/:personId/avatar', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const params = treePersonParamsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const membership = await requireAdminMembership(app, request.actor.userId, params.data.id)
    if (!membership) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const updated = await app.prisma.person.updateMany({
      where: {
        id: params.data.personId,
        treeId: params.data.id,
        deletedAt: null,
      },
      data: {
        avatarPath: null,
        avatarMimeType: null,
        updatedBy: request.actor.userId,
      },
    })

    if (updated.count === 0) {
      return reply.code(404).send({ error: 'person_not_found' })
    }

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        actorType: 'user',
        actorId: request.actor.userId,
        action: 'person_avatar_removed',
        entityType: 'person',
        entityId: params.data.personId,
      },
    })

    return reply.send({ ok: true })
  })

  app.patch('/trees/:id/persons/:personId/media/reorder', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const params = treePersonParamsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const payload = reorderMediaSchema.safeParse(request.body)
    if (!payload.success) {
      return reply.code(400).send({ error: 'invalid_payload', details: payload.error.flatten() })
    }

    const membership = await requireAdminMembership(app, request.actor.userId, params.data.id)
    if (!membership) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const existing = await app.prisma.mediaItem.findMany({
      where: {
        treeId: params.data.id,
        personId: params.data.personId,
        status: 'approved',
        deletedAt: null,
      },
      select: {
        id: true,
      },
    })

    const existingIds = existing.map((item: { id: string }) => item.id)
    const orderedIds = payload.data.orderedMediaIds

    if (existingIds.length !== orderedIds.length) {
      return reply.code(400).send({ error: 'invalid_media_order_payload' })
    }

    const existingSet = new Set(existingIds)
    const orderedSet = new Set(orderedIds)
    if (orderedSet.size !== orderedIds.length || orderedIds.some((id) => !existingSet.has(id))) {
      return reply.code(400).send({ error: 'invalid_media_order_payload' })
    }

    for (let index = 0; index < orderedIds.length; index += 1) {
      await app.prisma.mediaItem.updateMany({
        where: {
          id: orderedIds[index],
          treeId: params.data.id,
          personId: params.data.personId,
          deletedAt: null,
        },
        data: {
          displayOrder: index + 1,
        },
      })
    }

    await syncPersonMediaOrder(app.prisma, params.data.id, params.data.personId)

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        actorType: 'user',
        actorId: request.actor.userId,
        action: 'media_reordered',
        entityType: 'media_item',
        entityId: params.data.personId,
        payloadJson: {
          personId: params.data.personId,
          orderedMediaIds: payload.data.orderedMediaIds,
        },
      },
    })

    return reply.send({ ok: true })
  })

  app.delete('/trees/:id/persons/:personId/media/:mediaId', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const params = z
      .object({
        id: z.string().min(1),
        personId: z.string().min(1),
        mediaId: z.string().min(1),
      })
      .safeParse(request.params)

    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const membership = await requireAdminMembership(app, request.actor.userId, params.data.id)
    if (!membership) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    const updateResult = await app.prisma.mediaItem.updateMany({
      where: {
        id: params.data.mediaId,
        treeId: params.data.id,
        personId: params.data.personId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    if (updateResult.count === 0) {
      return reply.code(404).send({ error: 'media_not_found' })
    }

    await syncPersonMediaOrder(app.prisma, params.data.id, params.data.personId)

    await app.prisma.auditLog.create({
      data: {
        treeId: params.data.id,
        actorType: 'user',
        actorId: request.actor.userId,
        action: 'media_deleted',
        entityType: 'media_item',
        entityId: params.data.mediaId,
        payloadJson: {
          personId: params.data.personId,
        },
      },
    })

    return reply.send({ ok: true })
  })

  app.get('/trees/:id/persons/:personId/avatar', async (request, reply) => {
    const params = treePersonParamsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const query = downloadQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: 'invalid_query' })
    }

    const readableByActor = await assertTreeReadableByActor(app, params.data.id, request.actor)
    const readableByQueryToken = query.data.token
      ? await assertTreeReadableByQueryToken(app, params.data.id, query.data.token)
      : false

    if (!readableByActor && !readableByQueryToken) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const person = await app.prisma.person.findFirst({
      where: {
        id: params.data.personId,
        treeId: params.data.id,
        deletedAt: null,
      },
      select: {
        avatarPath: true,
        avatarMimeType: true,
      },
    })

    if (!person?.avatarPath) {
      return reply.code(404).send({ error: 'avatar_not_found' })
    }

    const storageRoot = getStorageRoot()
    const absolutePath = path.resolve(storageRoot, person.avatarPath)
    if (!absolutePath.startsWith(storageRoot)) {
      return reply.code(400).send({ error: 'invalid_media_path' })
    }

    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(absolutePath)
    } catch {
      return reply.code(404).send({ error: 'media_file_missing' })
    }

    reply.header('Cache-Control', 'private, max-age=300')
    reply.type(person.avatarMimeType || 'application/octet-stream')

    return reply.send(fileBuffer)
  })

  app.get('/trees/:id/media/:mediaId', async (request, reply) => {
    const params = mediaParamsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const query = downloadQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: 'invalid_query' })
    }

    const readableByActor = await assertTreeReadableByActor(app, params.data.id, request.actor)
    const readableByQueryToken = query.data.token
      ? await assertTreeReadableByQueryToken(app, params.data.id, query.data.token)
      : false

    if (!readableByActor && !readableByQueryToken) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const media = await app.prisma.mediaItem.findFirst({
      where: {
        id: params.data.mediaId,
        treeId: params.data.id,
        deletedAt: null,
      },
      select: {
        filePath: true,
        mimeType: true,
      },
    })

    if (!media) {
      return reply.code(404).send({ error: 'media_not_found' })
    }

    // YouTube videos: filePath is the YouTube URL, redirect the browser
    if (media.mimeType === 'video/youtube') {
      return reply.code(302).redirect(media.filePath)
    }

    const storageRoot = getStorageRoot()
    const absolutePath = path.resolve(storageRoot, media.filePath)
    if (!absolutePath.startsWith(storageRoot)) {
      return reply.code(400).send({ error: 'invalid_media_path' })
    }

    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(absolutePath)
    } catch {
      return reply.code(404).send({ error: 'media_file_missing' })
    }

    reply.header('Cache-Control', 'private, max-age=300')
    reply.type(media.mimeType)

    return reply.send(fileBuffer)
  })

  // ---- Annotation Photos ----
  const MAX_ANNOTATION_PHOTO_BYTES = 3 * 1024 * 1024

  const uploadAnnotationPhotoSchema = z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(120),
    sizeBytes: z.number().int().positive().max(MAX_ANNOTATION_PHOTO_BYTES),
    dataBase64: z.string().min(1),
  })

  const annotationPhotoParamsSchema = z.object({
    id: z.string().min(1),
    photoId: z.string().min(1),
  })

  app.post('/trees/:id/annotation-photos', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const params = treeIdParamSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const payload = uploadAnnotationPhotoSchema.safeParse(request.body)
    if (!payload.success) {
      return reply.code(400).send({ error: 'invalid_payload', details: payload.error.flatten() })
    }

    const membership = await requireAdminMembership(app, request.actor.userId, params.data.id)
    if (!membership) {
      return reply.code(403).send({ error: 'forbidden' })
    }

    if (!payload.data.mimeType.startsWith('image/')) {
      return reply.code(400).send({ error: 'invalid_annotation_photo_mime_type' })
    }

    const encoded = stripDataUrlPrefix(payload.data.dataBase64)
    let fileBuffer: Buffer
    try {
      fileBuffer = Buffer.from(encoded, 'base64')
    } catch {
      return reply.code(400).send({ error: 'invalid_base64_data' })
    }

    if (!fileBuffer.length) {
      return reply.code(400).send({ error: 'empty_photo_file' })
    }

    if (fileBuffer.length !== payload.data.sizeBytes) {
      return reply.code(400).send({ error: 'size_mismatch' })
    }

    if (fileBuffer.length > MAX_ANNOTATION_PHOTO_BYTES) {
      return reply.code(400).send({ error: 'photo_too_large' })
    }

    const photoId = randomUUID()
    const extension = inferFileExtension(payload.data.fileName, payload.data.mimeType)
    const relativePath = path.posix.join(params.data.id, 'annotation-photos', `${photoId}${extension}`)
    const storageRoot = getStorageRoot()
    const absolutePath = path.resolve(storageRoot, relativePath)

    if (!absolutePath.startsWith(storageRoot)) {
      return reply.code(400).send({ error: 'invalid_photo_path' })
    }

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, fileBuffer)

    return reply.code(201).send({
      photoId,
      photoPath: `/trees/${params.data.id}/annotation-photos/${photoId}`,
    })
  })

  app.get('/trees/:id/annotation-photos/:photoId', async (request, reply) => {
    const params = annotationPhotoParamsSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_params' })
    }

    const query = downloadQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: 'invalid_query' })
    }

    const readableByActor = await assertTreeReadableByActor(app, params.data.id, request.actor)
    const readableByQueryToken = query.data.token
      ? await assertTreeReadableByQueryToken(app, params.data.id, query.data.token)
      : false

    if (!readableByActor && !readableByQueryToken) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    // Find the file: scan for photoId with any extension
    const storageRoot = getStorageRoot()
    const photoDir = path.resolve(storageRoot, params.data.id, 'annotation-photos')
    const photoIdSafe = params.data.photoId.replace(/[^a-zA-Z0-9-]/g, '')
    if (!photoIdSafe) {
      return reply.code(400).send({ error: 'invalid_photo_id' })
    }

    // Try common extensions
    const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    let foundPath: string | null = null
    let foundMime = 'image/jpeg'
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif',
    }

    for (const ext of extensions) {
      const candidate = path.resolve(photoDir, `${photoIdSafe}${ext}`)
      if (!candidate.startsWith(storageRoot)) continue
      try {
        await readFile(candidate) // existence check
        foundPath = candidate
        foundMime = mimeMap[ext] || 'image/jpeg'
        break
      } catch { /* not found, try next */ }
    }

    if (!foundPath) {
      return reply.code(404).send({ error: 'photo_not_found' })
    }

    let fileBuffer: Buffer
    try {
      fileBuffer = await readFile(foundPath)
    } catch {
      return reply.code(404).send({ error: 'photo_file_missing' })
    }

    reply.header('Cache-Control', 'private, max-age=300')
    reply.type(foundMime)

    return reply.send(fileBuffer)
  })
}
