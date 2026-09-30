import { describe, expect, it } from 'vitest'
import { clearAccountLocalData, sweepLegacyLocalData } from './localHygiene'

function memoryStorage(initial) {
  const map = new Map(Object.entries(initial))
  return {
    get length() { return map.size },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    keys: () => [...map.keys()].sort(),
  }
}

const KEPT = {
  parenthese_contributor_name: 'Camille',
  'pz-locale': 'en',
  family_welcome_seen_t1: '1',
  tree_access_token_t1: 'share-token',
  user_auth_token: 'tok',
}

describe('local storage hygiene', () => {
  it('removes every legacy share password copy and nothing else', () => {
    const storage = memoryStorage({
      ...KEPT,
      invite_password_t1_share: 'secret',
      invite_password_t2_contributor: 'secret',
      invite_password_t3_visitor: 'secret',
      'edit-draft-t1': '{}',
    })
    sweepLegacyLocalData(storage)
    expect(storage.keys()).toEqual([...Object.keys(KEPT), 'edit-draft-t1'].sort())
  })

  it('clears account data on logout but keeps device preferences', () => {
    const storage = memoryStorage({
      ...KEPT,
      'edit-draft-t1': '{}',
      'edit-draft-t2': '{}',
      'account_self_person_a@b.fr_t1': 'p1',
      user_auth_profile: '{"email":"a@b.fr"}',
    })
    clearAccountLocalData(storage)
    expect(storage.keys()).toEqual(Object.keys(KEPT).sort())
  })

  it('survives a missing or broken storage', () => {
    expect(() => sweepLegacyLocalData(null)).not.toThrow()
    const broken = { get length() { throw new Error('denied') } }
    expect(() => clearAccountLocalData(broken)).not.toThrow()
  })
})
