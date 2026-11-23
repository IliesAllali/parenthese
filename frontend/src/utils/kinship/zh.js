import { isHalfSibling, isStepSibling, normalizeSex } from './facts.js'

// Mot genré quand le sexe de la personne nommée est connu, forme double sinon
const g = (sex, male, female, other) => (sex === 'male' ? male : sex === 'female' ? female : other)

// Encoded form of the path steps; unions are assumed to be marriages
// Uppercase steps indicate ambiguity in the path, either by age or by sex
// Lowercase steps include full information
export const
  FATHER = 'f',
  MOTHER = 'm',
  PARENT = 'A',

  HUSBAND = 'h',
  WIFE = 'w',
  PARTNER = 'P',

  OLDER_BROTHER = 'g',
  YOUNGER_BROTHER = 'd',
  OLDER_SISTER = 'j',
  YOUNGER_SISTER = 'k',
  OLDER_SIBLING = 'S',
  YOUNGER_SIBLING = 'T',
  BROTHER = 'X',
  SISTER = 'J',
  SIBLING = 'Z',

  SON = 'e',
  DAUGHTER = 'n',
  CHILD = 'C',

  // Regexes for common checks
  // Paternal line through men only: fathers up, a brother, then sons down
  TANG_HIGHER_ORDER_COUSIN = /^f+[gd]e*$/,
  HIGHER_ORDER_COUSIN = /^[fm]{3,}/,
  BO_UNCLE = /fg/,
  SHU_UNCLE = /fd/,
  PATERNAL_AUNT = /f[jk]/,
  MATERNAL_UNCLE = /m[gd]/,
  MATERNAL_AUNT = /m[jk]/,
  DIRECT_ANCESTOR_DESCENDENT = /^([fm]|[en])+.$/,
  ENDS_WITH_SPOUSE = /[hw]$/,
  STARTS_WITH_SPOUSE = /^[hw]/,
  MORE_THAN_TWO_UNKNOWNS = /(.*[A-Z].*){2,}/,
  SINGLE_UNKNOWN = /^(?<known1>[a-z]*)(?<unknown>[A-Z])(?<known2>[a-z]*)$/

// Lookup table for common relatives
const links = {
  // Great-granchildren and below
  'eee': '曾孙子',
  'een': '曾孙女',
  'ene': '曾外孙',
  'enn': '曾外孙女',
  'nee': '外曾孙子',
  'nen': '外曾孙女',
  'nne': '外曾孙子',
  'nnn': '外曾孙女',

  // Grandchildren
  'ee': '孙子',
  'en': '孙女',
  'ne': '外孙',

  'eew': '孙媳',
  'enh': '孙婿',
  'new': '外孙妇',

  // Children
  'e': '儿子',
  'n': '女儿',

  // Nephews
  'ge': '侄子',
  'gn': '侄女',
  'je': '外甥',
  'jn': '外甥女',

  'gee': '侄孙',
  'gen': '侄孙女',
  'jee': '甥孙',
  'jen': '甥孙女',

  'gew': '侄妇',
  'gnh': '侄婿',
  'jew': '甥妇',
  'jnh': '甥婿',

  // Siblings
  'g': '哥哥',
  'd': '弟弟',
  'j': '姐姐',
  'k': '妹妹',

  // Parents, aunts, and uncles
  'f': '父亲',
  'm': '母亲',
  'fg': '伯父',
  'fd': '叔父',
  'fj': '姑母',
  'mg': '舅父',
  'mj': '姨母',

  // Stepparents
  'fw': '继母',
  'mh': '继父',

  // Spouses (assumes marriage)
  'h': '丈夫',
  'w': '妻子',

  // In-laws
  'ew': '媳妇',
  'nh': '女婿',
  'gw': '嫂嫂',
  'dw': '弟妇',
  'jh': '姐夫',
  'kh': '妹夫',
  'hf': '公公',
  'hm': '婆婆',
  'wf': '岳父',
  'wm': '岳母',
  'hg': '大伯',
  'hd': '小叔',
  'hj': '大姑',
  'hk': '小姑',
  'wg': '大舅',
  'wj': '大姨',
  'wd': '小舅',
  'wk': '小姨',

  'fgw': '伯母',
  'fdw': '叔母',
  'fjh': '姑父',
  'mgw': '舅母',
  'mjh': '姨父',

  // Grandparents and above
  'ff': '爷爷',
  'fm': '奶奶',

  'ffg': '伯祖父',
  'ffd': '叔祖父',
  'ffj': '姑祖母',
  'fmg': '舅祖父',
  'fmj': '姨祖母',

  'mf': '外公',
  'mm': '外婆',

  'fff': '曾祖父',
  'ffm': '曾祖母',
  'fffg': '曾伯祖父',
  'fffd': '曾叔祖父',
  'fffj': '曾姑祖母',
  'ffmg': '曾舅祖父',
  'ffmj': '曾姨祖母',

  'ffff': '高祖父',
  'fffm': '高祖母',
  'ffffg': '高伯祖父',
  'ffffd': '高叔祖父',
  'ffffj': '高姑祖母',
  'fffmg': '高舅祖父',
  'fffmj': '高姨祖母',
}

// Prefixes for labels for higher degree or removed cousins
// (in Chinese, removed cousins are aunts and uncles)
function getCousinPrefix(intermediaries) {
  let label

  // All-male paternal line: the degree of the cousinship gives the prefix on its own,
  // without the 伯/叔 of the branch (堂伯父, 从堂弟 rather than 叔堂伯父, 叔堂弟)
  if (intermediaries.match(TANG_HIGHER_ORDER_COUSIN)) {
    const ups = intermediaries.match(/^f+/)[0].length
    const downs = intermediaries.length - ups - 1
    const degree = Math.min(ups, downs + 1)
    return degree === 1 ? '堂' : degree === 2 ? '从堂' : '族'
  }

  let suffix = '表'

  if (intermediaries.length === 2) return suffix

  let ups = intermediaries.match(HIGHER_ORDER_COUSIN)
  if (ups) {
    // For third cousins, repeat the cousin suffix
    // For higher order cousins, use a number (numeral if beyond tenth cousins)
    if (ups[0].length == 3) {
      suffix = suffix.repeat(2)
    } else if (ups[0].length < 11) {
      // Minus 1 for zero-indexing, 3 more because we start with fourth cousins (三表)
      let prefix = ['三', '四', '五', '六', '七', '八', '九', '十'][ups[0].length - 4]
      suffix = `${prefix}${suffix}`
    } else {
      suffix = `${ups[0].length - 1}${suffix}`
    }
  }

  if (intermediaries.match(BO_UNCLE)) {
    label = '伯'
  }
  if (intermediaries.match(SHU_UNCLE)) {
    label = '叔'
  }
  if (intermediaries.match(PATERNAL_AUNT)) {
    label = '姑'
  }
  if (intermediaries.match(MATERNAL_UNCLE)) {
    label = '舅'
  }
  if (intermediaries.match(MATERNAL_AUNT)) {
    label = '姨'
  }

  if (label) return `${label}${suffix}`

  return undefined
}

// Convert an ambiguous step to two concrete possibilities, where possible
// Allow up to two possible labels for a given person
function disambiguate(moveCode) {
  switch (moveCode) {
    case PARENT:
      return [FATHER, MOTHER]

    case CHILD:
      return [SON, DAUGHTER]

    case PARTNER:
      return [HUSBAND, WIFE]

    case OLDER_SIBLING:
      return [OLDER_BROTHER, OLDER_SISTER]

    case YOUNGER_SIBLING:
      return [YOUNGER_BROTHER, YOUNGER_SISTER]

    case BROTHER:
      return [OLDER_BROTHER, YOUNGER_BROTHER]

    case SISTER:
      return [OLDER_SISTER, YOUNGER_SISTER]

    default:
      return [undefined, undefined]
  }
}

// For some relatives, the term of address is the same as a sibling
// but with a prefix; this utility function returns the term of address
// based on relative age and the other person's sex
function getPseudoSibling(isOlder, isMale) {
  return isMale ?
    (isOlder ? OLDER_BROTHER : YOUNGER_BROTHER) :
    (isOlder ? OLDER_SISTER : YOUNGER_SISTER)
}

function promoteSiblings(pathCode) {
  return pathCode
    .replaceAll(YOUNGER_BROTHER, OLDER_BROTHER)
    .replaceAll(YOUNGER_SISTER, OLDER_SISTER)
}

// People connected through certain relatives sometimes don't have a dedicated
// term; for these paths, try searching for a label by "promoting" intermediate
// relatives to those for which a term exists
// Examples: your mother's sisters' children have the same label
// regardless of whether your aunt is older or younger than your mother;
// maternal ancestors and your daughters' descendents get a prefix but otherwise
// have the same term as paternal ones and your sons' descendents, respectively
// Direct ancestors through a mother, and descendants through a daughter, take the paternal
// term with the 外 prefix. The parent right before a sibling stays as it is: it decides
// between 伯/叔/姑 and 舅/姨 (mother's father's younger brother: 外叔祖父).
function getLineage(pathCode) {
  if (!pathCode.match(DIRECT_ANCESTOR_DESCENDENT)) return undefined

  let middle, end

  if (pathCode.match(ENDS_WITH_SPOUSE)) {
    middle = pathCode.slice(0, -2)
    end = pathCode.slice(-2)
  } else {
    middle = pathCode.slice(0, -1)
    end = pathCode.charAt(pathCode.length - 1)
  }
  if ('gdjk'.includes(end.charAt(0)) && middle.length > 0) {
    end = `${middle.slice(-1)}${end}`
    middle = middle.slice(0, -1)
  }

  while (middle.includes(MOTHER)) {
    middle = middle.replace(MOTHER, FATHER)
    let newPath = `${middle}${end}`
    if (newPath in links) {
      // The maternal 外 goes right after 曾/高: 外伯祖父, 曾外祖父, 外舅祖父
      const label = links[newPath]
      return label.includes('外') ? label : label.replace(/^([曾高]?)/, '$1外')
    }
  }

  while (middle.includes(DAUGHTER)) {
    middle = middle.replace(DAUGHTER, SON)
    let newPath = `${middle}${end}`
    if (newPath in links) {
      return `外${links[newPath]}`
    }
  }

  return undefined
}

function getPromoted(pathCode) {
  const lineage = getLineage(pathCode)
  if (lineage !== undefined) return lineage

  pathCode = promoteSiblings(pathCode)

  if (pathCode in links) {
    return links[pathCode]
  }

  const promotedLineage = getLineage(pathCode)
  if (promotedLineage !== undefined) return promotedLineage

  let end = pathCode.charAt(pathCode.length - 1)
  pathCode = pathCode.slice(0, -1)
    .replaceAll(DAUGHTER, SON)
  pathCode = `${pathCode}${end}`

  if (pathCode in links) {
    return links[pathCode]
  }

  return undefined
}

function getDisambiguated(pathCode, { isOlder, generationDistance, generationIndices }) {
  let singleUnknown = pathCode.match(SINGLE_UNKNOWN)
  if (singleUnknown) {
    let k1 = singleUnknown.groups.known1
    let k2 = singleUnknown.groups.known2

    let [a, b] = disambiguate(singleUnknown.groups.unknown)
    // If the ambiguous step cannot be disambiguated, give up
    if (a === undefined) {
      return undefined
    }

    let isAgeDisambiguation = singleUnknown.groups.unknown === BROTHER || singleUnknown.groups.unknown === SISTER

    a = getName(`${k1}${a}${k2}`, {
      isOlder: isAgeDisambiguation ? true : isOlder,
      generationDistance,
      generationIndices
    })
    b = getName(`${k1}${b}${k2}`, {
      isOlder: isAgeDisambiguation ? false : isOlder,
      generationDistance,
      generationIndices
    })

    return bothForms(a, b)
  }
}

export function getName(pathCode, { isOlder, generationDistance, generationIndices }) {
  // If there are two or more ambiguous steps in the path, don't
  // attempt to find any concrete label
  if (pathCode.match(MORE_THAN_TWO_UNKNOWNS)) {
    return undefined
  }

  // If there is a single ambiguous step, attempt to find a label for both
  // of the possibilities and return both
  let disambiguated = getDisambiguated(pathCode, { isOlder, generationDistance, generationIndices })
  if (disambiguated) return disambiguated

  if (pathCode in links) {
    return links[pathCode]
  } else {
    // For in-laws that aren't already in the lookup, use the same label that your spouse would use
    if (pathCode.match(STARTS_WITH_SPOUSE)) {
      return getName(pathCode.slice(1), { isOlder, generationDistance,
        generationIndices: Object.fromEntries(Object.entries(generationIndices).map(([g, v]) => [
          g, {
            start: v.start >= 0 ? v.start - 1 : v.start,
            end: v.end ? v.end - 1 : undefined
          },
        ]))
      })
    }

    // Try finding a label based on the "promoted" path
    let promoted = getPromoted(pathCode)
    if (promoted !== undefined) return promoted
  }

  // If no label can be found, fall back to a cousin-calculation.
  // Remove the chain from generations above the target person in order
  // and connect the blood relatives on the same level as pseudo-siblings,
  // then recompute using the new chain and add a prefix
  // Unknown relative age: both forms, like siblings (表哥/表弟)
  if (isOlder === undefined) {
    return bothForms(getCousin(pathCode, true, generationDistance, generationIndices),
      getCousin(pathCode, false, generationDistance, generationIndices))
  }
  return getCousin(pathCode, isOlder, generationDistance, generationIndices)
}

function getCousin(pathCode, isOlder, generationDistance, generationIndices) {
  let { start, end } = generationIndices[Math.max(generationDistance, 0)]
  if (pathCode.match(ENDS_WITH_SPOUSE)) {
    end--
  }
  let pseudoSibling = getPseudoSibling(isOlder, pathCode.charAt(end) === SON)
  let pseudoLink = `${pathCode.slice(0, start + 1)}${pseudoSibling}${pathCode.slice(end + 1)}`
  if (!(pseudoLink in links)) pseudoLink = promoteSiblings(pseudoLink)
  if (pseudoLink in links) {
    let intermediaries = pathCode.slice(0, end)
    let prefix = getCousinPrefix(intermediaries)
    if (prefix) {
      return `${prefix}${links[pseudoLink].replace(/([\p{Script=Han}])\1/u, "$1")}`
    }
  }

  return undefined
}

// Join two possible labels. The four forms of one cousin (表哥/表弟/表姐/表妹)
// become the neutral 表兄弟姐妹.
function bothForms(a, b) {
  const forms = [...new Set([a, b].filter((x) => x !== undefined).flatMap((x) => x.split('/')))]
  if (forms.length === 0) return undefined
  const stem = forms[0].slice(0, -1)
  const ends = forms.map((x) => x.slice(-1)).sort().join('')
  if (forms.length === 4 && forms.every((x) => x.slice(0, -1) === stem) && ends === [...'哥弟姐妹'].sort().join('')) {
    return `${stem}兄弟姐妹`
  }
  return forms.join('/')
}

// Convert a path to a string encoding each step as a character
// to facilitate lookup
export function encodePath(path) {
  let pathCode = ""

  let generationIndices = {0: {start: -1}}

  let myBirth = path.from.birthYear ?? path.from.birthDate
  let lastBirth = myBirth
  let lastFamilialBirth = {0: [myBirth]}

  let generationDistance = 0

  for (var i = 0; i < path.steps.length; i++) {
    const { move, person } = path.steps[i]

    let s = normalizeSex(person.sex)
    let personBirth = person.birthYear ?? person.birthDate
    let next

    if (move === 'up') {
      next = g(s, FATHER, MOTHER, PARENT)
      generationDistance++
    } else if (move === 'down') {
      next = g(s, SON, DAUGHTER, CHILD)
      generationDistance--
    } else if (move === 'sibling') {
      if (!Number.isFinite(lastBirth) || !Number.isFinite(personBirth)) {
        next = g(s, BROTHER, SISTER, SIBLING)
      } else {
        if (personBirth < lastBirth) {
          next = g(s, OLDER_BROTHER, OLDER_SISTER, OLDER_SIBLING)
        } else {
          next = g(s, YOUNGER_BROTHER, YOUNGER_SISTER, YOUNGER_SIBLING)
        }
      }
    }
    else if (move === 'spouse') next = g(s, HUSBAND, WIFE, PARTNER)

    pathCode += next
    if (generationDistance in generationIndices) {
      generationIndices[generationDistance].end = i
    } else {
      generationIndices[generationDistance] = {start: i}
    }

    lastBirth = personBirth
    if (move !== 'spouse') {
      if (generationDistance in lastFamilialBirth) {
        lastFamilialBirth[generationDistance].push(personBirth)
      } else {
        lastFamilialBirth[generationDistance] = [personBirth]
      }
    }
  }

  // The relevant age difference is that between the target person and
  // the first blood relative in the chain from the same generation
  let isOlder
  let births = lastFamilialBirth[generationDistance]
  let birthCount = births.length
  if (birthCount < 2) {
    // Only one person in the chain from this generation;
    // no relevant age difference to report
    isOlder = false
  } else if (!Number.isFinite(births[birthCount - 1]) || !Number.isFinite(births[0])) {
    // A birth year is missing: the label gives both forms
    isOlder = undefined
  } else {
    isOlder = births[birthCount - 1] < births[0]
  }

  return { pathCode, generationDistance, isOlder, generationIndices }
}

// Sibling terms for a half or step sibling: one when sex and relative age are known,
// two when one of them is unknown (哥哥/弟弟), none when both are (neutral 兄弟姐妹)
function siblingTerms(sex, isOlder) {
  const sexes = sex === 'male' ? [true] : sex === 'female' ? [false] : [true, false]
  const ages = isOlder === undefined ? [true, false] : [isOlder]
  if (sexes.length * ages.length > 2) return []
  return sexes.flatMap((isMale) => ages.map((older) => links[getPseudoSibling(older, isMale)]))
}

// Prefixed sibling labels, two forms at most: beyond that the sibling term turns neutral
function prefixedSiblings(prefixes, terms) {
  if (terms.length === 0 || prefixes.length * terms.length > 2) {
    return prefixes.map((p) => `${p}兄弟姐妹`).join('/')
  }
  return prefixes.flatMap((p) => terms.map((t) => `${p}${t}`)).join('/')
}

export default function nameZh(path) {
  let { pathCode, generationDistance, isOlder, generationIndices } = encodePath(path)
  const sex = normalizeSex(path.steps[path.steps.length - 1].person.sex)

  // Check for half- and stepsiblings first; the first step tells which parent is shared
  if (isHalfSibling(path)) {
    const parent = pathCode.charAt(0)
    const prefixes = parent === FATHER ? ['同父异母'] : parent === MOTHER ? ['同母异父'] : ['同父异母', '同母异父']
    return prefixedSiblings(prefixes, siblingTerms(sex, isOlder))
  }

  if (isStepSibling(path)) {
    return prefixedSiblings(['继'], siblingTerms(sex, isOlder))
  }

  let label = getName(pathCode, { isOlder, generationDistance, generationIndices })
  if (label === undefined) {
    // If no label can be found, fall back to "distant relative"
    return '远亲'
  }

  return label
}
