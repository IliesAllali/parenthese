import { describe, expect, it } from 'vitest'
import { kinAvailability, kinNamePrefill, kinSexChoices, kinTitle, remainingParentSex } from './kinForm'

const lucie = { id: 'l', firstName: 'Lucie', lastName: 'Martin', sex: 'female' }
const helene = { id: 'h', firstName: 'Hélène', lastName: 'Durand', sex: 'female' }

describe('formulaire court d’un proche', () => {
  it('titre accordé au lien, élision devant une voyelle', () => {
    expect(kinTitle({ type: 'parent', person: lucie }, 'female')).toBe('Ajouter <em>la mère de Lucie</em>')
    expect(kinTitle({ type: 'parent', person: helene }, 'male')).toBe('Ajouter <em>le père d’Hélène</em>')
    expect(kinTitle({ type: 'parent', person: lucie })).toBe('Ajouter <em>un parent de Lucie</em>')
    expect(kinTitle({ type: 'sibling', person: lucie })).toBe('Ajouter <em>un frère ou une sœur de Lucie</em>')
    expect(kinTitle({ type: 'child', person: lucie }, 'female')).toBe('Ajouter <em>une fille de Lucie</em>')
    expect(kinTitle({ type: 'spouse', person: lucie }, 'male')).toBe('Ajouter <em>un conjoint de Lucie</em>')
  })

  it('demande le sexe seulement quand le lien ne le dit pas', () => {
    expect(kinSexChoices({ type: 'parent', person: lucie, sex: 'female' })).toBeNull()
    expect(kinSexChoices({ type: 'parent', person: lucie }).required).toBe(true)
    expect(kinSexChoices({ type: 'sibling', person: lucie }).required).toBe(false)
    expect(kinSexChoices({ type: 'child', person: lucie }).options.map((o) => o.label)).toEqual(['Un fils', 'Une fille'])
    expect(kinSexChoices({ type: 'spouse', person: lucie })).toBeNull()
  })

  it('préremplit le nom : l’enfant pour un père, la personne pour ses frères, sœurs et enfants, jamais une mère', () => {
    expect(kinNamePrefill({ type: 'parent', person: lucie }, 'male')).toBe('Martin')
    expect(kinNamePrefill({ type: 'parent', person: lucie }, 'female')).toBe('')
    expect(kinNamePrefill({ type: 'parent', person: lucie }, null)).toBe('')
    expect(kinNamePrefill({ type: 'sibling', person: lucie })).toBe('Martin')
    expect(kinNamePrefill({ type: 'child', person: lucie })).toBe('Martin')
    expect(kinNamePrefill({ type: 'spouse', person: lucie })).toBe('')
  })

  it('un lien rempli disparaît, un frère demande un parent connu', () => {
    expect(kinAvailability([])).toEqual({ parent: true, sibling: false, spouse: true, child: true })
    expect(kinAvailability([{ sex: 'male' }, { sex: 'female' }]).parent).toBe(false)
    expect(remainingParentSex([{ sex: 'male' }])).toBe('female')
    expect(remainingParentSex([{ sex: null }])).toBeNull()
  })
})
