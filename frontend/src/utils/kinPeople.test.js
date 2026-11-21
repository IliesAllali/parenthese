import { describe, expect, it } from 'vitest'
import { kinPeople } from './kinPeople'

const P = (id, sex) => ({ id, firstName: id, sex })
const persons = [P('lucie', 'female'), P('marc', 'male'), P('helene', 'female'), P('claire', 'female'), P('tom', 'male'), P('leo', 'male'), P('seul', null)]
const parents = { lucie: ['marc', 'helene'], claire: ['marc', 'helene'], leo: ['lucie', 'tom'] }
const byId = (id) => persons.find((p) => p.id === id)
const graph = {
  persons,
  getParents: (id) => (parents[id] || []).map(byId),
  getChildren: (id) => Object.entries(parents).filter(([, ps]) => ps.includes(id)).map(([c]) => byId(c)),
  getPartners: (id) => ({ lucie: ['tom'], tom: ['lucie'], marc: ['helene'], helene: ['marc'] }[id] || []).map(byId),
}

describe('kinPeople', () => {
  it('soi d’abord, puis les proches par proximité, chacun avec son lien', () => {
    const list = kinPeople(graph, 'lucie')
    expect(list[0]).toMatchObject({ self: true })
    expect(list.map((e) => [e.person.id, e.label])).toEqual([
      ['lucie', ''],
      ['marc', 'Père'],
      ['helene', 'Mère'],
      ['claire', 'Sœur'],
      ['tom', 'Conjoint'],
      ['leo', 'Fils'],
      ['seul', ''],
    ])
  })

  it('sans soi : l’ordre de l’arbre', () => {
    expect(kinPeople(graph, null).map((e) => e.person.id)).toEqual(persons.map((p) => p.id))
  })
})
