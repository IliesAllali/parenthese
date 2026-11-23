import { describe, expect, it } from 'vitest'
import { calculateScore, getMatchReason, isSearchable, MIN_SCORE_THRESHOLD } from './usePersonSearch.js'

const robert = { firstName: 'Robert', lastName: 'Dupont', nickname: 'Loulou' }
const andre = { firstName: 'André', lastName: 'Dupont', nickname: null }

describe('recherche par surnom', () => {
  it('trouve une personne par son surnom, même sans nom', () => {
    expect(calculateScore('loulou', robert)).toBeGreaterThanOrEqual(MIN_SCORE_THRESHOLD)
    expect(getMatchReason('lou', robert)).toBe('Surnom')
  })

  it("ne trouve pas une personne sans surnom par un mot qui n'est pas dans son nom", () => {
    expect(calculateScore('loulou', andre)).toBeLessThan(MIN_SCORE_THRESHOLD)
  })

  it('garde le classement par nom quand le surnom ne matche pas', () => {
    expect(getMatchReason('dupont', robert)).toBe('Nom')
  })
})

describe('recherche « à vérifier »', () => {
  const doute = { firstName: 'Jeanne', lastName: 'Martin', toVerify: true }
  const sure = { firstName: 'Paul', lastName: 'Martin', toVerify: false }

  it('trouve les personnes marquées, avec ou sans accents, même en partie', () => {
    for (const q of ['à vérifier', 'a verifier', 'À VÉRIF', 'a ver']) {
      expect(calculateScore(q.toLowerCase(), doute)).toBeGreaterThanOrEqual(MIN_SCORE_THRESHOLD)
    }
    expect(getMatchReason('a verifier', doute)).toBe('À vérifier')
  })

  it('ne remonte pas les personnes non marquées', () => {
    expect(calculateScore('a verifier', sure)).toBeLessThan(MIN_SCORE_THRESHOLD)
  })
})

describe('recherche tolérante (cas limites du 20/11)', () => {
  const marie = { firstName: 'Marie-Thérèse', lastName: 'Martin', birthName: 'Dupont', birthPlace: 'Brive-la-Gaillarde', birthYear: 1931 }
  const helene = { firstName: 'Hélène', lastName: 'Lefèvre', birthPlace: 'Guéret' }
  const jeanne = { firstName: 'Jeanne', lastName: 'd’Arc' }
  const found = (q, p) => calculateScore(q, p) >= MIN_SCORE_THRESHOLD

  it('ignore les accents, dans la requête comme dans le nom', () => {
    expect(found('andre', andre)).toBe(true)
    expect(found('helene lefevre', helene)).toBe(true)
    expect(found('LEFÈVRE', helene)).toBe(true)
    expect(found('gueret', helene)).toBe(true)
  })

  it('lit les traits d’union et les apostrophes comme des espaces', () => {
    expect(found('marie therese', marie)).toBe(true)
    expect(found("jeanne d'arc", jeanne)).toBe(true)
  })

  it('trouve par le nom de naissance, et le dit', () => {
    expect(found('dupont', marie)).toBe(true)
    expect(found('marie therese dupont', marie)).toBe(true)
    expect(getMatchReason('dupont', marie)).toBe('Nom de naissance')
  })

  it('trouve « Nom Prénom » et les mots dans le désordre', () => {
    expect(found('dupont andré', andre)).toBe(true)
    expect(found('martin marie', marie)).toBe(true)
    expect(getMatchReason('dupont andre', andre)).toBe('Nom')
  })

  it('trouve un lieu par un de ses mots', () => {
    expect(found('brive', marie)).toBe(true)
    expect(found('gaillarde', marie)).toBe(true)
    expect(getMatchReason('brive', marie)).toBe('Lieu')
  })

  it('ne remonte pas pour autant n’importe qui', () => {
    expect(found('dupont', helene)).toBe(false)
    expect(found('martin paul', marie)).toBe(false)
    expect(found('rive', marie)).toBe(false)
  })
})

describe('recherche de noms chinois (#258)', () => {
  const fang = { id: 1, firstName: '仕龙', lastName: '房' }
  const chen = { id: 2, firstName: '月榮', lastName: '陈', nickname: '莉莉' }
  const found = (q, p) => calculateScore(q, p) >= MIN_SCORE_THRESHOLD

  it('cherche dès un caractère chinois, japonais ou coréen, deux sinon', () => {
    expect(isSearchable('房')).toBe(true)
    expect(isSearchable('김')).toBe(true)
    expect(isSearchable('か')).toBe(true)
    expect(isSearchable('a')).toBe(false)
    expect(isSearchable(' ')).toBe(false)
  })

  it('trouve par le nom de famille seul, par le prénom, et par le nom entier écrit d’un tenant', () => {
    expect(found('房', fang)).toBe(true)
    expect(found('仕龙', fang)).toBe(true)
    expect(found('房仕龙', fang)).toBe(true)
    expect(found('房 仕龙', fang)).toBe(true)
    expect(getMatchReason('房仕龙', fang)).toBe('Nom')
    expect(found('房', chen)).toBe(false)
  })

  it('trouve par le surnom', () => {
    expect(found('莉莉', chen)).toBe(true)
  })
})
