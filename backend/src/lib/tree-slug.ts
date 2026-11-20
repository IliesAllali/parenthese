import type { PrismaClient } from '../generated/prisma/client.js'

// L'adresse d'un arbre (/arbre/<slug>) vient de son nom et doit être unique. Deux familles Martin
// ne doivent pas se gêner : la seconde reçoit famille-martin-2, puis -3, et ainsi de suite (#251).

export const SLUG_MAX_LENGTH = 64

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9-]{3,64}$/.test(value)
}

function withSuffix(base: string, n: number): string {
  const suffix = `-${n}`
  return `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`
}

// Première adresse libre parmi base, base-2, base-3… ; `taken` contient les adresses déjà prises.
export function nextFreeSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = withSuffix(base, n)
    if (!used.has(candidate)) return candidate
  }
}

// Les arbres supprimés gardent leur adresse jusqu'à la purge : ils comptent comme pris.
export async function findFreeSlug(
  prisma: Pick<PrismaClient, 'tree'>,
  base: string,
  exceptTreeId?: string,
): Promise<string> {
  // Un suffixe long raccourcit la base : on ratisse large, le tri se fait dans nextFreeSlug
  const stem = base.slice(0, SLUG_MAX_LENGTH - 6)
  const rows = await prisma.tree.findMany({
    where: {
      slug: { startsWith: stem },
      ...(exceptTreeId ? { NOT: { id: exceptTreeId } } : {}),
    },
    select: { slug: true },
  })
  return nextFreeSlug(base, rows.map((row) => row.slug))
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002'
}
