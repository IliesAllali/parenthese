import type { Prisma, PrismaClient } from '../generated/prisma/client.js'

import { deletedAccountVisitorKey } from './tree-visits.js'
import { deleteTreeRecords, removeTreeMediaDirectories, type PurgeLogger } from './tree-purge.js'

// Compte provisoire (#251) : « Créer mon arbre » ouvre l'arbre tout de suite, avant tout compte. Le serveur crée un
// compte sans email ni mot de passe, et sa session vit dans le navigateur comme une autre. La personne le garde
// (« Gardez votre arbre ») en lui donnant un email et un mot de passe, ou par le fournisseur OIDC : c'est le même
// compte, le même arbre. Sinon il est effacé avec ses arbres au bout de PROVISIONAL_DAYS.

export const PROVISIONAL_DAYS = 30
export const PROVISIONAL_SESSION_EXPIRES_IN = `${PROVISIONAL_DAYS}d`
const DAY_MS = 24 * 60 * 60 * 1000

export function isProvisional(user: { email: string | null }): boolean {
  return user.email === null
}

export function provisionalExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PROVISIONAL_DAYS * DAY_MS)
}

// Tout ce qui tient à un compte et doit partir ou rester avant de supprimer la ligne users, dans la transaction de
// l'appelant : ses arbres partent, ses contributions envoyées ailleurs et ses visites restent, sans lui.
// Renvoie les arbres supprimés, dont les fichiers sont à effacer après la transaction.
export async function deleteAccountRecords(tx: Prisma.TransactionClient, userId: string): Promise<string[]> {
  const ownedTrees = await tx.tree.findMany({ where: { ownerUserId: userId }, select: { id: true } })
  const treeIds = ownedTrees.map((tree) => tree.id)

  await deleteTreeRecords(tx, treeIds)

  await tx.contributionSession.updateMany({
    where: { submittedByUserId: userId },
    data: { submittedByLabel: 'Contributeur' },
  })

  await tx.treeVisit.updateMany({
    where: { visitorKey: `user:${userId}` },
    data: { visitorKey: deletedAccountVisitorKey(userId) },
  })

  await tx.user.delete({ where: { id: userId } })
  return treeIds
}

// Un compte provisoire rejoint un compte qui existe déjà (connexion par mot de passe ou par le fournisseur depuis
// l'arbre provisoire) : ses arbres changent de propriétaire, puis le compte provisoire disparaît. Rien n'est copié,
// les identifiants des arbres et des personnes ne changent pas.
export async function adoptProvisionalAccount(prisma: PrismaClient, provisionalUserId: string, targetUserId: string): Promise<void> {
  if (provisionalUserId === targetUserId) return

  await prisma.$transaction(async (tx) => {
    const provisional = await tx.user.findUnique({
      where: { id: provisionalUserId },
      select: { email: true, lastOpenedTreeId: true, lastOpenedAccessMode: true, lastOpenedRole: true, lastOpenedAt: true },
    })
    // Déjà gardé ou déjà rattaché par une requête simultanée : rien à reprendre
    if (!provisional || !isProvisional(provisional)) return

    await tx.tree.updateMany({ where: { ownerUserId: provisionalUserId }, data: { ownerUserId: targetUserId } })
    await tx.treeMembership.updateMany({ where: { userId: provisionalUserId }, data: { userId: targetUserId } })
    await tx.contributionSession.updateMany({ where: { reviewedBy: provisionalUserId }, data: { reviewedBy: targetUserId } })
    await tx.treeVisit.updateMany({ where: { visitorKey: `user:${provisionalUserId}` }, data: { visitorKey: `user:${targetUserId}`, userId: targetUserId } })

    // L'arbre provisoire est celui qu'on vient de faire : c'est lui qui s'ouvre
    if (provisional.lastOpenedTreeId) {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          lastOpenedTreeId: provisional.lastOpenedTreeId,
          lastOpenedAccessMode: provisional.lastOpenedAccessMode,
          lastOpenedRole: provisional.lastOpenedRole,
          lastOpenedAt: provisional.lastOpenedAt,
        },
      })
    }

    await tx.user.delete({ where: { id: provisionalUserId } })
  })
}

// Comptes provisoires de plus de PROVISIONAL_DAYS : effacés avec leurs arbres, puis leurs fichiers
export async function purgeExpiredProvisionalAccounts(prisma: PrismaClient, logger: PurgeLogger, now = new Date()): Promise<number> {
  const expired = await prisma.user.findMany({
    where: { email: null, createdAt: { lt: new Date(now.getTime() - PROVISIONAL_DAYS * DAY_MS) } },
    select: { id: true },
    take: 200,
  })

  let purged = 0
  for (const { id } of expired) {
    try {
      const treeIds = await prisma.$transaction((tx) => deleteAccountRecords(tx, id))
      await removeTreeMediaDirectories(treeIds, logger)
      purged += 1
    } catch (error) {
      logger.error({ err: error, userId: id }, 'Failed to purge provisional account')
    }
  }
  return purged
}

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000

// Tâche planifiée dans le processus de l'API : au démarrage, puis toutes les six heures
export function startProvisionalPurge(prisma: PrismaClient, logger: PurgeLogger & { info: (details: Record<string, unknown>, message: string) => void }): () => void {
  const run = () => {
    purgeExpiredProvisionalAccounts(prisma, logger)
      .then((count) => { if (count > 0) logger.info({ count }, 'Purged expired provisional accounts') })
      .catch((error: unknown) => logger.error({ err: error }, 'Provisional account purge failed'))
  }
  run()
  const timer = setInterval(run, PURGE_INTERVAL_MS)
  timer.unref()
  return () => clearInterval(timer)
}
