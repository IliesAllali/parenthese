const revokedUserTokens = new Map<string, number>()

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function revokeUserToken(jti: string, exp: number): void {
  revokedUserTokens.set(jti, exp)
}

export function isUserTokenRevoked(jti: string): boolean {
  const exp = revokedUserTokens.get(jti)
  if (!exp) {
    return false
  }

  // Opportunistic cleanup of expired revocations.
  if (exp <= nowSeconds()) {
    revokedUserTokens.delete(jti)
    return false
  }

  return true
}
