import type { FastifyInstance } from 'fastify'

import type { Actor, MediaJwtPayload } from '../types/auth.js'

// Lecture d'un arbre : membre, compte rattaché par le mot de passe de partage, ou jeton d'arbre valide
export async function canReadTree(app: FastifyInstance, treeId: string, actor: Actor): Promise<boolean> {
  if (!actor) {
    return false
  }

  if (actor.kind === 'user') {
    const membership = await app.prisma.treeMembership.findUnique({
      where: { treeId_userId: { treeId, userId: actor.userId } },
      include: { tree: { select: { deletedAt: true } } },
    })
    if (membership && !membership.tree.deletedAt) {
      return true
    }

    const shared = await app.prisma.userTreeAccess.findUnique({
      where: { treeId_userId: { treeId, userId: actor.userId } },
      include: { tree: { select: { deletedAt: true } } },
    })
    return Boolean(shared && !shared.tree.deletedAt)
  }

  if (actor.treeId !== treeId) {
    return false
  }

  // Le jeton d'arbre a déjà été confronté à la version des mots de passe dans le preHandler
  const tree = await app.prisma.tree.findFirst({ where: { id: treeId, deletedAt: null }, select: { id: true } })
  return Boolean(tree)
}

// Les images sont chargées par <img src>, qui ne peut pas envoyer d'en-tête : leur adresse porte un jeton.
// Ce jeton ne sert qu'à lire les médias d'un arbre, jamais la session du compte (qui finissait dans les
// journaux, l'historique et les liens copiés).
export const MEDIA_TOKEN_TTL = '12h'

export function signMediaToken(app: FastifyInstance, treeId: string, actor: NonNullable<Actor>): string {
  const payload: MediaJwtPayload = {
    kind: 'media',
    sub: `media:${treeId}`,
    treeId,
    ...(actor.kind === 'user' ? { userId: actor.userId } : { accessVersion: actor.accessVersion }),
  }
  return app.jwt.sign(payload, { expiresIn: MEDIA_TOKEN_TTL })
}

export async function canReadTreeWithMediaToken(app: FastifyInstance, treeId: string, token: string): Promise<boolean> {
  let payload: { kind?: string; treeId?: string; userId?: string; accessVersion?: number }
  try {
    payload = await app.jwt.verify(token)
  } catch {
    return false
  }

  if (payload.kind !== 'media' || payload.treeId !== treeId) {
    return false
  }

  // Émis pour un compte : ses droits sont relus, un accès retiré coupe aussi les médias
  if (payload.userId) {
    const user = await app.prisma.user.count({ where: { id: payload.userId } })
    if (user === 0) {
      return false
    }
    return canReadTree(app, treeId, { kind: 'user', userId: payload.userId, email: '' })
  }

  // Émis pour un mot de passe de partage : invalide dès que le mot de passe change
  const accessState = await app.prisma.treeAccessPasswords.findUnique({
    where: { treeId },
    select: { updatedAt: true, tree: { select: { deletedAt: true } } },
  })
  if (!accessState || accessState.tree.deletedAt) {
    return false
  }
  return accessState.updatedAt.getTime() === payload.accessVersion
}
