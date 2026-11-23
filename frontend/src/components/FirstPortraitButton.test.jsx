import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FirstPortraitButton from './FirstPortraitButton.jsx'
import { translate } from '../i18n/index.js'
import { INIT_MAX_SCALE, NODE_LABEL_LINE, NODE_LABEL_Y, PERSON_R } from './galaxy/constants'
import { drawFirstPortrait, FIRST_PORTRAIT_HALF } from './galaxy/renderers'

// Arbre vide (Patch, 23/11) : un premier portrait à la place de la carte « Ajouter une personne »
const recorder = () => {
  const calls = []
  const ctx = new Proxy({}, {
    get: (_, name) => (...args) => { calls.push([name, ...args]) },
    set: (_, name, value) => { calls.push(['=' + String(name), value]); return true },
  })
  return { ctx, calls }
}

describe('le premier portrait d’un arbre vide', () => {
  it('est un bouton nommé « Ajouter une première personne », avec « Vous » et « Commencez par vous »', () => {
    const html = renderToStaticMarkup(<FirstPortraitButton onClick={() => {}} />)
    expect(html).toMatch(/^<button type="button" class="first-portrait"/)
    expect(html).toContain('aria-label="Ajouter une première personne"')
    expect(html).toContain('>Vous<')
    expect(html).toContain('>Commencez par vous<')
    expect(html).not.toContain('empty-tree-add')
  })

  it('pose le portrait au zoom d’arrivée, prénom et ligne placés comme sur un nœud', () => {
    const html = renderToStaticMarkup(<FirstPortraitButton onClick={() => {}} />)
    expect(html).toContain(`--fp-scale:${INIT_MAX_SCALE}`)
    expect(html).toContain(`--fp-name-y:${FIRST_PORTRAIT_HALF + NODE_LABEL_Y}px`)
    expect(html).toContain(`--fp-line-y:${FIRST_PORTRAIT_HALF + NODE_LABEL_Y + NODE_LABEL_LINE}px`)
  })

  it('dessine un cadre carré sans photo et la pastille « + » terracotta sur la diagonale, dans son canevas', () => {
    const { ctx, calls } = recorder()
    drawFirstPortrait(ctx)
    const s = PERSON_R + 4
    expect(calls).toContainEqual(['roundRect', -s - 3, -s - 3, (s + 3) * 2, (s + 3) * 2, 4])
    expect(calls).toContainEqual(['=fillStyle', '#F2EFEA'])
    const d = (PERSON_R + 6) * Math.SQRT1_2
    const disc = calls.find((c) => c[0] === 'arc' && c[3] === 9)
    expect(disc[1]).toBeCloseTo(d)
    expect(disc[2]).toBeCloseTo(-d)
    expect(calls).toContainEqual(['=fillStyle', '#D2694A'])
    expect(d + 11).toBeLessThanOrEqual(FIRST_PORTRAIT_HALF)
    expect(s + 3).toBeLessThanOrEqual(FIRST_PORTRAIT_HALF)
  })

  it('se traduit en anglais et en allemand', () => {
    expect(translate('en', 'Vous')).toBe('You')
    expect(translate('en', 'Commencez par vous')).toBe('Start with yourself')
    expect(translate('de', 'Commencez par vous')).toBe('Fang bei dir an')
  })
})
