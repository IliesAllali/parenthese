import { isYearOnly } from './dateInput.js'

// Au-delà, une personne sans décès indiqué est sans doute morte sans que l'arbre le dise : pas de fête
export const MAX_BIRTHDAY_AGE = 110

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

// Anniversaire du jour, lu sur le calendrier de celui qui regarde (planche du 18/11/2026).
// Seule une date exacte compte : une année seule (rangée au 1er janvier) ou une date « vers », « avant »,
// « entre »… ne déclenche rien. Une personne décédée n'a pas de fête. Né un 29 février : fêté le 28 les
// années non bissextiles. Rend { age } le jour J, sinon null.
export function birthdayToday(person, now = new Date()) {
  if (!person || person.isAlive === false || person.isDeceased || person.deathDate) return null
  if (person.birthDatePrecision) return null
  const text = String(person.birthDate ?? '').slice(0, 10)
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match || isYearOnly(text)) return null

  const [, birthYear, birthMonth, birthDay] = match.map(Number)
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const onTheDay = (birthMonth === month && birthDay === day)
    || (birthMonth === 2 && birthDay === 29 && !isLeapYear(year) && month === 2 && day === 28)
  if (!onTheDay) return null

  const age = year - birthYear
  if (age <= 0 || age > MAX_BIRTHDAY_AGE) return null
  return { age }
}

// Clé du jour local (AAAA-MM-JJ), pour ne lancer les confettis qu'une fois par jour
export function localDayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
