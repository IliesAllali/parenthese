import { createHash } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'

import { env } from '../config/env.js'

// Une ouverture d'arbre = une visite. Les rechargements du même visiteur dans cette fenêtre
// (graphe rechargé après une modification, onglet rouvert) ne comptent qu'une fois.
export const VISIT_DEDUP_WINDOW_MS = 30 * 60 * 1000
// Au-delà, les visites sont effacées (lecture de l'onglet Visites)
export const VISIT_RETENTION_DAYS = 365

export type VisitAccessKind = 'share' | 'member' | 'shared_account'

export function deviceFromUserAgent(userAgent: string): 'phone' | 'tablet' | 'desktop' {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet'
  if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) return 'phone'
  return 'desktop'
}

// Prénom envoyé par l'app en en-tête X-Visitor-Name (encodé en URI pour les accents)
export function visitorNameFromHeader(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }
  const trimmed = decoded.replace(/\s+/g, ' ').trim().slice(0, 60)
  return trimmed || null
}

export function visitorKeyOf(treeId: string, ip: string, userAgent: string): string {
  return createHash('sha256').update(`${env.JWT_SECRET}|${treeId}|${ip}|${userAgent}`).digest('hex').slice(0, 32)
}

// N'échoue jamais : un journal qui casse ne doit pas empêcher d'ouvrir l'arbre
export async function recordTreeVisit(
  app: FastifyInstance,
  request: FastifyRequest,
  treeId: string,
  accessKind: VisitAccessKind,
  userId: string | null,
): Promise<void> {
  try {
    const userAgent = String(request.headers['user-agent'] || '')
    const visitorKey = userId ? `user:${userId}` : visitorKeyOf(treeId, request.ip, userAgent)
    const visitorName = visitorNameFromHeader(request.headers['x-visitor-name'])

    const recent = await app.prisma.treeVisit.findFirst({
      where: { treeId, visitorKey, createdAt: { gte: new Date(Date.now() - VISIT_DEDUP_WINDOW_MS) } },
      select: { id: true, visitorName: true },
    })
    if (recent) {
      // Prénom donné après coup (champ rempli à la reconnexion) : on complète la visite en cours
      if (visitorName && !recent.visitorName) {
        await app.prisma.treeVisit.update({ where: { id: recent.id }, data: { visitorName } })
      }
      return
    }

    await app.prisma.treeVisit.create({
      data: {
        treeId,
        userId,
        accessKind,
        visitorName,
        visitorKey,
        device: deviceFromUserAgent(userAgent),
      },
    })
  } catch (error) {
    request.log.warn({ err: error, treeId }, 'tree_visit_record_failed')
  }
}
