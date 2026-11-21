import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import KeepTreeSheet from './KeepTreeSheet.jsx'
import TreeCreationWizard from './TreeCreationWizard.jsx'

// L'arbre avant le compte (#251) : un seul écran avant l'arbre, puis « Gardez votre arbre » quand il sert
const noop = () => {}
const clean = (html) => html.replaceAll('&#x27;', "'").replaceAll('&quot;', '"')
const sheet = (props) => clean(renderToStaticMarkup(<KeepTreeSheet onSubmit={noop} onClose={noop} {...props} />))

describe('« Commencez par vous », seul écran avant l’arbre', () => {
  const html = clean(renderToStaticMarkup(<TreeCreationWizard visible loading={false} onClose={noop} onSubmit={noop} />))

  it('ne demande plus le nom de la famille, sans barres d’étape', () => {
    expect(html).toContain('Commencez <em>par vous</em>')
    expect(html).not.toContain('votre famille')
    expect(html).not.toContain('tw-steps')
    expect(html).toContain("J'ai déjà un arbre")
    expect(html).toContain('Créer mon arbre')
  })
})

describe('« Gardez votre arbre »', () => {
  it('à la cinquième personne : email et mot de passe, « Plus tard », et les 30 jours depuis la dernière visite', () => {
    const html = sheet({ reason: 'fifth' })
    expect(html).toContain('Gardez <em>votre arbre</em>')
    expect(html).toContain('30 jours après votre dernière visite')
    expect(html).toContain('id="keepEmail"')
    expect(html).toContain('Plus tard')
    expect(html).toContain('Garder mon arbre')
    expect(html).not.toContain('Prénom')
  })

  it('pour envoyer l’arbre : le compte est demandé, « Annuler » au lieu de « Plus tard »', () => {
    const html = sheet({ reason: 'share' })
    expect(html).toContain("Pour l'envoyer, <em>gardez votre arbre</em>")
    expect(html).toContain('Annuler')
    expect(html).toContain('Garder et envoyer')
    expect(html).not.toContain('Plus tard')
  })

  it('dans le navigateur d’une appli : l’arbre ne suivra pas dans le navigateur', () => {
    const html = sheet({ reason: 'fifth', inApp: true })
    expect(html).toContain('ne suivra pas dans votre navigateur')
    expect(html).toContain('Plus tard')
  })

  it('retour après plus de 23 jours : la dernière visite, et l’effacement après 30 jours sans visite', () => {
    const html = sheet({ reason: 'return', lastVisitAt: '2026-10-25T10:00:00.000Z' })
    expect(html).toMatch(/dernière visite date du 25 octobre/)
    expect(html).toContain('30 jours sans visite')
    expect(html).toContain('Plus tard')
  })

  it('pour inviter un co-gérant : le compte est demandé, « Annuler »', () => {
    const html = sheet({ reason: 'manager' })
    expect(html).toContain('Pour inviter, <em>gardez votre arbre</em>')
    expect(html).toContain('Garder mon arbre')
    expect(html).toContain('Annuler')
    expect(html).not.toContain('Plus tard')
  })

  it('avec Google : le bouton au-dessus du formulaire, son « G », puis « ou »', () => {
    const html = sheet({ reason: 'menu', oidcName: 'Google', onOidc: noop, onLogin: noop })
    expect(html).toContain('Continuer avec Google')
    expect(html).toContain('pz-provider-mark')
    expect(html.indexOf('Continuer avec Google')).toBeLessThan(html.indexOf('id="keepEmail"'))
    expect(html).toMatch(/Déjà un compte/)
  })

  it('un autre fournisseur garde son nom, sans le « G »', () => {
    const html = sheet({ oidcName: 'Pocket ID', onOidc: noop })
    expect(html).toContain('Continuer avec Pocket ID')
    expect(html).not.toContain('pz-provider-mark')
  })
})
