// Les claviers de téléphone remplacent ' par ’ et ajoutent parfois une espace après le dernier mot.
// Un mot de passe de partage tapé ainsi doit quand même ouvrir l'arbre : on essaie aussi ces variantes.
const CURLY_APOSTROPHES = /[‘’ʼ´`]/g
const CURLY_QUOTES = /[“”«»]/g

export function sharePasswordVariants(input: string): string[] {
  const trimmed = input.trim()
  const straight = trimmed.replace(CURLY_APOSTROPHES, "'").replace(CURLY_QUOTES, '"')
  const curly = trimmed.replace(/'/g, '’')
  return [...new Set([input, trimmed, straight, curly])].filter(Boolean)
}

// Renvoie la variante qui correspond à l'un des hash, ou null
export async function matchSharePassword(
  input: string,
  hashes: string[],
  verify: (password: string, hash: string) => Promise<boolean>,
): Promise<string | null> {
  for (const candidate of sharePasswordVariants(input)) {
    for (const hash of hashes) {
      if (await verify(candidate, hash)) return candidate
    }
  }
  return null
}
