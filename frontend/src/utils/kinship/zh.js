import { normalizeSex } from './index.js'
import { isHalfSibling, isStepSibling, kinshipFacts } from './facts.js'

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
  CHILD = 'C'

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
  'fmg': '外舅祖父',
  'fmj': '姨祖母',

  'mf': '外公',
  'mm': '外婆',

  'fff': '曾祖父',
  'ffm': '曾祖母',
  'fffg': '曾伯祖父',
  'fffd': '曾叔祖父',
  'fffj': '曾姑祖母',
  'ffmg': '外曾舅祖父',
  'ffmj': '曾姨祖母',

  'ffff': '高祖父',
  'fffm': '高祖母',
  'ffffg': '高伯祖父',
  'ffffd': '高叔祖父',
  'ffffj': '高姑祖母',
  'fffmg': '外高舅祖父',
  'fffmj': '高姨祖母',
}

// Prefixes for labels for higher degree or removed cousins
// (in Chinese, removed cousins are aunts and uncles)
function getCousinPrefix(intermediaries) {
  if (intermediaries.match(/^f[gd]$/)) {
    return '堂'
  }
  if (intermediaries.match(/^(f[jk]|m[gdjk])$/)) {
    return '表'
  }

  let label

  let suffix = '表'
  if (intermediaries.match(/^f+[gd]$/)) {
    suffix = '堂'
  }
  let ups = intermediaries.match(/^[fm]{3,}/)
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

  if (intermediaries.match(/fg/)) {
    label = '伯'
  }
  if (intermediaries.match(/fd/)) {
    label = '叔'
  }
  if (intermediaries.match(/f[jk]/)) {
    label = '姑'
  }
  if (intermediaries.match(/m[gd]/)) {
    label = '舅'
  }
  if (intermediaries.match(/m[jk]/)) {
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
function getPromoted(pathCode) {
  pathCode = promoteSiblings(pathCode)

  if (pathCode in links) {
    return links[pathCode]
  }

  if (pathCode.match(/^([fm]|[en])+.$/)) {
    let middle, end

    if (pathCode.match(/[hw]$/)) {
      middle = pathCode.substring(0, pathCode.length - 2)
      end = pathCode.substr(pathCode.length - 2)
    } else {
      middle = pathCode.substring(0, pathCode.length - 1)
      end = pathCode.charAt(pathCode.length - 1)
    }

    while (middle.includes(MOTHER)) {
      middle = middle.replace(MOTHER, FATHER)
      let newPath = `${middle}${end}`
      if (newPath in links) {
        return links[newPath].replace(/^([曾高]?[^祖]?)/, '$1外')
      }
    }

    while (middle.includes(DAUGHTER)) {
      middle = middle.replace(DAUGHTER, SON)
      let newPath = `${middle}${end}`
      if (newPath in links) {
        return `外${links[newPath]}`
      }
    }
  }

  let end = pathCode.charAt(pathCode.length - 1)
  pathCode = pathCode.substring(0, pathCode.length - 1)
    .replaceAll(DAUGHTER, SON)
  pathCode = `${pathCode}${end}`

  if (pathCode in links) {
    return links[pathCode]
  }

  return undefined
}

export function getName(pathCode, isOlder, generationDistance, generationIndices) {
  // If there are two or more ambiguous steps in the path, don't
  // attempt to find any concrete label
  if (pathCode.match(/(.*[A-Z].*){2,}/)) {
    return undefined
  }

  // If there is a single ambiguous step, attempt to find a label for both
  // of the possibilities and return both
  let singleUnknown = pathCode.match(/^(?<known1>[a-z]*)(?<unknown>[A-Z])(?<known2>[a-z]*)$/)
  if (singleUnknown) {
    let k1 = singleUnknown.groups.known1
    let k2 = singleUnknown.groups.known2

    let [a, b] = disambiguate(singleUnknown.groups.unknown)
    // If the ambiguous step cannot be disambiguated, give up
    if (a === undefined) {
      return undefined
    }

    let isAgeDisambiguation = singleUnknown in [BROTHER, SISTER]

    a = getName(`${k1}${a}${k2}`, isAgeDisambiguation ? true : isOlder, generationDistance, generationIndices)
    b = getName(`${k1}${b}${k2}`, isAgeDisambiguation ? false : isOlder, generationDistance, generationIndices)

    if (a === b) return a

    return [a, b].filter((x) => x !== undefined).join('/')
  }

  if (pathCode in links) {
    return links[pathCode]
  } else {
    // For in-laws that aren't already in the lookup, use the same label that your spouse would use
    if (pathCode.match(/^[hw]/)) {
      Object.keys(generationIndices).forEach(g => {
        generationIndices[g].start++
        generationIndices[g].end++
      });
      return getName(pathCode.substr(1), isOlder, generationDistance, generationIndices)
    }

    // Try finding a label based on the "promoted" path
    let promoted = getPromoted(pathCode)
    if (promoted !== undefined) return promoted
  }

  // If no label can be found, fall back to a cousin-calculation.
  // Remove the chain from generations above the target person in order
  // and connect the blood relatives on the same level as pseudo-siblings,
  // then recompute using the new chain and add a prefix
  let { start, end } = generationIndices[Math.max(generationDistance, 0)]
  if (pathCode.match(/[hw]$/)) {
    end--
  }
  let pseudoSibling = getPseudoSibling(isOlder, pathCode.charAt(end) === SON)
  let pseudoLink = `${pathCode.substr(0, start + 1)}${pseudoSibling}${pathCode.substr(end + 1)}`
  if (!(pseudoLink in links)) pseudoLink = promoteSiblings(pseudoLink)
  if (pseudoLink in links) {
    let intermediaries = pathCode.substr(0, end)
    let prefix = getCousinPrefix(intermediaries)
    if (prefix) {
      return `${prefix}${links[pseudoLink].replace(/([\p{Script=Han}])\1/u, "$1")}`
    }
  }

  return undefined
}

// Convert a path to a string encoding each step as a character
// to facilitate lookup
export function encodePath(path) {
  let pathCode = ""

  let generationIndices = {0: {"start": -1}}

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
      generationIndices[generationDistance] = {"start": i}
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
  } else {
    isOlder = births[birthCount - 1] < births[0]
  }
  let relevantBirth = lastFamilialBirth[generationDistance]

  return { pathCode, generationDistance, isOlder, generationIndices }
}

export default function nameZh(path) {
  let { pathCode, generationDistance, isOlder, generationIndices } = encodePath(path)
  const { ups, downs, hasSpouse, sex } = kinshipFacts(path)

  // Check for half- and stepsiblings first
  if (isHalfSibling(path)) {
    let prefix
    if (pathCode.match(/^f/)) {
      prefix = '同父异母'
    } else {
      prefix = '同母异父'
    }
    let label = getPseudoSibling(isOlder, sex === 'male')
    return `${prefix}${links[label]}`
  }

  if (isStepSibling(path)) {
    let label = getPseudoSibling(isOlder, sex === 'male')
    return `继${links[label]}`
  }

  let label = getName(pathCode, isOlder, generationDistance, generationIndices)
  if (label === undefined) {
    // If no label can be found, fall back to "distant relative"
    return '远亲'
  }

  return label
}
