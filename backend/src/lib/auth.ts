import bcrypt from 'bcryptjs'

const HASH_ROUNDS = 12

export async function hashPassword(value: string): Promise<string> {
  return bcrypt.hash(value, HASH_ROUNDS)
}

export async function verifyPassword(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash)
}