import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FALLBACK_LOCALE, LANGUAGES, frenchTypography, pickLocale, t, translate } from './index.js'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'i18n' ? [] : sourceFiles(path)
    return /\.(js|jsx)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

// Appels t('…') ou t("…") à texte littéral. Les appels à clé calculée ne sont pas vérifiables ici.
function literalKeys(code) {
  const keys = []
  const re = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g
  let match
  while ((match = re.exec(code))) keys.push(match[2].replace(/\\(['"\\])/g, '$1'))
  return keys
}

describe('i18n', () => {
  it('garde le français tel quel et remplace les variables', () => {
    expect(t('Bonjour')).toBe('Bonjour')
    expect(t('{n} personnes', { n: 3 })).toBe('3 personnes')
  })

  // Textes passés à t() sans entrée dans le dictionnaire d'une langue
  const usedKeys = () => sourceFiles(SRC).flatMap((file) => literalKeys(readFileSync(file, 'utf8')).map((key) => ({ file, key })))
  const missingIn = (dictionary) => usedKeys()
    .filter(({ key }) => !Object.prototype.hasOwnProperty.call(dictionary, key))
    .map(({ file, key }) => `${file.slice(SRC.length)} : ${key}`)

  it('chaque texte passé à t() a sa traduction anglaise', () => {
    expect(missingIn(LANGUAGES[FALLBACK_LOCALE].dictionary)).toEqual([])
  })

  // Les autres langues retombent sur l'anglais : un texte pas encore traduit est signalé, sans faire
  // échouer les tests, pour qu'un nouveau texte en français et en anglais suffise à une contribution.
  for (const [code, { dictionary }] of Object.entries(LANGUAGES)) {
    if (!dictionary || code === FALLBACK_LOCALE) continue
    it(`signale les textes pas encore traduits (${code})`, () => {
      const gaps = [...new Set(missingIn(dictionary))]
      if (gaps.length) console.warn(`[i18n] ${gaps.length} texte(s) sans traduction (${code}), affichés en anglais :\n${gaps.join('\n')}`)
    })
  }

  it('les traductions gardent les mêmes variables', () => {
    const vars = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
    const mismatched = Object.entries(LANGUAGES)
      .filter(([, { dictionary }]) => dictionary)
      .flatMap(([code, { dictionary }]) => Object.entries(dictionary).filter(([fr, text]) => vars(fr) !== vars(text)).map(([fr]) => `${code} : ${fr}`))
    expect(mismatched).toEqual([])
  })

  it('pose les espaces insécables du français sans toucher aux variables', () => {
    expect(frenchTypography('Quitter {em} ?')).toBe('Quitter {em}\u202F?')
    expect(frenchTypography('Prénom : {name}')).toBe('Prénom\u00A0: {name}')
    expect(frenchTypography('Touchez « Ajouter »')).toBe('Touchez «\u00A0Ajouter\u00A0»')
    expect(frenchTypography('Jusqu’à 20 Mo, {n} Mo')).toBe('Jusqu’à 20\u00A0Mo, {n}\u00A0Mo')
    expect(frenchTypography('https://app.parenthese.io/?lang=fr')).toBe('https://app.parenthese.io/?lang=fr')
    expect(frenchTypography('?')).toBe('?')
  })

  it('choisit la langue : adresse, puis choix mémorisé, puis navigateur, anglais à défaut', () => {
    expect(pickLocale({ fromUrl: 'en', stored: 'fr', languages: ['fr'] })).toBe('en')
    expect(pickLocale({ fromUrl: 'xx', stored: 'fr', languages: ['en'] })).toBe('fr')
    expect(pickLocale({ stored: 'xx', languages: ['fr-CA'] })).toBe('fr')
    expect(pickLocale({ languages: ['en-US', 'fr'] })).toBe('fr')
    expect(pickLocale({ languages: ['en-US'] })).toBe('en')
    expect(pickLocale({ languages: ['ja', 'es-ES'] })).toBe('en')
    expect(pickLocale()).toBe('en')
  })

  it('retombe sur l’anglais puis sur le français pour un texte non traduit', () => {
    LANGUAGES.xx = { name: 'Test', region: 'en-GB', dictionary: { 'Bonjour': 'Hallo' } }
    try {
      expect(translate('xx', 'Bonjour')).toBe('Hallo')
      expect(translate('xx', 'Mot de passe')).toBe(LANGUAGES.en.dictionary['Mot de passe'])
      expect(translate('xx', 'Texte inconnu ?')).toBe('Texte inconnu ?')
      expect(translate('fr', 'Texte inconnu ?')).toBe('Texte inconnu\u202F?')
    } finally {
      delete LANGUAGES.xx
    }
  })
})
