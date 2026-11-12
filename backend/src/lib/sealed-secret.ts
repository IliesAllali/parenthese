import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

import { env } from '../config/env.js'

// Secret gardé au repos et relisible par le serveur : AES-256-GCM, clé dérivée de JWT_SECRET et d'un
// libellé propre à chaque usage. Changer JWT_SECRET rend les valeurs illisibles : la lecture renvoie null.
const VERSION = 'v1'

export function sealedSecret(usage: string) {
  const key = () => Buffer.from(hkdfSync('sha256', env.JWT_SECRET, 'parenthese', usage, 32))

  function encrypt(value: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key(), iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${VERSION}:${Buffer.concat([iv, tag, encrypted]).toString('base64')}`
  }

  // null si la valeur stockée est absente, d'un autre format, ou illisible (JWT_SECRET changé).
  function decrypt(stored: string | null | undefined): string | null {
    if (!stored || !stored.startsWith(`${VERSION}:`)) {
      return null
    }

    try {
      const raw = Buffer.from(stored.slice(VERSION.length + 1), 'base64')
      const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12))
      decipher.setAuthTag(raw.subarray(12, 28))
      return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
    } catch {
      return null
    }
  }

  return { encrypt, decrypt }
}
