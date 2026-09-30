// Pages du site vitrine liées depuis l'app, dans la langue de l'interface.
// Une instance auto-hébergée peut pointer vers ses propres pages : VITE_HELP_URL et
// VITE_PRIVACY_URL (au build) remplacent alors les liens vers parenthese.io, pour toutes les langues.
import { locale } from '../i18n/index.js'

const env = import.meta.env || {}

export const HELP_URL = env.VITE_HELP_URL
  || (locale === 'en' ? 'https://parenthese.io/en/help/' : 'https://parenthese.io/aide/')

export const PRIVACY_URL = env.VITE_PRIVACY_URL
  || (locale === 'en' ? 'https://parenthese.io/en/privacy/' : 'https://parenthese.io/donnees-et-vie-privee/')
