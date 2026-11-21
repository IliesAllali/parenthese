import { describe, expect, it, vi } from 'vitest'

// Comment l'API présente son secret au fournisseur OIDC. Google refuse l'en-tête Basic produit par openid-client
// (« The OAuth client was not found ») et accepte le secret dans le corps : client_secret_post dès qu'il est annoncé.
const { envMock, calls } = vi.hoisted(() => ({
  envMock: { OIDC_CLIENT_SECRET: 'secret-de-test' as string | undefined },
  calls: [] as string[],
}))

vi.mock('../src/config/env.js', () => ({ env: envMock }))
vi.mock('openid-client', () => ({
  None: () => (calls.push('none'), 'none'),
  ClientSecretPost: () => (calls.push('post'), 'post'),
  ClientSecretBasic: () => (calls.push('basic'), 'basic'),
}))

const { clientAuthentication } = await import('../src/lib/oidc.js')

describe('clientAuthentication', () => {
  it('envoie le secret dans le corps quand le fournisseur l’annonce (Google)', () => {
    expect(clientAuthentication({ token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'] })).toBe('post')
  })

  it('garde Basic quand le fournisseur n’annonce pas client_secret_post', () => {
    expect(clientAuthentication({ token_endpoint_auth_methods_supported: ['client_secret_basic'] })).toBe('basic')
    expect(clientAuthentication({})).toBe('basic')
  })

  it('reste un client public sans secret', () => {
    envMock.OIDC_CLIENT_SECRET = undefined
    expect(clientAuthentication({ token_endpoint_auth_methods_supported: ['client_secret_post'] })).toBe('none')
  })
})
