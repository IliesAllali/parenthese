import { familyNameFirst, firstNameLabel, isFirstNameUnknown, surnameLabel } from '../utils/personName.js'

// Le nom d'une personne en titre ou en liste : le prénom, puis le nom de famille en italique. Un nom d'Asie de
// l'Est commence par le nom de famille, collé au prénom (« 陳港生 », #258).
// lastClassName : le nom de famille dans un <span> de cette classe plutôt qu'en <em>
// unknownClassName : le libellé « Prénom inconnu » dans un <span> de cette classe
export default function PersonName({ person, lastClassName = null, unknownClassName = null }) {
  const unknown = isFirstNameUnknown(person)
  const firstText = firstNameLabel(person)
  const first = unknown && unknownClassName ? <span className={unknownClassName}>{firstText}</span> : firstText
  const lastText = surnameLabel(person?.lastName)
  if (!lastText) return <>{first}</>
  const last = lastClassName ? <span className={lastClassName}>{lastText}</span> : <em>{lastText}</em>
  if (familyNameFirst(person) && !unknown) return <>{last}{first}</>
  return <>{first}{' '}{last}</>
}
