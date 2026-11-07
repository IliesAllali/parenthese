import { describe, expect, it } from 'vitest'
import { computeBlockLayout } from './blockLayout'
import { generate } from '../../../../tools/layout-bench/gen-fr.mjs'

// « Tout l'arbre » (onglets par nom) et « Pas d'onglets » dessinent l'arbre sans onglet par largeur : chaque
// personne est là, aucune pastille, et deux personnes ne se chevauchent pas
function overlaps(people) {
  const boxes = people.map((n) => [n.x, n.y, n.x + n.width, n.y + n.height]).sort((a, b) => a[0] - b[0])
  let n = 0
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length && boxes[j][0] < boxes[i][2] - 1; j++) {
      if (boxes[j][1] < boxes[i][3] - 1 && boxes[i][1] < boxes[j][3] - 1) n++
    }
  }
  return n
}
const cas = [['desc', 3], ['desc', 7], ['asc', 3], ['asc', 7]]
describe('dessin complet, sans onglets par largeur', () => {
  for (const [kind, seed] of cas) {
    it(`${kind} graine ${seed}`, () => {
      const tree = generate(kind, seed)
      const { graph } = tree
      const result = computeBlockLayout(graph, tree.rootPersonId)
      const people = result.children.filter((n) => n._type === 'person')
      expect(people.length).toBe(graph.persons.length)
      expect(overlaps(people)).toBe(0)
    })
  }
})

// Une lignée (Duval) et la très grande famille d'un conjoint (Garnier : onze frères et sœurs en couple, trois
// enfants chacun). Le placement par largeur la réduisait aux parents du conjoint, le reste caché derrière une
// pastille, même en dessin complet (« Tout l'arbre 211 » qui n'était pas tout l'arbre, Patch, 07/11)
function belleFamille() {
  const persons = [], unions = [], filiations = []
  const P = (id, firstName, lastName, y) => persons.push({ id, firstName, lastName, birthDate: `${y}-01-01` })
  const U = (id, a, b) => unions.push({ id, partner1Id: a, partner2Id: b })
  const L = (child, unionId) => filiations.push({ childId: child, unionId })
  P('henri', 'Henri', 'Duval', 1920); P('odette', 'Odette', 'Duval', 1924); U('uA', 'henri', 'odette')
  for (const k of ['paul', 'marc', 'julie']) { P(k, k, 'Duval', 1948); L(k, 'uA') }
  P('jean', 'Jean', 'Garnier', 1925); P('marthe', 'Marthe', 'Garnier', 1927); U('uG', 'jean', 'marthe')
  P('aieul', 'Aïeul', 'Garnier', 1895); P('aieule', 'Aïeule', 'Garnier', 1897); U('uAG', 'aieul', 'aieule'); L('jean', 'uAG')
  P('oncle', 'Oncle', 'Garnier', 1922); L('oncle', 'uAG')
  P('elodie', 'Élodie', 'Garnier', 1952); L('elodie', 'uG'); U('uM', 'marc', 'elodie')
  for (const k of ['lola', 'noe']) { P(k, k, 'Duval', 1980); L(k, 'uM') }
  for (let i = 0; i < 11; i++) {
    P(`g${i}`, `G${i}`, 'Garnier', 1950 + i); L(`g${i}`, 'uG'); P(`c${i}`, `C${i}`, 'Martin', 1950 + i); U(`ug${i}`, `g${i}`, `c${i}`)
    for (const k of [1, 2, 3]) { P(`k${i}${k}`, `K${i}${k}`, 'Garnier', 1978 + i); L(`k${i}${k}`, `ug${i}`) }
  }
  return { persons, unions, filiations }
}
describe('dessin complet, grande belle-famille', () => {
  it('tout le monde est dessiné, sans pastille', () => {
    const graph = belleFamille()
    const result = computeBlockLayout(graph, 'henri')
    const people = result.children.filter((n) => n._type === 'person')
    expect(people.length).toBe(graph.persons.length)
    expect(overlaps(people)).toBe(0)
  })
})
