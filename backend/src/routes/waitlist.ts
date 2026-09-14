import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { syncWaitlistSignup } from '../lib/waitlist-mailer.js'

const waitlistSchema = z.object({
  email: z.string().trim().email(),
  prenom: z.string().trim().max(100).optional(),
  source: z.string().trim().max(200).default('direct'),
})

export const waitlistRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/waitlist',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const body = waitlistSchema.safeParse(request.body)
      if (!body.success) {
        return reply.code(400).send({ error: 'validation_error', message: 'Email invalide.' })
      }

      const { email, prenom, source } = body.data
      const normalizedEmail = email.toLowerCase()

      await app.prisma.waitlistEntry.create({
        data: {
          email: normalizedEmail,
          prenom: prenom || null,
          source,
        },
      })

      try {
        await syncWaitlistSignup(
          {
            email: normalizedEmail,
            prenom: prenom || null,
            source,
          },
          request.log,
        )
      } catch (error) {
        request.log.warn({ err: error, email: normalizedEmail, source }, 'Waitlist signup saved but Resend sync failed')
      }

      return reply.code(200).send({ ok: true })
    },
  )
}
