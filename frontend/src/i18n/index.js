// Langue de l'interface : français ou anglais.
//
// Le texte français sert de clé : t('Mot de passe incorrect.') renvoie la phrase telle quelle en
// français, et sa traduction du dictionnaire anglais (./en) en anglais. Une clé absente du
// dictionnaire retombe sur le français, jamais sur une chaîne vide.
//
// Variables entre accolades : t('{n} personnes', { n: 3 }).
//
// La langue est fixée au chargement de la page : choix mémorisé, sinon langue du navigateur.
// Changer de langue recharge la page, ce qui permet d'appeler t() partout, y compris hors React
// (dessin de l'arbre sur canvas, données de la démo, messages d'erreur).

import en from './en/index.js'

export const LOCALES = ['fr', 'en']
const STORAGE_KEY = 'pz-locale'

function detectLocale() {
  // ?lang=en dans l'adresse l'emporte (liens partagés vers la démo en anglais) et devient le choix mémorisé.
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (LOCALES.includes(fromUrl)) {
    try { window.localStorage.setItem(STORAGE_KEY, fromUrl) } catch { /* rien */ }
    return fromUrl
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (LOCALES.includes(stored)) return stored
  } catch { /* stockage indisponible : on suit le navigateur */ }
  const languages = typeof navigator === 'undefined' ? [] : (navigator.languages?.length ? navigator.languages : [navigator.language])
  return languages.some((lang) => String(lang).toLowerCase().startsWith('fr')) ? 'fr' : 'en'
}

export const locale = typeof window === 'undefined' ? 'fr' : detectLocale()

// Pour toLocaleDateString et consorts.
export const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'

if (typeof document !== 'undefined') document.documentElement.lang = locale

const missing = new Set()

export function t(fr, vars) {
  let text = fr
  if (locale === 'en') {
    if (Object.prototype.hasOwnProperty.call(en, fr)) text = en[fr]
    else if (import.meta.env?.DEV && !missing.has(fr)) {
      missing.add(fr)
      console.warn(`[i18n] traduction anglaise manquante : ${JSON.stringify(fr)}`)
    }
  }
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
}

export function setLocale(next) {
  if (!LOCALES.includes(next) || next === locale) return
  // Passe par l'adresse, pour que le choix tienne même sans stockage local.
  const url = new URL(window.location.href)
  url.searchParams.set('lang', next)
  window.location.assign(url.toString())
}
