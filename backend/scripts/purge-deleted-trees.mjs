// Purge définitive des arbres marqués supprimés (deletedAt non nul) : base et dossiers médias.
//
// Usage, depuis backend/ après `npm run build` :
//   node scripts/purge-deleted-trees.mjs            liste les arbres concernés, ne modifie rien
//   node scripts/purge-deleted-trees.mjs --apply    les supprime définitivement
//
// Le script réutilise la logique compilée de dist/lib/tree-purge.js, la même que l'API.
// Il n'affiche que des identifiants, jamais de nom d'arbre ni d'adresse email.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distLibDir = path.join(backendDir, 'dist', 'lib')
const apply = process.argv.includes('--apply')

// Même répertoire de travail que le serveur : .env et MEDIA_STORAGE_PATH relatif se résolvent pareil.
process.chdir(backendDir)

if (!existsSync(path.join(distLibDir, 'tree-purge.js'))) {
  console.error('Build introuvable : lancez `npm run build` dans backend/ avant ce script.')
  process.exit(1)
}

const { prisma } = await import(pathToFileURL(path.join(distLibDir, 'prisma.js')).href)
const { purgeTrees } = await import(pathToFileURL(path.join(distLibDir, 'tree-purge.js')).href)

const logger = {
  warn: (details, message) => console.warn(message, details),
  error: (details, message) => console.error(message, details),
}

try {
  const trees = await prisma.tree.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true },
    orderBy: { deletedAt: 'asc' },
  })
  const treeIds = trees.map((tree) => tree.id)

  console.log(`${treeIds.length} arbre(s) marqué(s) supprimé(s).`)
  for (const treeId of treeIds) {
    console.log(`  ${treeId}`)
  }

  if (treeIds.length === 0) {
    // Rien à faire.
  } else if (!apply) {
    console.log('Simulation : aucune modification. Relancez avec --apply pour purger définitivement.')
  } else {
    const count = await purgeTrees(prisma, treeIds, logger)
    console.log(`${count} arbre(s) purgé(s) en base, dossiers médias supprimés.`)
  }
} catch (error) {
  console.error('Échec de la purge :', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
