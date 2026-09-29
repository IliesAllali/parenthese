// Chaque lien interne des pages statiques et de l'accueil mène à une page qui existe dans public/.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COPY } from '../src/i18n.js'

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url))
// Pages rendues par React, absentes de public/.
const HOMES = new Set(['/', '/en/'])

function exists(href) {
  const path = href.split('#')[0].split('?')[0]
  if (HOMES.has(path)) return true
  const target = join(PUBLIC, path)
  return existsSync(path.endsWith('/') ? join(target, 'index.html') : target)
}

function htmlPages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return htmlPages(path)
    return name === 'index.html' ? [path] : []
  })
}

test("les liens de l'accueil, dans les deux langues, mènent à une page existante", () => {
  const broken = []
  for (const [locale, copy] of Object.entries(COPY)) {
    const hrefs = [copy.privacyHref, ...(copy.guides?.items ?? []).map((item) => item.href)]
    for (const href of hrefs) if (!exists(href)) broken.push(`${locale} : ${href}`)
  }
  assert.deepEqual(broken, [])
})

test('les liens internes des pages statiques mènent à une page existante', () => {
  const broken = []
  for (const file of htmlPages(PUBLIC)) {
    const html = readFileSync(file, 'utf8')
    for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
      if (!exists(href)) broken.push(`${file.slice(PUBLIC.length)} : ${href}`)
    }
  }
  assert.deepEqual(broken, [])
})
