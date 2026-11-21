import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AccessGate from './AccessGate.jsx'
import AvatarMenu from './navbar/AvatarMenu.jsx'
import TreeMark from './TreeMark.jsx'
import TreeVisualField from './TreeVisualField.jsx'
import { TREE_ICONS, treeImageSrc, visualModeOf, visualPayload } from '../utils/treeVisual.js'

// Visuel de l'arbre (Patch, 21/11) : la première lettre, une icône dans un menu, ou une photo recadrée
const noop = () => {}
const clean = (html) => html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
const photo = { urlPath: '/trees/t1/image?v=1', crop: { x: 0.4, y: 0.5, zoom: 1.5 } }

describe('la pastille d’un arbre', () => {
  it('montre la photo, sinon l’icône, sinon la première lettre', () => {
    const withPhoto = clean(renderToStaticMarkup(<TreeMark base="pz-tree-mono" name="Famille Martin" image={photo} />))
    expect(withPhoto).toContain('pz-tree-mono--photo')
    expect(withPhoto).toContain('/trees/t1/image?v=1')

    const withIcon = clean(renderToStaticMarkup(<TreeMark base="pz-tree-mono" name="Famille Martin" icon="⛵" />))
    expect(withIcon).toContain('pz-tree-mono--emoji')
    expect(withIcon).toContain('⛵')

    const letter = clean(renderToStaticMarkup(<TreeMark base="pz-tree-mono" name="famille Martin" />))
    expect(letter).toContain('>F<')
    expect(letter).not.toContain('--emoji')
  })

  it('l’adresse d’une photo de la liste du compte porte déjà son jeton, celle d’une invitation passe par /api', () => {
    expect(treeImageSrc({ urlPath: '/trees/t1/image?v=1&token=abc' })).toMatch(/\/trees\/t1\/image\?v=1&token=abc$/)
    expect(treeImageSrc({ urlPath: '/invitations/xyz/tree-image?v=1' })).toMatch(/\/api\/invitations\/xyz\/tree-image\?v=1$/)
    expect(treeImageSrc(null)).toBeNull()
  })
})

describe('le choix du visuel dans les paramètres', () => {
  const field = (props) => clean(renderToStaticMarkup(
    <TreeVisualField treeId="t1" authToken="x" treeName="Famille Martin" onChange={noop} onImageSaved={noop} image={null} {...props} />,
  ))

  it('trois choix exclusifs, sans grille d’icônes quand on garde la lettre', () => {
    const html = field({ value: { mode: 'letter', icon: null } })
    expect(html).toContain('Première lettre')
    expect(html).toContain('>Icône<')
    expect(html).toContain('>Photo<')
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1)
    expect(html).not.toContain('ts-icon-menu')
    expect(html).not.toContain("Changer d'icône")
  })

  it('« Icône » montre un seul bouton, le menu reste fermé tant qu’on ne l’ouvre pas', () => {
    const html = field({ value: { mode: 'icon', icon: '🌻' } })
    expect(html).toContain("Changer d'icône")
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('ts-icon-menu')
  })

  it('« Photo » propose de recadrer ou de changer la photo enregistrée', () => {
    const html = field({ value: { mode: 'photo', icon: null }, image: photo })
    expect(html).toContain('Recadrer')
    expect(html).toContain('Changer de photo')
    expect(html).not.toContain('La photo sera retirée')
  })

  it('choisir la lettre ou une icône alors qu’il y a une photo prévient qu’elle partira à l’enregistrement', () => {
    expect(field({ value: { mode: 'letter', icon: null }, image: photo })).toContain('La photo sera retirée en enregistrant.')
    expect(field({ value: { mode: 'icon', icon: '⛵' }, image: photo })).toContain('La photo sera retirée en enregistrant.')
  })

  it('vingt icônes, sans 🧡 qu’on confondait avec ❤️', () => {
    expect(TREE_ICONS).toHaveLength(20)
    expect(TREE_ICONS).not.toContain('🧡')
    expect(new Set(TREE_ICONS).size).toBe(20)
  })

  it('« Enregistrer » n’envoie l’icône que pour la lettre ou une icône : la photo est déjà enregistrée', () => {
    expect(visualPayload({ mode: 'photo', icon: null })).toEqual({})
    expect(visualPayload({ mode: 'icon', icon: '⛵' })).toEqual({ icon: '⛵' })
    expect(visualPayload({ mode: 'letter', icon: '⛵' })).toEqual({ icon: null })
    expect(visualModeOf({ icon: null, image: photo }).mode).toBe('photo')
    expect(visualModeOf({ icon: '🌳', image: null })).toEqual({ mode: 'icon', icon: '🌳' })
    expect(visualModeOf({ icon: null, image: null }).mode).toBe('letter')
  })
})

describe('où le visuel apparaît', () => {
  it('le menu du compte montre le visuel de l’arbre même quand il n’y en a qu’un', () => {
    const html = clean(renderToStaticMarkup(
      <AvatarMenu onClose={noop} userDisplayName="Camille" trees={[{ id: 't1', name: 'Famille Martin', icon: '🌳' }]} activeTreeId="t1" activeTreeName="Famille Martin" />,
    ))
    expect(html).toContain('navm-tree-mono--emoji')
    expect(html).toContain('🌳')
  })

  it('la porte de la famille montre l’icône au-dessus du nom', () => {
    const html = clean(renderToStaticMarkup(
      <AccessGate initialTreeId="t1" treeName="Famille Martin" treeIcon="⛵" loading={false} onSubmit={noop} />,
    ))
    expect(html).toContain('gate-tree-mark--emoji')
    expect(html).toContain('⛵')
  })
})
