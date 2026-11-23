// Personne née il y a plus de 110 ans : décédée, même sans décès noté. Un fichier GEDCOM n'écrit souvent pas
// le décès des aïeux (on le sait, on ne l'a pas daté), et l'arbre les montrait « en vie » (live du 22/11).
// Le même seuil sert dans le formulaire d'ajout. Les personnes déjà dans l'arbre ne sont jamais changées.
export const PRESUMED_DECEASED_AGE = 110

export function presumedDeceased(birthDate: Date | null, now: Date = new Date()): boolean {
  if (!birthDate) return false
  return now.getUTCFullYear() - birthDate.getUTCFullYear() > PRESUMED_DECEASED_AGE
}
