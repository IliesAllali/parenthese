import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { COPY, LOCALES, localeFromPath, withAppQuery } from '../src/i18n.js'
import { localizeHead } from '../scripts/localize-head.mjs'

const landing = new URL('..', import.meta.url)
const read = (path) => readFileSync(new URL(path, landing), 'utf8')

// Clés présentes dans une langue et absentes de l'autre (null compte comme présent : section retirée exprès)
function missingKeys(a, b, prefix = '') {
  return Object.keys(a).flatMap((key) => {
    const path = `${prefix}${key}`
    if (!(key in b)) return [path]
    if (a[key] && b[key] && typeof a[key] === 'object' && typeof b[key] === 'object') return missingKeys(a[key], b[key], `${path}.`)
    return []
  })
}

test('fr and en copy have the same keys', () => {
  assert.deepEqual(missingKeys(COPY.fr, COPY.en), [])
  assert.deepEqual(missingKeys(COPY.en, COPY.fr), [])
})

test('english copy follows the wording rules', () => {
  const text = JSON.stringify(COPY.en)
  assert.doesNotMatch(text, /open.?source/i)
  assert.doesNotMatch(text, /—/)
})

test('localeFromPath serves english under /en only', () => {
  assert.equal(localeFromPath('/'), 'fr')
  assert.equal(localeFromPath('/en'), 'en')
  assert.equal(localeFromPath('/en/'), 'en')
  assert.equal(localeFromPath('/enfance/'), 'fr')
  assert.equal(localeFromPath('/cousinade/'), 'fr')
})

test('app links carry lang=en on the english page only', () => {
  assert.equal(withAppQuery('https://app.parenthese.io/?embed', 'fr'), 'https://app.parenthese.io/?embed')
  assert.equal(withAppQuery('https://app.parenthese.io/?embed', 'en'), 'https://app.parenthese.io/?embed&lang=en')
})

test('localizeHead rewrites the french head for english', () => {
  const html = localizeHead(read('index.html'), COPY.en.meta)
  assert.match(html, /<html lang="en">/)
  assert.match(html, /<link rel="canonical" href="https:\/\/parenthese.io\/en\/" \/>/)
  assert.match(html, /<meta property="og:url"\s+content="https:\/\/parenthese.io\/en\/"/)
  assert.match(html, /<meta property="og:locale"\s+content="en_US"/)
  assert.ok(html.includes(`<title>${COPY.en.meta.title}</title>`))
  assert.doesNotMatch(html, /"inLanguage": "fr-FR"/)
})

test('both pages declare the same hreflang alternates', () => {
  const html = read('index.html')
  assert.match(html, /hreflang="fr" href="https:\/\/parenthese.io\/"/)
  assert.match(html, /hreflang="en" href="https:\/\/parenthese.io\/en\/"/)
  assert.match(html, /hreflang="x-default" href="https:\/\/parenthese.io\/"/)
})

// Après `npm run build` seulement (la CI lance les tests avant le build)
const built = existsSync(new URL('dist/en/index.html', landing))
test('built pages are prerendered in their language', { skip: !built && 'dist absent, lancer npm run build' }, () => {
  for (const locale of LOCALES) {
    const html = read(locale === 'fr' ? 'dist/index.html' : 'dist/en/index.html')
    assert.match(html, new RegExp(`<html lang="${locale}">`))
    assert.match(html, /<div id="root">[\s\S]*<h1[\s\S]*<\/h1>/)
    assert.match(html, /hreflang="x-default"/)
    assert.ok(html.includes(COPY[locale].meta.url), `canonical ${locale}`)
  }
})
