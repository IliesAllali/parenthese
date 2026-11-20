import { describe, expect, it } from 'vitest'
import { buildInviteText, isChristmasSeason } from '../utils/inviteText.js'
import { buildShareLink, readShareKey } from '../utils/shareKey.js'

// Message d'invitation de Noël (SIGNUP_PROMPTS) : du 1er décembre au 6 janvier, et seulement si l'instance l'autorise
describe("message d'invitation de Noël", () => {
  const at = (iso) => new Date(`${iso}T12:00:00`)

  it('couvre du 1er décembre au 6 janvier inclus', () => {
    expect(isChristmasSeason(at('2026-11-30'))).toBe(false)
    expect(isChristmasSeason(at('2026-12-01'))).toBe(true)
    expect(isChristmasSeason(at('2027-01-06'))).toBe(true)
    expect(isChristmasSeason(at('2027-01-07'))).toBe(false)
  })

  it('parle de Noël en décembre quand l\'instance l\'autorise', () => {
    const text = buildInviteText('https://exemple.test/arbre/x#cle=lilas-1928', { seasonal: true, now: at('2026-12-15') })
    expect(text).toContain('Pour Noël')
    expect(text).toContain('https://exemple.test/arbre/x#cle=lilas-1928')
  })

  it('garde le message habituel hors saison ou sur une instance qui ne l\'autorise pas', () => {
    expect(buildInviteText('u', { seasonal: true, now: at('2026-11-15') })).toContain('Je rassemble')
    expect(buildInviteText('u', { seasonal: false, now: at('2026-12-15') })).toContain('Je rassemble')
  })

  it('ne recopie ni mot de passe ni mode d\'emploi : le lien suffit', () => {
    const text = buildInviteText('https://exemple.test/arbre/x#cle=p')
    expect(text).not.toMatch(/mot de passe|mode d'emploi|En bas de l'écran/i)
    expect(text.split('\n')).toHaveLength(5)
  })
})

// Le lien qui ouvre l'arbre (#247) : la clé après le « # », retirée de l'adresse à l'arrivée
describe('lien porteur de la clé', () => {
  it('met le mot de passe après le #, encodé', () => {
    expect(buildShareLink('https://app.test/arbre/famille', 'a b+c#d')).toBe('https://app.test/arbre/famille#cle=a%20b%2Bc%23d')
    expect(buildShareLink('https://app.test/arbre/famille', '')).toBe('https://app.test/arbre/famille')
  })

  it("lit la clé une fois et la retire de la barre d'adresse", () => {
    const calls = []
    globalThis.window = { history: { state: null, replaceState: (...args) => calls.push(args[2]) } }
    const location = { pathname: '/arbre/famille', search: '?famille=x', hash: '#cle=a%20b%2Bc%23d' }
    expect(readShareKey(location)).toBe('a b+c#d')
    expect(calls).toEqual(['/arbre/famille?famille=x'])
    expect(readShareKey({ ...location, hash: '#oidc=1' })).toBe('')
    delete globalThis.window
  })
})
