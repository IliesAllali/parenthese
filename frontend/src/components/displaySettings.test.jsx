import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AdminPanel from './AdminPanel.jsx'

// Paramètres de l'arbre, Affichage (Patch, 23/11) : des libellés courts, sans phrase d'explication, et un aperçu
const clean = (html) => html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
const panel = () => clean(renderToStaticMarkup(<AdminPanel visible treeId="t1" authToken="x" isAdmin isOwner onClose={() => {}} />))

describe('les réglages d affichage de l arbre', () => {
  it('ont des libellés courts, dans l ordre de la planche', () => {
    const html = panel()
    const labels = ['Noms en capitales', 'Nom sous le prénom', 'Belles-familles en onglets', '>Portraits<']
    const at = labels.map((label) => html.indexOf(label))
    expect(at.every((i) => i > 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('n ont plus de phrase d explication ni « Réglage de ce navigateur »', () => {
    const html = panel()
    expect(html).not.toContain('Réglage de ce navigateur')
    expect(html).not.toContain('<small')
  })

  it('montrent l aperçu au-dessus des réglages', () => {
    const html = panel()
    expect(html.indexOf('ts-preview')).toBeGreaterThan(html.indexOf('>Affichage<'))
    expect(html.indexOf('ts-preview')).toBeLessThan(html.indexOf('Noms en capitales'))
  })

  it('donnent aux contributions deux choix courts', () => {
    const html = panel()
    expect(html).toContain('Je valide chaque ajout')
    expect(html).toContain("Les ajouts s'appliquent tout de suite")
  })
})
