import { afterEach, describe, expect, it, vi } from 'vitest'

// L'environnement de test est node : une fausse page, avec un stockage qui retient toute écriture.
function fakePage(search) {
  const writes = []
  vi.stubGlobal('window', { location: { search } })
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: (k) => writes.push(k) })
  vi.stubGlobal('document', { get cookie() { return '' }, set cookie(v) { writes.push(v) } })
  return writes
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe("source d'arrivée", () => {
  it("reste en mémoire, rien n'est écrit sur l'appareil", async () => {
    const writes = fakePage('?source=Ketella')
    const { getSource, rememberSource } = await import('./analytics')
    rememberSource()
    expect(getSource()).toBe('ketella')
    expect(writes).toEqual([])
  })

  it('garde la première source connue', async () => {
    fakePage('?source=hn')
    const { getSource, rememberSource } = await import('./analytics')
    rememberSource()
    window.location.search = '?source=landing'
    rememberSource()
    expect(getSource()).toBe('hn')
  })

  it('« direct » sans source', async () => {
    fakePage('')
    const { getSource, rememberSource } = await import('./analytics')
    rememberSource()
    expect(getSource()).toBe('direct')
  })
})
