import { isHalfSibling, kinshipFacts } from './facts.js'

// Mot genré quand le sexe de la personne nommée est connu, forme double sinon
const g = (sex, male, female, both) => (sex === 'male' ? male : sex === 'female' ? female : both)
// n fois « arrière- » devant un mot : Arrière-grand-oncle, Arrière-arrière-grand-oncle
const arriere = (n, word) => `Arrière-${'arrière-'.repeat(n - 1)}${word.charAt(0).toLowerCase()}${word.slice(1)}`

export default function nameFr(path) {
  const { ups, downs, hasSpouse, sex } = kinshipFacts(path)

  if (hasSpouse && ups === 0 && downs === 0) return g(sex, 'Conjoint', 'Conjointe', 'Conjoint(e)')
  if (isHalfSibling(path)) return g(sex, 'Demi-frère', 'Demi-sœur', 'Demi-frère/sœur')

  if (hasSpouse) {
    if (ups === 1 && downs === 0) return g(sex, 'Beau-père', 'Belle-mère', 'Beau-parent')
    if (ups === 0 && downs === 1) return g(sex, 'Beau-fils', 'Belle-fille', 'Bel-enfant')
    // Le français dit aussi beau-frère pour l'enfant du conjoint d'un parent (quasi-frère, peu employé)
    if (ups === 1 && downs === 1) return g(sex, 'Beau-frère', 'Belle-sœur', 'Beau-frère/sœur')
  }

  let label
  if (downs === 0 && ups > 0) {
    if (ups === 1) label = g(sex, 'Père', 'Mère', 'Parent')
    else if (ups === 2) label = g(sex, 'Grand-père', 'Grand-mère', 'Grand-parent')
    else if (ups === 3) label = g(sex, 'Arrière-grand-père', 'Arrière-grand-mère', 'Arrière-grand-parent')
    else label = `${g(sex, 'Aïeul', 'Aïeule', 'Aïeul(e)')} ${ups}e gén.`
  } else if (ups === 0 && downs > 0) {
    if (downs === 1) label = g(sex, 'Fils', 'Fille', 'Enfant')
    else if (downs === 2) label = g(sex, 'Petit-fils', 'Petite-fille', 'Petit-enfant')
    else if (downs === 3) label = g(sex, 'Arrière-petit-fils', 'Arrière-petite-fille', 'Arrière-petit-enfant')
    else label = `${g(sex, 'Descendant', 'Descendante', 'Descendant(e)')} ${downs}e gén.`
  } else if (ups === 1 && downs === 1) label = g(sex, 'Frère', 'Sœur', 'Frère/Sœur')
  else if (downs === 1) {
    // Frère ou sœur d'un ascendant : oncle, grand-oncle, arrière-grand-oncle…
    const word = ups === 2 ? g(sex, 'Oncle', 'Tante', 'Oncle/Tante') : g(sex, 'Grand-oncle', 'Grand-tante', 'Grand-oncle/tante')
    label = ups <= 3 ? word : arriere(ups - 3, word)
  } else if (ups === 1) {
    // Descendant d'un frère ou d'une sœur : neveu, petit-neveu, arrière-petit-neveu…
    const word = downs === 2 ? g(sex, 'Neveu', 'Nièce', 'Neveu/Nièce') : g(sex, 'Petit-neveu', 'Petite-nièce', 'Petit-neveu/nièce')
    label = downs <= 3 ? word : arriere(downs - 3, word)
  } else {
    // Cousins, dans l'usage des familles : germain, issu de germain, puis le degré. Le droit civil compte
    // autrement (un cousin germain y est au 4e degré), on ne s'en sert pas ici.
    const degree = Math.min(ups, downs) - 1
    const removed = Math.abs(ups - downs)
    if (degree === 1 && removed === 0) label = g(sex, 'Cousin germain', 'Cousine germaine', 'Cousin(e) germain(e)')
    else if (degree === 1) label = g(sex, 'Petit-cousin', 'Petite-cousine', 'Petit-cousin(e)')
    else if (degree === 2 && removed === 0) label = g(sex, 'Cousin issu de germain', 'Cousine issue de germain', 'Cousin(e) issu(e) de germain')
    else if (removed === 0) label = `${g(sex, 'Cousin', 'Cousine', 'Cousin(e)')} ${degree}e degré`
    else label = g(sex, 'Cousin éloigné', 'Cousine éloignée', 'Cousin(e) éloigné(e)')
  }

  return hasSpouse ? `${label} par alliance` : label
}
