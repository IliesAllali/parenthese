import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '../src/lib/auth.js'

describe('auth password helpers', () => {
  it('hashes and verifies passwords', async () => {
    const password = 'super-safe-password'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(await verifyPassword(password, hash)).toBe(true)
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  }, 15000)
})
