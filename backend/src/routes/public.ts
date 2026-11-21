import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { env } from '../config/env.js'
import { cachedLinkPreview, previewKey } from '../lib/link-preview.js'

const slugParamSchema = z.object({
  slug: z.string().min(3).max(64),
})

const PREVIEW_SELECT = { id: true, slug: true, name: true, description: true, icon: true, imagePath: true, imageCrop: true, imageUpdatedAt: true } as const

const escapeAttribute = (value: string) => value
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function frontendIndexPath(): string {
  return env.FRONTEND_INDEX_PATH || path.resolve(process.cwd(), '../frontend/dist/index.html')
}

// Adresse publique de l'app, telle que nginx la reçoit : les robots d'aperçu veulent des adresses complètes
function publicOrigin(request: FastifyRequest): string {
  const forwarded = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwarded === 'http' || forwarded === 'https' ? forwarded : request.protocol
  return `${protocol}://${request.headers.host}`
}

// Remplace le contenu d'une balise <meta> de la page, ou l'ajoute avant </head> si elle manque
function setMeta(html: string, attribute: 'property' | 'name', key: string, content: string): string {
  const tag = `<meta ${attribute}="${key}" content="${escapeAttribute(content)}" />`
  // Les clés sont fixes (og:title, twitter:image…) : rien à échapper dans l'expression
  const pattern = new RegExp(`<meta ${attribute}="${key}" content="[^"]*"\\s*/?>`)
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`)
}

export const publicRoutes: FastifyPluginAsync = async (app) => {
  // Arbre d'une adresse : l'actuelle, ou une ancienne adresse d'un arbre renommé. Un arbre supprimé n'existe plus.
  const findTreeBySlug = async (slug: string) => {
    const alias = await app.prisma.treeSlugAlias.findUnique({ where: { slug }, select: { treeId: true } })
    return app.prisma.tree.findFirst({
      where: { ...(alias ? { id: alias.treeId } : { slug }), deletedAt: null },
      select: PREVIEW_SELECT,
    })
  }

  // La page /arbre/… (nginx l'adresse ici) : la page de l'app, avec l'aperçu du lien de cet arbre. WhatsApp et
  // Messenger ne lisent pas le JavaScript : sans ces balises, tous les liens montreraient le même aperçu.
  // Le titre est le nom de l'arbre, l'image son cadre (lib/link-preview.ts). Un arbre inconnu ou supprimé garde
  // l'aperçu générique de la page.
  app.get('/page-arbre/:slug', { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (request, reply) => {
    let html: string
    try {
      html = await readFile(frontendIndexPath(), 'utf8')
    } catch {
      // nginx sert alors la page de l'app telle quelle
      return reply.code(503).send({ error: 'frontend_unavailable' })
    }
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate').type('text/html; charset=utf-8')

    const params = slugParamSchema.safeParse(request.params)
    const tree = params.success ? await findTreeBySlug(params.data.slug) : null
    if (!tree) return reply.send(html)

    const origin = publicOrigin(request)
    const image = `${origin}/api/arbre/${encodeURIComponent(tree.slug)}/apercu.png?v=${previewKey(tree)}`
    let page = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeAttribute(tree.name)} · Parenthèse</title>`)
    page = setMeta(page, 'property', 'og:title', tree.name)
    page = setMeta(page, 'property', 'og:url', `${origin}/arbre/${encodeURIComponent(tree.slug)}`)
    page = setMeta(page, 'property', 'og:image', image)
    page = setMeta(page, 'property', 'og:image:alt', `Le visuel de l'arbre ${tree.name}`)
    page = setMeta(page, 'name', 'twitter:image', image)
    return reply.send(page)
  })

  // L'image de l'aperçu, 1200 × 630, faite une fois puis gardée tant que le nom et le visuel ne changent pas
  app.get('/arbre/:slug/apercu.png', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const params = slugParamSchema.safeParse(request.params)
    if (!params.success) return reply.code(400).send({ error: 'invalid_slug' })
    const tree = await findTreeBySlug(params.data.slug)
    if (!tree) return reply.code(404).send({ error: 'tree_not_found' })
    const image = await cachedLinkPreview(tree, path.resolve(env.MEDIA_STORAGE_PATH))
    return reply
      .header('Cache-Control', 'public, max-age=86400')
      .type('image/png')
      .send(image)
  })

  // Limité : sans route authentifiée, c'est la porte pour énumérer les noms de famille et trouver l'id d'un arbre
  app.get('/arbre/:slug', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
    const params = slugParamSchema.safeParse(request.params)
    if (!params.success) {
      return reply.code(400).send({ error: 'invalid_slug' })
    }

    // L'adresse actuelle, ou une ancienne adresse d'un arbre renommé : le lien déjà envoyé mène encore à lui
    const tree = await findTreeBySlug(params.data.slug)

    if (!tree) {
      return reply.code(404).send({ error: 'tree_not_found' })
    }

    // Route publique, appelée avant tout mot de passe : rien sur le propriétaire (ni son email, ni sa partie locale).
    // L'icône aide la famille à reconnaître son arbre ; la photo ne sort jamais ici (la porte montre alors la lettre).
    return reply.send({
      tree: {
        id: tree.id,
        slug: tree.slug,
        name: tree.name,
        description: tree.description,
        icon: tree.imagePath ? null : tree.icon,
      },
    })
  })
}
