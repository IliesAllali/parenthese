// Pose la mesure d'audience (src/pages.js, nom à empreinte lu dans le manifeste de Vite) dans chaque page
// statique de dist/ : guides, aide, vidéo, vie privée. Ces pages viennent de public/ et ne passent pas par
// Vite. La page d'accueil (fr et en, <div id="root">) a déjà sa propre mesure (App.jsx), elle est sautée.
// Lancé par `npm run build` après scripts/prerender.mjs.
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist', import.meta.url))
const manifestPath = join(dist, '.vite', 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const entry = manifest['src/pages.js']
if (!entry?.file) throw new Error('src/pages.js absent du manifeste de Vite')
const tag = `<script type="module" src="/${entry.file}"></script>`

async function* htmlFiles(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name)
    if (item.isDirectory()) yield* htmlFiles(path)
    else if (item.name === 'index.html') yield path
  }
}

let injected = 0
for await (const path of htmlFiles(dist)) {
  const html = await readFile(path, 'utf8')
  if (html.includes('<div id="root">')) continue
  if (html.includes(tag)) continue
  if (!html.includes('</body>')) throw new Error(`</body> introuvable dans ${path}`)
  await writeFile(path, html.replace('</body>', `  ${tag}\n</body>`))
  injected++
}
if (injected === 0) throw new Error('Aucune page statique trouvée pour la mesure d\'audience')

// Le manifeste ne sert qu'au build, il n'a rien à faire en ligne
await rm(join(dist, '.vite'), { recursive: true, force: true })
console.log(`Mesure d'audience posée dans ${injected} pages statiques (${entry.file})`)
