import { describe, expect, it } from 'vitest'
import { EXAMPLE_TRIO, pickPreviewTrio, previewFamilies } from './previewTrio.js'

// Aperçu de l'Affichage (Patch, 23/11) : un couple et leur enfant pris dans l'arbre, sinon un exemple sans photo
const person = (id, extra = {}) => ({ id, firstName: `P${id}`, lastName: 'Aaa', ...extra })

describe('le trio de l aperçu des réglages d affichage', () => {
  it('prend un couple qui a un enfant', () => {
    const trio = pickPreviewTrio({
      persons: [person(1), person(2), person(3), person(4)],
      unions: [{ id: 'u1', partner1Id: 1, partner2Id: 2 }],
      filiations: [{ childId: 3, unionId: 'u1' }],
    })
    expect([trio.left.id, trio.right.id, trio.child.id, trio.example]).toEqual([1, 2, 3, false])
  })

  it('préfère le couple et l enfant qui ont des photos', () => {
    const trio = pickPreviewTrio({
      persons: [person(1), person(2), person(3), person(4, { photo: '/a' }), person(5, { photo: '/b' }), person(6), person(7, { photo: '/c' })],
      unions: [{ id: 'u1', partner1Id: 1, partner2Id: 2 }, { id: 'u2', partner1Id: 4, partner2Id: 5 }],
      filiations: [{ childId: 3, unionId: 'u1' }, { childId: 6, unionId: 'u2' }, { childId: 7, unionId: 'u2' }],
    })
    expect([trio.left.id, trio.right.id, trio.child.id]).toEqual([4, 5, 7])
  })

  it('ignore un couple sans enfant, un enfant relié à un seul parent et une personne proposée', () => {
    const trio = pickPreviewTrio({
      persons: [person(1), person(2), person(3), person(4, { ghost: 'pending' })],
      unions: [{ id: 'u1', partner1Id: 1, partner2Id: 2 }, { id: 'u2', partner1Id: 1, partner2Id: 4 }],
      filiations: [{ childId: 3, unionId: null, parentId: 1 }, { childId: 3, unionId: 'u2' }],
    })
    expect(trio).toBe(EXAMPLE_TRIO)
  })

  it('montre un exemple sans photo quand l arbre n a pas de trio', () => {
    expect(pickPreviewTrio({ persons: [person(1)] })).toBe(EXAMPLE_TRIO)
    expect(pickPreviewTrio()).toBe(EXAMPLE_TRIO)
    expect([EXAMPLE_TRIO.left, EXAMPLE_TRIO.right, EXAMPLE_TRIO.child].some((p) => p.photo)).toBe(false)
  })

  it('nomme les onglets : la famille de l enfant, puis celle de l autre parent', () => {
    expect(previewFamilies(EXAMPLE_TRIO)).toEqual(['Durand', 'Martin'])
    const same = { left: person(1), right: person(2), child: person(3) }
    expect(previewFamilies(same)).toEqual(['Aaa', ''])
    const born = { left: person(1), right: person(2, { birthName: 'Bbb' }), child: person(3) }
    expect(previewFamilies(born)).toEqual(['Aaa', 'Bbb'])
  })
})
