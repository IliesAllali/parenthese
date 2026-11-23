import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AddPersonPanel from './AddPersonPanel.jsx'

// Live du 22/11 : le statut se voyait seulement sous « Plus de détails », et la personne ajoutée restait « En vie »
const statusButtons = (html) => [...html.matchAll(/<button[^>]*role="radio"[^>]*aria-checked="(true|false)"[^>]*>([^<]+)<\/button>/g)]
  .map(([, checked, label]) => ({ label, checked: checked === 'true' }))

describe('Ajouter une personne : le statut', () => {
  it('le formulaire montre « En vie » et « Décédé(e) » d’emblée, sans « Plus de détails »', () => {
    const html = renderToStaticMarkup(<AddPersonPanel visible onSubmit={() => {}} onClose={() => {}} />)
    expect(html).toContain('id="ap-status-label"')
    expect(statusButtons(html)).toEqual(expect.arrayContaining([{ label: 'En vie', checked: true }, { label: 'Décédé(e)', checked: false }]))
    // En vie : pas de champ de décès, ni l'ancienne case « date inconnue »
    expect(html).not.toContain('id="ap-deathDate"')
    expect(html).not.toContain('date inconnue')
  })
})
