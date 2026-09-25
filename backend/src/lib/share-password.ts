import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

import { env } from '../config/env.js'

// Le mot de passe de partage est fait pour être donné à la famille : le propriétaire doit pouvoir le relire.
// Chiffré en AES-256-GCM, clé dérivée de JWT_SECRET (changer ce secret rend les valeurs illisibles,
// le panneau repasse alors en « à saisir », sans rien casser pour la famille).
const VERSION = 'v1'

function getKey(): Buffer {
  return Buffer.from(hkdfSync('sha256', env.JWT_SECRET, 'parenthese', 'share-password-v1', 32))
}

export function encryptSharePassword(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${VERSION}:${Buffer.concat([iv, tag, encrypted]).toString('base64')}`
}

export function decryptSharePassword(stored: string | null | undefined): string | null {
  if (!stored || !stored.startsWith(`${VERSION}:`)) {
    return null
  }

  try {
    const raw = Buffer.from(stored.slice(VERSION.length + 1), 'base64')
    const decipher = createDecipheriv('aes-256-gcm', getKey(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
