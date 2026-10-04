import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import en from './en/index.js'
import { frenchTypography, t } from './index.js'

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

  it('chaque texte passé à t() a sa traduction anglaise', () => {
    const missing = []
    for (const file of sourceFiles(SRC)) {
      for (const key of literalKeys(readFileSync(file, 'utf8'))) {
        if (!Object.prototype.hasOwnProperty.call(en, key)) missing.push(`${file.slice(SRC.length)} : ${key}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('les traductions gardent les mêmes variables', () => {
    const vars = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
    const mismatched = Object.entries(en).filter(([fr, english]) => vars(fr) !== vars(english)).map(([fr]) => fr)
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
})
