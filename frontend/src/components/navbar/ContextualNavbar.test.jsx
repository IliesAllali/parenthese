import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ContextualNavbar from './ContextualNavbar.jsx'

// Le « + » ajoute, le crayon corrige (#245) : deux boutons dans la barre, pour qui peut ajouter
const noop = () => {}
const role = (navbarType, extra = {}) => ({ navbarType, authenticated: true, role: navbarType === 'admin' ? 'owner' : 'contributor', accessMode: 'member', ...extra })

describe('barre : « + » et crayon séparés', () => {
  it('qui gère l’arbre a les deux boutons', () => {
    const html = renderToStaticMarkup(<ContextualNavbar userRole={role('admin')} onEditClick={noop} onAddPersonClick={noop} kinTarget={{ id: 'l', firstName: 'Lucie' }} />)
    expect(html).toContain('nav-add')
    expect(html).toContain('nav-edit')
  })

  it('la famille aussi, son crayon propose', () => {
    const html = renderToStaticMarkup(<ContextualNavbar userRole={role('contributor_auth')} onEditClick={noop} onAddPersonClick={noop} onAddSouvenirClick={noop} />)
    expect(html).toContain('nav-add')
    expect(html).toContain('Proposer des changements')
  })

  it('un visiteur n’a ni l’un ni l’autre', () => {
    const html = renderToStaticMarkup(<ContextualNavbar userRole={role('visitor', { authenticated: false })} onEditClick={noop} />)
    expect(html).not.toContain('nav-add')
    expect(html).not.toContain('nav-edit')
  })
})
