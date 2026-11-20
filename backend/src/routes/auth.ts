import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { env } from '../config/env.js'
import { confirmsWithPassword, hashPassword, verifyPassword } from '../lib/auth.js'
import { isOidcEnabled } from '../lib/oidc.js'
import { createAccountIfAllowed, isRegistrationOpen } from '../lib/registration.js'
import { acceptInvitation, findPendingInvitationByToken } from '../lib/tree-invitations.js'
import { signUserSession } from '../lib/user-session.js'
import { revokeUserToken } from '../lib/token-revocation.js'
import { removeTreeMediaDirectories } from '../lib/tree-purge.js'
import {
  adoptProvisionalAccount,
  deleteAccountRecords,
  isProvisional,
  provisionalExpiry,
} from '../lib/provisional-account.js'
import type { AnyJwtPayload } from '../types/auth.js'

// Hash de comparaison pour une adresse inconnue, calculé une fois au premier besoin
let dummyHash: Promise<string> | null = null
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomUUID())
  return dummyHash
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

// Prénom du compte, facultatif : seulement à l'inscription (la connexion ne le demande pas)
const registerSchema = credentialsSchema.extend({
  firstName: z.string().max(60).optional().nullable(),
  // Lien d'invitation à co-gérer un arbre : ouvre un compte même inscription fermée, à l'adresse invitée seulement
  invitationToken: z.string().min(1).max(200).optional(),
})

// Compte provisoire : seulement le prénom tapé dans « Commencez par vous »
const provisionalSchema = z.object({
  firstName: z.string().max(60).optional().nullable(),
})

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'
}

function trimmedFirstName(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

// Suppression d'un compte sans mot de passe : connexion chez le fournisseur de moins de 15 minutes
const RECENT_SIGN_IN_MS = 15 * 60 * 1000

// Un compte avec mot de passe le redonne ; un compte né d'une connexion OIDC, sans mot de passe, retape son email
const deleteAccountSchema = z.object({
  password: z.string().min(1).max(128).optional(),
  confirmEmail: z.string().min(1).max(320).optional(),
}).refine((value) => value.password || value.confirmEmail, { message: 'password or confirmEmail required' })

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
  // Ce que l'écran d'accueil propose : l'app cache « Créer un compte » quand l'instance n'en accepte plus
  app.get(
    '/options',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (_request, reply) => {
      const registration = await isRegistrationOpen(app.prisma)
      return reply.send({
        registration,
        passwordLogin: env.PASSWORD_LOGIN,
        oidc: isOidcEnabled() ? { name: env.OIDC_PROVIDER_NAME } : null,
        // L'arbre avant le compte (#251) : seulement là où n'importe qui peut ouvrir un compte
        provisional: env.ALLOW_REGISTRATION,
        // Rien à proposer quand l'instance ne crée plus de compte
        signupPrompts: env.SIGNUP_PROMPTS && registration && env.PASSWORD_LOGIN,
      })
    },
  )

  // « Créer mon arbre » sans compte : un compte provisoire, sans email ni mot de passe, effacé au bout de 30 jours
  app.post(
    '/provisional',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const parsed = provisionalSchema.safeParse(request.body ?? {})
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() })
      }
      if (!env.ALLOW_REGISTRATION) {
        return reply.code(403).send({ error: 'registration_closed' })
      }

      const user = await app.prisma.user.create({
        data: { email: null, firstName: trimmedFirstName(parsed.data.firstName), passwordHash: null },
        select: { id: true, email: true, firstName: true, createdAt: true },
      })
      return reply.code(201).send({
        token: signUserSession(app, user),
        user: { id: user.id, email: null, firstName: user.firstName, hasPassword: false, provisional: true, provisionalUntil: provisionalExpiry(user.createdAt) },
      })
    },
  )

  // « Gardez votre arbre » : le compte provisoire reçoit un email et un mot de passe. Même compte, mêmes arbres.
  app.post(
    '/keep',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      if (!request.actor || request.actor.kind !== 'user') {
        return reply.code(401).send({ error: 'authentication_required' })
      }
      if (!env.PASSWORD_LOGIN) {
        return reply.code(403).send({ error: 'password_login_disabled' })
      }
      const parsed = credentialsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() })
      }

      const userId = request.actor.userId
      const current = await app.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
      if (!current) {
        return reply.code(401).send({ error: 'authentication_required' })
      }
      if (!isProvisional(current)) {
        return reply.code(409).send({ error: 'account_already_kept' })
      }

      const email = parsed.data.email.trim().toLowerCase()
      if (await app.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
        return reply.code(409).send({ error: 'email_already_exists' })
      }

      const passwordHash = await hashPassword(parsed.data.password)
      try {
        // email: null dans le filtre : deux envois simultanés ne gardent le compte qu'une fois
        const updated = await app.prisma.user.updateMany({ where: { id: userId, email: null }, data: { email, passwordHash } })
        if (updated.count === 0) return reply.code(409).send({ error: 'account_already_kept' })
      } catch (error: unknown) {
        if (isUniqueViolation(error)) return reply.code(409).send({ error: 'email_already_exists' })
        throw error
      }
      const kept = await app.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, firstName: true } })

      // La session provisoire (30 jours, sans email) laisse place à une session de compte
      const payload = await request.jwtVerify<AnyJwtPayload & { exp?: number }>()
      if (payload.kind === 'user' && typeof payload.exp === 'number') {
        await revokeUserToken(app.prisma, payload.jti, payload.exp)
      }

      return reply.send({ token: signUserSession(app, kept), user: { ...kept, hasPassword: true, provisional: false } })
    },
  )

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
      const parsed = registerSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() })
      }

      // Connexion par le fournisseur seulement (PASSWORD_LOGIN=false) : pas de compte à mot de passe
      if (!env.PASSWORD_LOGIN) {
        return reply.code(403).send({ error: 'password_login_disabled' })
      }

      const email = parsed.data.email.trim().toLowerCase()
      const invitation = parsed.data.invitationToken ? await findPendingInvitationByToken(app.prisma, parsed.data.invitationToken) : null
      if (parsed.data.invitationToken && !invitation) {
        return reply.code(410).send({ error: 'invitation_invalid' })
      }
      if (invitation && invitation.email !== email) {
        return reply.code(403).send({ error: 'invitation_email_mismatch' })
      }

      // Inscription fermée : refusée avant toute lecture, la réponse ne dit pas si l'adresse a un compte
      if (!invitation && !(await isRegistrationOpen(app.prisma))) {
        return reply.code(403).send({ error: 'registration_closed' })
      }

      const existing = await app.prisma.user.findUnique({ where: { email } })
      if (existing) {
        return reply.code(409).send({ error: 'email_already_exists' })
      }

      const passwordHash = await hashPassword(parsed.data.password)
      const user = await createAccountIfAllowed(app.prisma, (tx) => tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: trimmedFirstName(parsed.data.firstName),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      }), { invited: Boolean(invitation) })
      // Un autre compte est né pendant le calcul du hash, sur une instance fermée
      if (!user) {
        return reply.code(403).send({ error: 'registration_closed' })
      }

      // Compte ouvert par une invitation : co-gestionnaire de l'arbre tout de suite
      let joinedTreeId: string | null = null
      if (invitation) {
        const accepted = await acceptInvitation(app.prisma, invitation.id, user.id, email)
        if (accepted.ok) {
          joinedTreeId = accepted.treeId
        } else if (!(await isRegistrationOpen(app.prisma))) {
          // Invitation annulée ou servie entre-temps, sur une instance fermée : pas de compte sans arbre
          await app.prisma.user.delete({ where: { id: user.id } })
          return reply.code(410).send({ error: 'invitation_invalid' })
        }
      }

      return reply.code(201).send({ token: signUserSession(app, user), user: { ...user, hasPassword: true }, joinedTreeId })
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
      if (!env.PASSWORD_LOGIN) {
        return reply.code(403).send({ error: 'password_login_disabled' })
      }

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
          firstName: true,
          passwordHash: true,
        },
      })

      // Adresse inconnue, ou compte né d'une connexion OIDC (sans mot de passe) : même durée qu'un mauvais mot de
      // passe, la réponse ne dit pas si l'adresse a un compte
      if (!user?.passwordHash) {
        await verifyPassword(parsed.data.password, await getDummyHash())
        return reply.code(401).send({ error: 'invalid_credentials' })
      }

      const isValid = await verifyPassword(parsed.data.password, user.passwordHash)
      if (!isValid) {
        return reply.code(401).send({ error: 'invalid_credentials' })
      }

      // Connexion depuis un arbre provisoire (« Déjà un compte ? » dans « Gardez votre arbre ») : l'arbre rejoint le
      // compte retrouvé au lieu d'être perdu
      if (request.actor?.kind === 'user' && request.actor.email === null) {
        await adoptProvisionalAccount(app.prisma, request.actor.userId, user.id)
      }

      return reply.send({
        token: signUserSession(app, user),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          hasPassword: true,
        },
      })
    },
  )

  // Profil du compte connecté (prénom compris) : la session restaurée sur un autre appareil le retrouve
  app.get('/me', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const user = await app.prisma.user.findUnique({
      where: { id: request.actor.userId },
      select: { id: true, email: true, firstName: true, passwordHash: true, createdAt: true, identities: { select: { id: true }, take: 1 } },
    })
    if (!user) {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    // Compte provisoire : l'app propose de garder l'arbre, et dit jusqu'à quand il reste
    if (isProvisional(user)) {
      return reply.send({ user: { id: user.id, email: null, firstName: user.firstName, hasPassword: false, oidcLinked: false, provisional: true, provisionalUntil: provisionalExpiry(user.createdAt) } })
    }

    // hasPassword : l'écran de suppression demande le mot de passe, ou l'email pour un compte sans mot de passe.
    // oidcLinked : le compte se connecte déjà par le fournisseur ; sinon le compte propose « Relier à … »
    return reply.send({ user: { id: user.id, email: user.email, firstName: user.firstName, hasPassword: confirmsWithPassword(user.passwordHash), oidcLinked: (user.identities?.length ?? 0) > 0, provisional: false } })
  })

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

  app.delete(
    '/me',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      if (!request.actor || request.actor.kind !== 'user') {
        return reply.code(401).send({ error: 'authentication_required' })
      }

      const parsed = deleteAccountSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() })
      }

      const userId = request.actor.userId
      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      })

      if (!user) {
        return reply.code(401).send({ error: 'authentication_required' })
      }

      const payload = await request.jwtVerify<AnyJwtPayload & { exp?: number; iat?: number }>()

      const withPassword = confirmsWithPassword(user.passwordHash)
      if (!withPassword) {
        // Compte né d'une connexion OIDC, ou dont la connexion par mot de passe est fermée : pas de mot de passe à
        // redonner. Il retape son email, et la session doit venir d'une connexion récente chez le fournisseur
        // (une session volée ou oubliée ouverte ne suffit pas).
        const sessionAgeMs = typeof payload.iat === 'number' ? Date.now() - payload.iat * 1000 : Infinity
        if (sessionAgeMs > RECENT_SIGN_IN_MS) {
          return reply.code(403).send({ error: 'recent_sign_in_required' })
        }
      }

      const isValid = withPassword
        ? Boolean(parsed.data.password) && await verifyPassword(parsed.data.password as string, user.passwordHash as string)
        : (parsed.data.confirmEmail ?? '').trim().toLowerCase() === user.email
      if (!isValid) {
        return reply.code(403).send({ error: 'invalid_password' })
      }


      // Arbres possédés (y compris ceux marqués supprimés) puis compte, dans une seule transaction :
      // la relation propriétaire est en Restrict, les arbres doivent partir avant l'utilisateur.
      const ownedTreeIds = await app.prisma.$transaction((tx) => deleteAccountRecords(tx, userId))

      if (payload.kind === 'user' && typeof payload.exp === 'number') {
        await revokeUserToken(app.prisma, payload.jti, payload.exp)
      }

      await removeTreeMediaDirectories(ownedTreeIds, request.log)

      return reply.send({ ok: true })
    },
  )

  app.post('/logout', async (request, reply) => {
    if (!request.actor || request.actor.kind !== 'user') {
      return reply.code(401).send({ error: 'authentication_required' })
    }

    const payload = await request.jwtVerify<AnyJwtPayload & { exp?: number }>()
    if (payload.kind !== 'user') {
      return reply.code(401).send({ error: 'invalid_token_kind' })
    }

    if (typeof payload.exp === 'number') {
      await revokeUserToken(app.prisma, payload.jti, payload.exp)
    }

    return reply.send({ ok: true })
  })
}
