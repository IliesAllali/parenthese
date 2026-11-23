import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PortraitShapeField from './PortraitShapeField.jsx'

// Forme des portraits (Patch, 23/11) : variés par défaut, ou la même pour toute la famille
const clean = (html) => html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
const field = (props = {}) => clean(renderToStaticMarkup(<PortraitShapeField onChange={() => {}} {...props} />))
const checked = (html) => [...html.matchAll(/aria-checked="true"[^>]*>([^<]+)</g)].map((match) => match[1])

describe('le réglage de la forme des portraits', () => {
  it('propose Variés, Ronds, Carrés et Polaroïd sous « Portraits », sans phrase d explication', () => {
    const html = field()
    expect(html).toContain('>Portraits<')
    expect(html).not.toContain('<small')
    expect(html).toContain('role="radiogroup"')
    for (const label of ['Variés', 'Ronds', 'Carrés', 'Polaroïd']) expect(html).toContain(`>${label}<`)
    expect(html.match(/role="radio"/g)).toHaveLength(4)
  })

  it('montre « Variés » par défaut, sinon la forme de l arbre', () => {
    expect(checked(field())).toEqual(['Variés'])
    expect(checked(field({ value: 'square' }))).toEqual(['Carrés'])
    expect(checked(field({ value: 'polaroid' }))).toEqual(['Polaroïd'])
  })

  it('se bloque pendant l enregistrement', () => {
    expect(field({ disabled: true }).match(/disabled=""/g)).toHaveLength(4)
  })
})
