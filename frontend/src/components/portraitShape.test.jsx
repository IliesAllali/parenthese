import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PortraitShapeField from './PortraitShapeField.jsx'

// Forme des portraits (Patch, 23/11) : variées par défaut, ou la même pour toute la famille
const clean = (html) => html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
const field = (props = {}) => clean(renderToStaticMarkup(<PortraitShapeField onChange={() => {}} {...props} />))
const checked = (html) => [...html.matchAll(/aria-checked="true"[^>]*>([^<]+)</g)].map((match) => match[1])

describe('le réglage de la forme des portraits', () => {
  it('propose Variées, Rondes, Carrées et Polaroïd dans un groupe de choix', () => {
    const html = field()
    expect(html).toContain('Forme des portraits')
    expect(html).toContain('role="radiogroup"')
    for (const label of ['Variées', 'Rondes', 'Carrées', 'Polaroïd']) expect(html).toContain(`>${label}<`)
    expect(html.match(/role="radio"/g)).toHaveLength(4)
  })

  it('montre « Variées » par défaut, sinon la forme de l arbre', () => {
    expect(checked(field())).toEqual(['Variées'])
    expect(checked(field({ value: 'square' }))).toEqual(['Carrées'])
    expect(checked(field({ value: 'polaroid' }))).toEqual(['Polaroïd'])
  })

  it('se bloque pendant l enregistrement', () => {
    expect(field({ disabled: true }).match(/disabled=""/g)).toHaveLength(4)
  })
})
