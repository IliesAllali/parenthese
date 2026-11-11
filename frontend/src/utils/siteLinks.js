// Pages du site vitrine liées depuis l'app, dans la langue de l'interface. Le site n'existe qu'en
// français et en anglais : une autre langue mène aux pages anglaises.
// Une instance auto-hébergée peut pointer vers ses propres pages : VITE_HELP_URL et
// VITE_PRIVACY_URL (au build) remplacent alors les liens vers parenthese.io, pour toutes les langues.
import { locale } from '../i18n/index.js'

const env = import.meta.env || {}

const HELP_PAGES = { fr: 'https://parenthese.io/aide/', en: 'https://parenthese.io/en/help/' }
const PRIVACY_PAGES = { fr: 'https://parenthese.io/donnees-et-vie-privee/', en: 'https://parenthese.io/en/privacy/' }

export const HELP_URL = env.VITE_HELP_URL || HELP_PAGES[locale] || HELP_PAGES.en

export const PRIVACY_URL = env.VITE_PRIVACY_URL || PRIVACY_PAGES[locale] || PRIVACY_PAGES.en
