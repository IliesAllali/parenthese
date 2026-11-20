import { beforeEach, describe, expect, it } from 'vitest'
import { buildAnnotationBatch, clearPendingBatch, isEmptyBatch, isFinalFailure, readPendingBatch, writePendingBatch } from './annotationBatch'

describe('buildAnnotationBatch', () => {
  it('crée, modifie et supprime ce que le brouillon note', () => {
    const draft = {
      addedAnnotations: ['a'],
      modifiedAnnotations: ['b'],
      deletedAnnotations: ['c'],
      annotationsData: [
        { id: 'a', type: 'text', x: 1, y: 2, content: 'Arcachon' },
        { id: 'b', type: 'drawing', x: 3, y: 4, content: '[]', style: { color: 'x' }, zIndex: 2 },
        { id: 'd', type: 'text', x: 0, y: 0, content: 'déjà enregistré' },
      ],
    }
    expect(buildAnnotationBatch(draft)).toEqual({
      create: [{ type: 'text', x: 1, y: 2, content: 'Arcachon', style: {}, zIndex: 0 }],
      update: [{ id: 'b', x: 3, y: 4, content: '[]', style: { color: 'x' }, zIndex: 2 }],
      delete: ['c'],
    })
  })

  it('un brouillon sans mot ni dessin : rien à envoyer', () => {
    expect(isEmptyBatch(buildAnnotationBatch({}))).toBe(true)
    expect(isEmptyBatch(buildAnnotationBatch({ modifiedPersons: { p1: { firstName: 'Lucie' } } }))).toBe(true)
  })
})

describe('envoi gardé pour le retour', () => {
  beforeEach(() => {
    const store = new Map()
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    }
  })

  it('gardé par arbre, relu, puis oublié', () => {
    const pending = { key: 'k-1234567890abcdef', batch: { create: [], update: [], delete: ['c'] } }
    expect(writePendingBatch('t1', pending)).toBe(true)
    expect(readPendingBatch('t1')).toEqual(pending)
    expect(readPendingBatch('t2')).toBeNull()
    clearPendingBatch('t1')
    expect(readPendingBatch('t1')).toBeNull()
  })

  it('stockage illisible : rien de gardé, sans erreur', () => {
    globalThis.localStorage = { getItem: () => { throw new Error('bloqué') }, setItem: () => { throw new Error('bloqué') }, removeItem: () => {} }
    expect(readPendingBatch('t1')).toBeNull()
    expect(writePendingBatch('t1', { key: 'k', batch: {} })).toBe(false)
  })
})

describe('isFinalFailure', () => {
  it('un refus du serveur s’abandonne, un réseau coupé ou une limite de débit se retente', () => {
    expect(isFinalFailure({ status: 400 })).toBe(true)
    expect(isFinalFailure({ status: 403 })).toBe(true)
    expect(isFinalFailure({ status: 0 })).toBe(false)
    expect(isFinalFailure({ status: 429 })).toBe(false)
    expect(isFinalFailure({ status: 503 })).toBe(false)
  })
})
