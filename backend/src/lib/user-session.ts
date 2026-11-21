import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'

import { env } from '../config/env.js'
import type { UserJwtPayload } from '../types/auth.js'
import { isProvisional, PROVISIONAL_COOKIE, PROVISIONAL_MAX_AGE_S, PROVISIONAL_SESSION_EXPIRES_IN } from './provisional-account.js'
import { isUserTokenRevoked } from './token-revocation.js'

// Session d'un compte, la même quelle que soit la façon de se connecter (mot de passe ou fournisseur OIDC).
// Un compte provisoire garde sa session aussi longtemps que son arbre : 30 jours depuis la dernière visite, sans
// reconnexion possible.
export function signUserSession(app: FastifyInstance, user: { id: string; email: string | null }): string {
  return app.jwt.sign(
    {
      kind: 'user',
      sub: user.id,
      jti: randomUUID(),
      userId: user.id,
      email: user.email,
    },
    { expiresIn: isProvisional(user) ? PROVISIONAL_SESSION_EXPIRES_IN : env.JWT_EXPIRES_IN },
  )
}

// Une session de compte encore valable : ni fermée, ni antérieure à SESSIONS_NOT_BEFORE, ni d'un compte supprimé.
// Le jeton vient de l'en-tête (app.ts) ou du cookie d'un compte provisoire (routes/auth.ts, /provisional/resume).
export async function isUserSessionValid(app: FastifyInstance, payload: UserJwtPayload): Promise<boolean> {
  if (isUserTokenRevoked(payload.jti)) return false
  if (typeof payload.iat !== 'number' || payload.iat * 1000 < env.SESSIONS_NOT_BEFORE.getTime()) return false
  return (await app.prisma.user.count({ where: { id: payload.userId } })) > 0
}

// Le double de la session provisoire, hors de portée du JavaScript de la page. Même origine que l'app en
// production (/api), donc un cookie de premier niveau que Safari ne plafonne pas à 7 jours.
export function setProvisionalCookie(request: FastifyRequest, reply: FastifyReply, token: string): void {
  reply.setCookie(PROVISIONAL_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: request.protocol === 'https',
    maxAge: PROVISIONAL_MAX_AGE_S,
  })
}

export function clearProvisionalCookie(request: FastifyRequest, reply: FastifyReply): void {
  if (request.cookies[PROVISIONAL_COOKIE] !== undefined) reply.clearCookie(PROVISIONAL_COOKIE, { path: '/' })
}
