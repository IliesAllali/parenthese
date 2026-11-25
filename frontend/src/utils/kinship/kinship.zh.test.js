import { describe, it, expect } from 'vitest'
import { encodePath, getName } from './zh.js'
import nameZh from './zh.js'
import * as zh from './zh.js'

const path = (steps) => ({
  from: { birthYear: 0 },
  steps: steps
})

const getCousin = (isOlder, generationDistance, generationIndices, ...steps) => (
  getName([...steps].join(''), { isOlder, generationDistance, generationIndices })
)
const getFirstCousin = (isOlder, ...steps) => (
  getCousin(isOlder, 0, {
    0: {start: -1, end: steps.length - 1},
    1: {start: 0, end: 1}
  }, ...steps)
)
const getRelative = (...steps) => (getName([...steps].join(''), {
  isOlder: false,
  generationDistance: 0,
  generationIndices: {0: {start: -1, end: 0}}
}))

describe('nommage chinois', () => {
  it('name for a given path', () => {
    expect(getRelative(zh.FATHER)).toEqual('父亲')
    expect(getRelative(zh.FATHER, zh.FATHER, zh.FATHER)).toEqual('曾祖父')
    expect(getRelative(zh.SON, zh.SON)).toEqual('孙子')
    expect(getFirstCousin(true, zh.FATHER, zh.YOUNGER_BROTHER, zh.SON)).toEqual('堂哥')
    expect(getFirstCousin(true, zh.FATHER, zh.OLDER_BROTHER, zh.SON, zh.WIFE)).toEqual('堂嫂')
    expect(getFirstCousin(true, zh.FATHER, zh.OLDER_SISTER, zh.DAUGHTER)).toEqual('表姐')
    expect(getFirstCousin(false, zh.MOTHER, zh.OLDER_SISTER, zh.DAUGHTER)).toEqual('表妹')
    expect(getFirstCousin(false, zh.MOTHER, zh.YOUNGER_SISTER, zh.DAUGHTER, zh.HUSBAND)).toEqual('表妹夫')
    expect(getFirstCousin(false, zh.FATHER, zh.YOUNGER_BROTHER, zh.SON, zh.WIFE)).toEqual('堂弟媳')
    expect(getRelative(zh.FATHER, zh.FATHER, zh.OLDER_BROTHER)).toEqual('伯祖父')
    expect(getRelative(zh.YOUNGER_BROTHER, zh.SON, zh.SON)).toEqual('侄孙')
    expect(getRelative(zh.OLDER_SISTER, zh.DAUGHTER, zh.DAUGHTER)).toEqual('甥孙女')
  })

  it('higher order cousins and aunts/uncles', () => {
    expect(getCousin(true, 1, {
      0: {start: -1},
      1: {start: 0, end: 3},
      2: {start: 1, end: 2}
    }, zh.FATHER, zh.MOTHER, zh.YOUNGER_BROTHER, zh.SON)).toEqual('舅表伯父')
    expect(getCousin(true, 1, {
      0: {start: -1},
      1: {start: 0, end: 3},
      2: {start: 1, end: 2}
    }, zh.FATHER, zh.FATHER, zh.YOUNGER_BROTHER, zh.SON)).toEqual('堂伯父')
    expect(getCousin(true, 1, {
      0: {start: -1},
      1: {start: 0, end: 3},
      2: {start: 1, end: 2}
    }, zh.MOTHER, zh.FATHER, zh.OLDER_SISTER, zh.DAUGHTER)).toEqual('姑表姨母')
    expect(getCousin(true, 0, {
      0: {start: -1, end: 4},
      1: {start: 0, end: 3},
      2: {start: 1, end: 2}
    }, zh.MOTHER, zh.FATHER, zh.OLDER_SISTER, zh.DAUGHTER, zh.SON)).toEqual('姑表哥')
  })

  it('maternal grandparents and daughter-linked descendants', () => {
    expect(getRelative(zh.MOTHER, zh.FATHER)).toEqual('外公')
    expect(getRelative(zh.FATHER, zh.MOTHER, zh.FATHER)).toEqual('曾外祖父')
    expect(getRelative(zh.MOTHER, zh.MOTHER, zh.FATHER)).toEqual('曾外祖父')
    expect(getRelative(zh.MOTHER, zh.MOTHER, zh.MOTHER, zh.FATHER)).toEqual('高外祖父')
    expect(getRelative(zh.FATHER, zh.MOTHER, zh.MOTHER, zh.MOTHER)).toEqual('高外祖母')
    expect(getRelative(zh.MOTHER, zh.FATHER, zh.MOTHER, zh.FATHER)).toEqual('高外祖父')
    expect(getRelative(zh.MOTHER, zh.FATHER, zh.MOTHER, zh.MOTHER)).toEqual('高外祖母')

    expect(getRelative(zh.DAUGHTER, zh.DAUGHTER)).toEqual('外孙女')
    expect(getRelative(zh.DAUGHTER, zh.DAUGHTER, zh.DAUGHTER)).toEqual('外曾孙女')
    expect(getRelative(zh.DAUGHTER, zh.DAUGHTER, zh.SON)).toEqual('外曾孙子')
    expect(getRelative(zh.DAUGHTER, zh.SON, zh.DAUGHTER)).toEqual('外曾孙女')
    expect(getRelative(zh.DAUGHTER, zh.SON, zh.SON)).toEqual('外曾孙子')
  })

  it('promote when dedicated term is missing', () => {
    expect(getRelative(zh.YOUNGER_BROTHER, zh.SON)).toEqual('侄子')
    expect(getRelative(zh.MOTHER, zh.YOUNGER_SISTER)).toEqual('姨母')
    expect(getRelative(zh.FATHER, zh.YOUNGER_SISTER)).toEqual('姑母')
    expect(getRelative(zh.MOTHER, zh.YOUNGER_BROTHER)).toEqual('舅父')
    expect(getRelative(zh.MOTHER, zh.YOUNGER_SISTER, zh.HUSBAND)).toEqual('姨父')
  })

  it('disambiguate when two options are available', () => {
    expect(getRelative(zh.PARENT)).toEqual('父亲/母亲')
    expect(getRelative(zh.FATHER, zh.BROTHER)).toEqual('伯父/叔父')
    expect(getRelative(zh.BROTHER, zh.WIFE)).toEqual('嫂嫂/弟媳')
    expect(getRelative(zh.MOTHER, zh.OLDER_SIBLING)).toEqual('舅父/姨母')
    expect(getRelative(zh.BROTHER, zh.WIFE)).toEqual('嫂嫂/弟媳')
  })

  it('fallback when unknown', () => {
    expect(getRelative(zh.PARENT, zh.PARENT)).toEqual(undefined)
    expect(nameZh(path([
      { move: 'up', person: {} },
      { move: 'up', person: {} }
    ]))).toEqual('远亲')
    expect(nameZh(path([
      { move: 'up', person: {} },
      { move: 'up', person: {} },
      { move: 'sibling', person: {} }
    ]))).toEqual('远亲')
    expect(nameZh(path([
      { move: 'up', person: {} },
      { move: 'up', person: {} },
      { move: 'sibling', person: {} },
      { move: 'down', person: {} }
    ]))).toEqual('远亲')
  })

  it('path encoding', () => {
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'male' } }
    ]))).toEqual({
      generationDistance: 1,
      generationIndices: {
        0: {start: -1},
        1: {start: 0},
      },
      isOlder: false,
      pathCode: zh.FATHER
    })
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'male' } },
      { move: 'sibling', person: { birthYear: -31, sex: 'male' } }
    ]))).toEqual({
      generationDistance: 1,
      generationIndices: {
        0: {start: -1},
        1: {start: 0, end: 1},
      },
      isOlder: true,
      pathCode: [zh.FATHER, zh.OLDER_BROTHER].join('')
    })
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'male' } },
      { move: 'sibling', person: { birthYear: -29, sex: 'male' } }
    ]))).toEqual({
      generationDistance: 1,
      generationIndices: {
        0: {start: -1},
        1: {start: 0, end: 1},
      },
      isOlder: false,
      pathCode: [zh.FATHER, zh.YOUNGER_BROTHER].join('')
    })
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'male' } },
      { move: 'sibling', person: { birthYear: -29, sex: 'male' } },
      { move: 'down', person: { birthYear: 1, sex: 'male' } },
      { move: 'spouse', person: { birthYear: 1, sex: 'female' } }
    ]))).toEqual({
      generationDistance: 0,
      generationIndices: {
        0: {start: -1, end: 3},
        1: {start: 0, end: 1},
      },
      isOlder: false,
      pathCode: [zh.FATHER, zh.YOUNGER_BROTHER, zh.SON, zh.WIFE].join('')
    })
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'female' } },
      { move: 'up', person: { birthYear: -60, sex: 'male' } },
      { move: 'sibling', person: { birthYear: -62, sex: 'female' } },
      { move: 'down', person: { birthYear: -31, sex: 'female' } },
      { move: 'down', person: { birthYear: -1, sex: 'male' } },
    ]))).toEqual({
      generationDistance: 0,
      generationIndices: {
        0: {start: -1, end: 4},
        1: {start: 0, end: 3},
        2: {start: 1, end: 2}
      },
      isOlder: true,
      pathCode: [zh.MOTHER, zh.FATHER, zh.OLDER_SISTER, zh.DAUGHTER, zh.SON].join('')
    })
  })
})

// Chemin complet avec années de naissance ; je suis né en 0
const person = (sex, birthYear) => ({ sex, birthYear })
const step = (move, sex = null, birthYear = undefined) => ({ move, person: person(sex, birthYear) })

describe('nommage chinois, corrections de la revue', () => {
  it('maternal 外 once, right after 曾/高', () => {
    expect(getRelative(zh.MOTHER, zh.MOTHER, zh.OLDER_BROTHER)).toEqual('外舅祖父')
    expect(getRelative(zh.MOTHER, zh.MOTHER, zh.YOUNGER_BROTHER)).toEqual('外舅祖父')
    expect(getRelative(zh.MOTHER, zh.FATHER, zh.OLDER_BROTHER)).toEqual('外伯祖父')
    expect(getRelative(zh.MOTHER, zh.FATHER, zh.YOUNGER_BROTHER)).toEqual('外叔祖父')
    expect(getRelative(zh.MOTHER, zh.MOTHER, zh.OLDER_SISTER)).toEqual('外姨祖母')
    expect(getRelative(zh.MOTHER, zh.FATHER, zh.FATHER, zh.OLDER_BROTHER)).toEqual('曾外伯祖父')
  })

  it("father's mother's brother is 舅祖父", () => {
    expect(getRelative(zh.FATHER, zh.MOTHER, zh.OLDER_BROTHER)).toEqual('舅祖父')
    expect(getRelative(zh.FATHER, zh.MOTHER, zh.YOUNGER_BROTHER)).toEqual('舅祖父')
  })

  it('all-male paternal line stays 堂', () => {
    const secondCousin = (birthYear) => nameZh(path([
      step('up', 'male', -30), step('up', 'male', -60), step('sibling', 'male', -58),
      step('down', 'male', -28), step('down', 'male', birthYear),
    ]))
    expect(secondCousin(3)).toEqual('从堂弟')
    expect(secondCousin(-3)).toEqual('从堂哥')
    expect(nameZh(path([
      step('up', 'male', -30), step('up', 'male', -60), step('up', 'male', -90), step('sibling', 'male', -88),
      step('down', 'male', -58), step('down', 'male', -28), step('down', 'female', 2),
    ]))).toEqual('族妹')
    const fathersCousin = (birthYear) => nameZh(path([
      step('up', 'male', -30), step('up', 'male', -60), step('sibling', 'male', -58), step('down', 'male', birthYear),
    ]))
    expect(fathersCousin(-35)).toEqual('堂伯父')
    expect(fathersCousin(-25)).toEqual('堂叔父')
    // A woman in the line keeps the contributor's 表 forms
    expect(nameZh(path([
      step('up', 'male', -30), step('up', 'female', -60), step('sibling', 'male', -58),
      step('down', 'male', -28), step('down', 'male', 3),
    ]))).toEqual('舅表弟')
  })

  it('unknown birth year gives both forms', () => {
    expect(nameZh(path([step('up', 'male', -30), step('sibling', 'female', -32), step('down', 'female')]))).toEqual('表姐/表妹')
    expect(nameZh(path([step('up', 'male', -30), step('sibling', 'male', -32), step('down', 'male')]))).toEqual('堂哥/堂弟')
    expect(nameZh(path([step('up', 'male', -30), step('sibling', 'female', -32), step('down')]))).toEqual('表兄弟姐妹')
    expect(nameZh(path([
      step('up', 'male', -30), step('up', 'male', -60), step('sibling', 'male', -58), step('down', 'male'),
    ]))).toEqual('堂伯父/堂叔父')
  })

  it('half and step siblings when something is unknown', () => {
    expect(nameZh(path([step('up', 'male', -30), step('down', 'male', 5)]))).toEqual('同父异母弟弟')
    expect(nameZh(path([step('up', 'female', -30), step('down', 'female', -5)]))).toEqual('同母异父姐姐')
    expect(nameZh(path([step('up', null, -30), step('down', 'male', 5)]))).toEqual('同父异母弟弟/同母异父弟弟')
    expect(nameZh(path([step('up', 'female', -30), step('down', null, -5)]))).toEqual('同母异父哥哥/同母异父姐姐')
    expect(nameZh(path([step('up', 'male', -30), step('down', 'male')]))).toEqual('同父异母哥哥/同父异母弟弟')
    expect(nameZh(path([step('up', 'male', -30), step('down', 'other')]))).toEqual('同父异母兄弟姐妹')
    expect(nameZh(path([step('up'), step('down')]))).toEqual('同父异母兄弟姐妹/同母异父兄弟姐妹')
    expect(nameZh(path([step('up', 'male', -30), step('spouse', 'female', -28), step('down', 'female', 2)]))).toEqual('继妹妹')
    expect(nameZh(path([step('up', 'male', -30), step('spouse', 'female', -28), step('down', 'male')]))).toEqual('继哥哥/继弟弟')
    expect(nameZh(path([step('up'), step('spouse'), step('down')]))).toEqual('继兄弟姐妹')
  })
})
