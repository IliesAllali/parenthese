import { describe, expect, it } from 'vitest'
import { translate } from '../i18n/index.js'
import { proposalTitle } from './proposalSummary.js'

// Titres écrits en français par le serveur : recomposés avec t(), donc traduits en anglais et en allemand
describe('titre d’une proposition', () => {
  it('reconnaît les titres du serveur et garde le prénom', () => {
    expect(proposalTitle('Souvenir pour Marie')).toBe('Souvenir pour Marie')
    expect(proposalTitle('Moment pour Jean-Pierre')).toBe('Moment pour Jean-Pierre')
    expect(proposalTitle('Personnes sur un souvenir')).toBe('Personnes sur un souvenir')
  })

  it('a une traduction pour chacun', () => {
    for (const lang of ['en', 'de']) {
      for (const key of ['Souvenir pour {name}', 'Moment pour {name}', 'Personnes sur un souvenir']) {
        expect(translate(lang, key)).not.toBe(key)
      }
    }
  })

  it('laisse les autres titres tels quels, et nomme une proposition sans titre', () => {
    expect(proposalTitle('Ajout de Zoé')).toBe('Ajout de Zoé')
    expect(proposalTitle('')).toBe('Proposition sans titre')
  })
})
