// Réglages d'affichage d'un arbre, les mêmes pour tous ceux qui l'ouvrent (tree_settings).

// Forme des portraits : 'varied' garde une forme par personne (ronde, rectangle ou polaroïd), les autres
// mettent tout l'arbre dans la même. Une forme choisie en recadrant une photo l'emporte toujours (frontend).
export const PORTRAIT_SHAPES = ['varied', 'round', 'square', 'polaroid'] as const
export type PortraitShape = (typeof PORTRAIT_SHAPES)[number]

export function portraitShapeOf(value: unknown): PortraitShape {
  return PORTRAIT_SHAPES.includes(value as PortraitShape) ? (value as PortraitShape) : 'varied'
}

// Part des noms de famille écrits tout en capitales à partir de laquelle un import GEDCOM dans un arbre vide
// allume « Les noms de famille en capitales » : les noms tapés ensuite s'affichent comme ceux du fichier.
export const UPPERCASE_SURNAMES_THRESHOLD = 0.8

// Un nom compte s'il a au moins une lettre ; il est « en capitales » s'il ne change pas une fois mis en capitales.
export function mostlySurnamesInCapitals(lastNames: string[]): boolean {
  const named = lastNames.map((name) => String(name ?? '').trim()).filter((name) => /\p{L}/u.test(name))
  if (!named.length) return false
  const inCapitals = named.filter((name) => name === name.toLocaleUpperCase('fr')).length
  return inCapitals / named.length >= UPPERCASE_SURNAMES_THRESHOLD
}
