// Injecte le HTML de la landing, rendu par React à la compilation, dans dist/index.html.
// Lancé par `npm run build` après le build client (dist/) et le build SSR (dist-ssr/).
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const indexPath = `${root}dist/index.html`
const ssrDir = `${root}dist-ssr`
const MARKER = '<div id="root"></div>'

const { render } = await import(pathToFileURL(`${ssrDir}/entry-server.js`).href)
const appHtml = render()
if (!appHtml || !appHtml.includes('<h1')) throw new Error('Prérendu vide ou sans H1')

const template = await readFile(indexPath, 'utf8')
if (!template.includes(MARKER)) throw new Error(`${MARKER} introuvable dans dist/index.html`)

await writeFile(indexPath, template.replace(MARKER, `<div id="root">${appHtml}</div>`))
await rm(ssrDir, { recursive: true, force: true })

console.log(`Prérendu injecté dans dist/index.html (${Math.round(appHtml.length / 1024)} Ko de HTML)`)
