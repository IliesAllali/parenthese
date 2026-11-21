// Formulaire court d'un proche (#245) : le lien est connu, on n'en demande que le nécessaire.
// kin = { type: 'parent' | 'sibling' | 'spouse' | 'child', person: { id, firstName, lastName, sex }, sex, coParentId }
//   person : la personne dont on ajoute le proche ; sex : imposé par le lien (case « Père », second parent), sinon null
import { t } from '../i18n/index.js'
import { firstNameLabel } from './personName.js'

// « de Lucie », « d’Hélène » : le français élide devant une voyelle ou un h (muet dans presque tous les prénoms)
export function ofName(person) {
  const name = (person && firstNameLabel(person)) || ''
  return /^[aeiouyhàâäéèêëîïôöûüœæ]/i.test(name) ? t('d’{name}', { name }) : t('de {name}', { name })
}

const TITLES = {
  parent: {
    male: (o) => t('Ajouter <em>le père {ofName}</em>', { ofName: o }),
    female: (o) => t('Ajouter <em>la mère {ofName}</em>', { ofName: o }),
    none: (o) => t('Ajouter <em>un parent {ofName}</em>', { ofName: o }),
  },
  sibling: {
    male: (o) => t('Ajouter <em>un frère {ofName}</em>', { ofName: o }),
    female: (o) => t('Ajouter <em>une sœur {ofName}</em>', { ofName: o }),
    none: (o) => t('Ajouter <em>un frère ou une sœur {ofName}</em>', { ofName: o }),
  },
  spouse: { none: (o) => t('Ajouter <em>un conjoint {ofName}</em>', { ofName: o }) },
  child: {
    male: (o) => t('Ajouter <em>un fils {ofName}</em>', { ofName: o }),
    female: (o) => t('Ajouter <em>une fille {ofName}</em>', { ofName: o }),
    none: (o) => t('Ajouter <em>un enfant {ofName}</em>', { ofName: o }),
  },
}

export function kinTitle(kin, sex = null) {
  const forms = TITLES[kin?.type] || TITLES.child
  const form = (sex === 'male' || sex === 'female') && forms[sex] ? forms[sex] : forms.none
  return form(ofName(kin?.person))
}

// Le choix du sexe, seulement quand le lien ne le dit pas : obligatoire pour un parent, facultatif sinon
export function kinSexChoices(kin) {
  if (!kin) return null
  if (kin.type === 'parent') {
    if (kin.sex) return null
    return { required: true, options: [{ value: 'male', label: t('Son père') }, { value: 'female', label: t('Sa mère') }] }
  }
  if (kin.type === 'sibling') return { required: false, options: [{ value: 'male', label: t('Un frère') }, { value: 'female', label: t('Une sœur') }] }
  if (kin.type === 'child') return { required: false, options: [{ value: 'male', label: t('Un fils') }, { value: 'female', label: t('Une fille') }] }
  return null
}

// Le nom proposé : celui de l'enfant pour un père, celui de la personne pour ses frères, sœurs et enfants.
// Jamais pour une mère (on ne connaît pas son nom de naissance), ni pour un conjoint.
export function kinNamePrefill(kin, sex = null) {
  const lastName = kin?.person?.lastName || ''
  if (kin?.type === 'parent') return sex === 'male' ? lastName : ''
  if (kin?.type === 'sibling' || kin?.type === 'child') return lastName
  return ''
}

/**
 * Les liens qu'on peut encore ajouter à une personne : un lien déjà rempli disparaît (les deux parents connus),
 * un frère ou une sœur demande un parent connu (il en reçoit les parents).
 * @param {Array} parents - les parents de la personne
 */
export function kinAvailability(parents = []) {
  return { parent: parents.length < 2, sibling: parents.length > 0, spouse: true, child: true }
}

// Le sexe du parent qui reste à ajouter quand l'autre est connu
export function remainingParentSex(parents = []) {
  if (parents.length !== 1) return null
  if (parents[0]?.sex === 'male') return 'female'
  if (parents[0]?.sex === 'female') return 'male'
  return null
}
