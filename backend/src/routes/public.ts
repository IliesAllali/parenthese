import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const slugParamSchema = z.object({
  slug: z.string().min(3).max(64),
})

export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/arbre/:slug', async (request, reply) => {
    const params = slugParamSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_slug' })
    }

    const tree = await app.prisma.tree.findFirst({
      where: {
        slug: params.data.slug,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
      },
    })

    if (!tree) {
      return reply.code(404).send({ error: 'tree_not_found' })
    }

    // Route publique, appelée avant tout mot de passe : rien sur le propriétaire (ni son email, ni sa partie locale).
    return reply.send({
      tree: {
        id: tree.id,
        slug: tree.slug,
        name: tree.name,
        description: tree.description,
      },
    })
  })
}
