import { describe, it, expect } from 'vitest'
import { encodePath, getName } from './zh.js'
import nameZh from './zh.js'
import * as zh from './zh.js'

const path = (steps) => ({
  from: { birthYear: 0 },
  steps: steps
})

const getCousin = (isOlder, distance, indices, ...steps) => (
  getName([...steps].join(''), isOlder, distance, indices)
)
const getFirstCousin = (isOlder, ...steps) => (
  getCousin(isOlder, 0, {
    0: {"start": -1, "end": steps.length - 1},
    1: {"start": 0, "end": 1}
  }, ...steps)
)
const getRelative = (...steps) => (getName([...steps].join(''), false, 0, {0: {"start": -1, "end": 0}}))

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
    expect(getFirstCousin(false, zh.FATHER, zh.YOUNGER_BROTHER, zh.SON, zh.WIFE)).toEqual('堂弟妇')
    expect(getRelative(zh.FATHER, zh.FATHER, zh.OLDER_BROTHER)).toEqual('伯祖父')
    expect(getRelative(zh.YOUNGER_BROTHER, zh.SON, zh.SON)).toEqual('侄孙')
    expect(getRelative(zh.OLDER_SISTER, zh.DAUGHTER, zh.DAUGHTER)).toEqual('甥孙女')
  })

  it('higher order cousins and aunts/uncles', () => {
    expect(getCousin(true, 1, {
      0: {"start": -1},
      1: {"start": 0, "end": 3},
      2: {"start": 1, "end": 2}
    }, zh.FATHER, zh.MOTHER, zh.YOUNGER_BROTHER, zh.SON)).toEqual('舅表伯父')
    expect(getCousin(true, 1, {
      0: {"start": -1},
      1: {"start": 0, "end": 3},
      2: {"start": 1, "end": 2}
    }, zh.FATHER, zh.FATHER, zh.YOUNGER_BROTHER, zh.SON)).toEqual('叔堂伯父')
    expect(getCousin(true, 1, {
      0: {"start": -1},
      1: {"start": 0, "end": 3},
      2: {"start": 1, "end": 2}
    }, zh.MOTHER, zh.FATHER, zh.OLDER_SISTER, zh.DAUGHTER)).toEqual('姑表姨母')
    expect(getCousin(true, 0, {
      0: {"start": -1, "end": 4},
      1: {"start": 0, "end": 3},
      2: {"start": 1, "end": 2}
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
    expect(getRelative(zh.MOTHER, zh.OLDER_SIBLING)).toEqual('舅父/姨母')
    expect(getRelative(zh.BROTHER, zh.WIFE)).toEqual('嫂嫂/弟妇')
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
        0: {"start": -1},
        1: {"start": 0},
      },
      isOlder: false,
      pathCode: 'f'
    })
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'male' } },
      { move: 'sibling', person: { birthYear: -31, sex: 'male' } }
    ]))).toEqual({
      generationDistance: 1,
      generationIndices: {
        0: {"start": -1},
        1: {"start": 0, "end": 1},
      },
      isOlder: true,
      pathCode: 'fg'
    })
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'male' } },
      { move: 'sibling', person: { birthYear: -29, sex: 'male' } }
    ]))).toEqual({
      generationDistance: 1,
      generationIndices: {
        0: {"start": -1},
        1: {"start": 0, "end": 1},
      },
      isOlder: false,
      pathCode: 'fd'
    })
    expect(encodePath(path([
      { move: 'up', person: { birthYear: -30, sex: 'male' } },
      { move: 'sibling', person: { birthYear: -29, sex: 'male' } },
      { move: 'down', person: { birthYear: 1, sex: 'male' } },
      { move: 'spouse', person: { birthYear: 1, sex: 'female' } }
    ]))).toEqual({
      generationDistance: 0,
      generationIndices: {
        0: {"start": -1, "end": 3},
        1: {"start": 0, "end": 1},
      },
      isOlder: false,
      pathCode: 'fdew'
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
        0: {"start": -1, "end": 4},
        1: {"start": 0, "end": 3},
        2: {"start": 1, "end": 2}
      },
      isOlder: true,
      pathCode: 'mfjne'
    })
  })
})

