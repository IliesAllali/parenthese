import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'

import { env } from '../config/env.js'
import { isProvisional, PROVISIONAL_SESSION_EXPIRES_IN } from './provisional-account.js'

// Session d'un compte, la même quelle que soit la façon de se connecter (mot de passe ou fournisseur OIDC).
// Un compte provisoire garde sa session aussi longtemps que son arbre : 30 jours, sans reconnexion possible.
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
