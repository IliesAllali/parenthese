// Injecte le HTML de la landing, rendu par React à la compilation, dans dist/index.html (français)
// et dist/en/index.html (anglais, head réécrit par localize-head.mjs).
// Lancé par `npm run build` après le build client (dist/) et le build SSR (dist-ssr/).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { COPY } from '../src/i18n.js'
import { localizeHead } from './localize-head.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const indexPath = `${root}dist/index.html`
const ssrDir = `${root}dist-ssr`
const MARKER = '<div id="root"></div>'

// Langue -> fichier de sortie. Le français garde le head de index.html tel quel.
const PAGES = [
  { locale: 'fr', out: indexPath },
  { locale: 'en', out: `${root}dist/en/index.html`, dir: `${root}dist/en` },
]

const { render } = await import(pathToFileURL(`${ssrDir}/entry-server.js`).href)
const template = await readFile(indexPath, 'utf8')
if (!template.includes(MARKER)) throw new Error(`${MARKER} introuvable dans dist/index.html`)

for (const { locale, out, dir } of PAGES) {
  const appHtml = render(locale)
  if (!appHtml || !appHtml.includes('<h1')) throw new Error(`Prérendu ${locale} vide ou sans H1`)

  const head = locale === 'fr' ? template : localizeHead(template, COPY[locale].meta)
  if (dir) await mkdir(dir, { recursive: true })
  await writeFile(out, head.replace(MARKER, `<div id="root">${appHtml}</div>`))
  console.log(`Prérendu ${locale} injecté dans ${out.slice(root.length)} (${Math.round(appHtml.length / 1024)} Ko de HTML)`)
}

await rm(ssrDir, { recursive: true, force: true })
